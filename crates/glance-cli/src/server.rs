use anyhow::{Context, Result, bail};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Multipart, Path, Request, State},
    http::{HeaderValue, Method, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use glance_core::{
    Engine,
    infer::{ContentType, MAX_UPLOAD, decode},
    metrics::Aoi,
};
use serde_json::{Value, json};
use std::{
    fs,
    io::{Read, Write},
    net::{Ipv4Addr, SocketAddr, SocketAddrV4},
    sync::{Arc, Mutex},
};
use tower_http::cors::{AllowOrigin, CorsLayer};

pub const BIND: SocketAddr = SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::LOCALHOST, 7878));

#[derive(Clone)]
pub struct AppState {
    engine: Arc<Mutex<Engine>>,
    token: Arc<String>,
}

pub struct ApiError(StatusCode, String);
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let code = match self.0 {
            StatusCode::UNAUTHORIZED => "UNAUTHORIZED",
            StatusCode::PAYLOAD_TOO_LARGE => "PAYLOAD_TOO_LARGE",
            _ => "INVALID_REQUEST",
        };
        (
            self.0,
            Json(json!({"error":{"code":code,"message":self.1}})),
        )
            .into_response()
    }
}
impl From<anyhow::Error> for ApiError {
    fn from(e: anyhow::Error) -> Self {
        Self(StatusCode::BAD_REQUEST, e.to_string())
    }
}

pub fn token() -> Result<String> {
    let dirs = directories::BaseDirs::new().context("cannot locate config directory")?;
    token_at(&dirs.config_dir().join("glance/token"))
}

fn token_at(path: &std::path::Path) -> Result<String> {
    fs::create_dir_all(path.parent().context("token parent directory missing")?)?;
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    match options.open(path) {
        Ok(mut file) => {
            let mut bytes = [0; 32];
            getrandom::fill(&mut bytes).context("generate bearer token")?;
            let token = URL_SAFE_NO_PAD.encode(bytes);
            file.write_all(token.as_bytes())?;
            file.sync_all()?;
            Ok(token)
        }
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
            let mut token = String::new();
            fs::File::open(path)?.take(128).read_to_string(&mut token)?;
            let token = token.trim();
            if URL_SAFE_NO_PAD.decode(token)?.len() != 32 {
                bail!("invalid bearer token file: {}", path.display());
            }
            Ok(token.into())
        }
        Err(e) => Err(e.into()),
    }
}

fn allowed_origin(origin: &HeaderValue) -> bool {
    let Ok(origin) = origin.to_str() else {
        return false;
    };
    matches!(
        origin,
        "null" | "tauri://localhost" | "http://tauri.localhost" | "https://tauri.localhost"
    ) || origin
        .strip_prefix("chrome-extension://")
        .is_some_and(|id| {
            !id.is_empty() && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
        })
}

async fn auth(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let supplied = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|s| s.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));
    let valid = supplied.is_some_and(|token| {
        let expected = state.token.as_bytes();
        token.len() == expected.len()
            && token
                .bytes()
                .zip(expected)
                .fold(0u8, |diff, (a, b)| diff | (a ^ b))
                == 0
    });
    if !valid {
        return ApiError(StatusCode::UNAUTHORIZED, "bearer token required".into()).into_response();
    }
    next.run(request).await
}

pub fn router(engine: Engine, token: String) -> Router {
    shared_router(Arc::new(Mutex::new(engine)), token)
}

pub fn shared_router(engine: Arc<Mutex<Engine>>, token: String) -> Router {
    let state = AppState {
        engine,
        token: Arc::new(token),
    };
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|origin, _| allowed_origin(origin)))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);
    Router::new()
        .route("/v1/models", get(models))
        .route("/v1/system", get(system))
        .route("/v1/config", get(get_config).post(set_config))
        .route("/v1/models/{id}/install", post(install))
        .route("/v1/analyze", post(analyze))
        .route("/v1/compare", post(compare))
        .route("/v1/video", post(video))
        .layer(DefaultBodyLimit::max(MAX_UPLOAD))
        .layer(middleware::from_fn_with_state(state.clone(), auth))
        .layer(cors)
        .with_state(state)
}

async fn run<T: serde::Serialize + Send + 'static>(
    state: AppState,
    f: impl FnOnce(&mut Engine) -> Result<T> + Send + 'static,
) -> Result<Json<T>, ApiError> {
    let value = tokio::task::spawn_blocking(move || {
        let mut engine = state
            .engine
            .lock()
            .map_err(|_| anyhow::anyhow!("engine unavailable"))?;
        f(&mut engine)
    })
    .await
    .map_err(|_| {
        ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "analysis worker failed".into(),
        )
    })??;
    Ok(Json(value))
}

async fn models(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    run(state, |engine| {
        Ok(serde_json::to_value(engine.registry.list())?)
    })
    .await
}
async fn system(
    State(state): State<AppState>,
) -> Result<Json<glance_core::system::SystemInfo>, ApiError> {
    run(state, |engine| Ok(engine.system.clone())).await
}
async fn get_config(
    State(state): State<AppState>,
) -> Result<Json<glance_core::system::Config>, ApiError> {
    run(state, |engine| Ok(engine.config())).await
}
async fn set_config(
    State(state): State<AppState>,
    Json(config): Json<glance_core::system::Config>,
) -> Result<Json<glance_core::system::Config>, ApiError> {
    run(state, |engine| {
        engine.set_config(config)?;
        Ok(engine.config())
    })
    .await
}
async fn install(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    run(state, move |engine| {
        engine.registry.install(&id)?;
        Ok(json!({"ok":true}))
    })
    .await
}

#[derive(Default)]
struct Upload {
    model: Option<String>,
    content_type: Option<ContentType>,
    aois: Vec<Aoi>,
    images: Vec<(String, Vec<u8>)>,
}

async fn upload(mut multipart: Multipart) -> Result<Upload, ApiError> {
    let mut data = Upload::default();
    let mut saw_aois = false;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| ApiError(e.status(), e.body_text()))?
    {
        let name = field.name().unwrap_or_default().to_owned();
        match name.as_str() {
            "content_type" => {
                if data.content_type.is_some() {
                    return Err(ApiError(
                        StatusCode::BAD_REQUEST,
                        "duplicate content_type field".into(),
                    ));
                }
                let value = field
                    .text()
                    .await
                    .map_err(|e| ApiError(e.status(), e.body_text()))?;
                data.content_type = Some(value.parse().map_err(|e: glance_core::Error| {
                    ApiError(StatusCode::BAD_REQUEST, e.to_string())
                })?);
            }
            "model" => {
                if data.model.is_some() {
                    return Err(ApiError(
                        StatusCode::BAD_REQUEST,
                        "duplicate model field".into(),
                    ));
                }
                let value = field
                    .text()
                    .await
                    .map_err(|e| ApiError(e.status(), e.body_text()))?;
                if value.len() > 100 {
                    return Err(ApiError(
                        StatusCode::BAD_REQUEST,
                        "model id too long".into(),
                    ));
                }
                data.model = Some(value);
            }
            "aois" => {
                if saw_aois {
                    return Err(ApiError(
                        StatusCode::BAD_REQUEST,
                        "duplicate aois field".into(),
                    ));
                }
                saw_aois = true;
                let value = field
                    .text()
                    .await
                    .map_err(|e| ApiError(e.status(), e.body_text()))?;
                data.aois = serde_json::from_str(&value)
                    .map_err(|e| ApiError(StatusCode::BAD_REQUEST, e.to_string()))?;
                glance_core::infer::validate_aois(&data.aois)
                    .map_err(|e| ApiError(StatusCode::BAD_REQUEST, e.to_string()))?;
            }
            "image" | "a" | "b" | "frames" | "frames[]" => {
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| ApiError(e.status(), e.body_text()))?;
                data.images.push((name, bytes.to_vec()));
            }
            "video" => {
                return Err(ApiError(
                    StatusCode::BAD_REQUEST,
                    "send image frames sampled at 5 fps using frames[]".into(),
                ));
            }
            _ => {
                return Err(ApiError(
                    StatusCode::BAD_REQUEST,
                    format!("unknown multipart field '{name}'"),
                ));
            }
        }
    }
    Ok(data)
}

async fn analyze(
    State(state): State<AppState>,
    multipart: Multipart,
) -> Result<Json<glance_core::AnalyzeResponse>, ApiError> {
    let data = upload(multipart).await?;
    if data.images.len() != 1 || data.images[0].0 != "image" {
        return Err(ApiError(
            StatusCode::BAD_REQUEST,
            "exactly one image field required".into(),
        ));
    }
    run(state, move |engine| {
        Ok(engine.analyze_bytes_with_content_type(
            &data.images[0].1,
            data.model.as_deref(),
            &data.aois,
            data.content_type.unwrap_or_default(),
        )?)
    })
    .await
}
async fn compare(
    State(state): State<AppState>,
    multipart: Multipart,
) -> Result<Json<glance_core::infer::CompareResponse>, ApiError> {
    let data = upload(multipart).await?;
    run(state, move |engine| {
        if data.images.len() != 2 {
            bail!("exactly one a and one b image required");
        }
        let a = &data
            .images
            .iter()
            .find(|(n, _)| n == "a")
            .context("missing a image")?
            .1;
        let b = &data
            .images
            .iter()
            .find(|(n, _)| n == "b")
            .context("missing b image")?
            .1;
        Ok(engine.compare_with_content_type(
            &decode(a)?,
            &decode(b)?,
            data.model.as_deref(),
            &data.aois,
            data.content_type.unwrap_or_default(),
        )?)
    })
    .await
}
async fn video(
    State(state): State<AppState>,
    multipart: Multipart,
) -> Result<Json<glance_core::video::VideoResponse>, ApiError> {
    let data = upload(multipart).await?;
    run(state, move |engine| {
        if data
            .images
            .iter()
            .any(|(n, _)| n != "frames[]" && n != "frames")
        {
            bail!("video accepts only frames[] image fields");
        }
        Ok(engine.video_images(
            data.images.iter().map(|(_, b)| decode(b)),
            data.model.as_deref(),
            &data.aois,
        )?)
    })
    .await
}

pub async fn serve(mut engine: Engine) -> Result<()> {
    eprintln!("Warming default model");
    let engine = tokio::task::spawn_blocking(move || -> Result<Engine> {
        engine.warmup()?;
        Ok(engine)
    })
    .await??;
    let token = token()?;
    let listener = tokio::net::TcpListener::bind(BIND).await?;
    eprintln!("Listening: http://{BIND} | bearer token: <config_dir>/glance/token");
    axum::serve(listener, router(engine, token))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use tower::ServiceExt;

    fn engine() -> Engine {
        let dir = std::env::temp_dir().join(format!("glance-api-{}", std::process::id()));
        Engine::new(glance_core::registry::Registry::from_models(vec![], dir).unwrap()).unwrap()
    }

    #[tokio::test]
    async fn missing_and_wrong_tokens_rejected() {
        for supplied in [None, Some("Bearer wrong"), Some("Bearer secret")] {
            let mut req = axum::http::Request::builder().uri("/v1/models");
            if let Some(value) = supplied {
                req = req.header(header::AUTHORIZATION, value);
            }
            let result = router(engine(), "secret".into())
                .oneshot(req.body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(
                result.status(),
                if supplied == Some("Bearer secret") {
                    StatusCode::OK
                } else {
                    StatusCode::UNAUTHORIZED
                }
            );
        }
    }

    fn multipart(fields: &[(&str, &[u8])]) -> Body {
        let mut bytes = Vec::new();
        for (name, data) in fields {
            bytes.extend_from_slice(
                format!("--glance-test\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n")
                    .as_bytes(),
            );
            bytes.extend_from_slice(data);
            bytes.extend_from_slice(b"\r\n");
        }
        bytes.extend_from_slice(b"--glance-test--\r\n");
        Body::from(bytes)
    }

    #[tokio::test]
    async fn authenticated_multipart_analyze_compare_and_video() {
        let dir = std::env::temp_dir().join(format!("glance-api-fixture-{}", std::process::id()));
        let mut registry = glance_core::registry::Registry::from_models(vec![], dir).unwrap();
        let model = serde_json::from_str(include_str!(
            "../../glance-core/tests/fixtures/fixture.json"
        ))
        .unwrap();
        registry
            .import(
                std::path::Path::new(concat!(
                    env!("CARGO_MANIFEST_DIR"),
                    "/../glance-core/tests/fixtures/fixture.onnx"
                )),
                model,
            )
            .unwrap();
        let app = router(Engine::new(registry).unwrap(), "secret".into());
        let png = include_bytes!("../../glance-core/tests/fixtures/input.png").as_slice();
        let aois = br#"[{"id":"all","x":0,"y":0,"width":100,"height":100}]"#.as_slice();
        let response = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .uri("/v1/system")
                    .header(header::AUTHORIZATION, "Bearer secret")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), MAX_UPLOAD)
            .await
            .unwrap();
        let system: Value = serde_json::from_slice(&bytes).unwrap();
        assert!(system["threads"].as_u64().unwrap() >= 1);
        assert_eq!(
            system["recommended_model"],
            if system["provider"] != "cuda" {
                "unisal"
            } else {
                "sum"
            }
        );
        for (path, fields) in [
            (
                "/v1/analyze",
                vec![
                    ("image", png),
                    ("content_type", b"ui".as_slice()),
                    ("model", b"fixture".as_slice()),
                    ("aois", aois),
                ],
            ),
            (
                "/v1/compare",
                vec![
                    ("a", png),
                    ("b", png),
                    ("content_type", b"ecommerce".as_slice()),
                    ("model", b"fixture".as_slice()),
                    ("aois", aois),
                ],
            ),
            (
                "/v1/video",
                vec![
                    ("frames[]", png),
                    ("frames[]", png),
                    ("model", b"fixture".as_slice()),
                    ("aois", aois),
                ],
            ),
        ] {
            let request = axum::http::Request::builder()
                .method(Method::POST)
                .uri(path)
                .header(header::AUTHORIZATION, "Bearer secret")
                .header(
                    header::CONTENT_TYPE,
                    "multipart/form-data; boundary=glance-test",
                )
                .body(multipart(&fields))
                .unwrap();
            let response = app.clone().oneshot(request).await.unwrap();
            assert_eq!(response.status(), StatusCode::OK);
            let bytes = axum::body::to_bytes(response.into_body(), MAX_UPLOAD)
                .await
                .unwrap();
            let value: Value = serde_json::from_slice(&bytes).unwrap();
            match path {
                "/v1/analyze" => {
                    assert_eq!(value["width"], 3);
                    assert_eq!(value["height"], 2);
                    assert_eq!(value["metrics"]["aoi_share"][0]["share"], 100.0);
                }
                "/v1/compare" => {
                    assert_eq!(value["cc"], 1.0);
                    assert_eq!(value["delta"]["clarity"], 0.0);
                }
                _ => {
                    assert_eq!(value["fps"], 5);
                    assert_eq!(value["frames"].as_array().unwrap().len(), 2);
                }
            }
        }
        for fields in [
            vec![("image", png), ("content_type", b"invalid".as_slice())],
            vec![
                ("image", png),
                ("content_type", b"ui".as_slice()),
                ("content_type", b"natural".as_slice()),
            ],
        ] {
            let request = axum::http::Request::builder()
                .method(Method::POST)
                .uri("/v1/analyze")
                .header(header::AUTHORIZATION, "Bearer secret")
                .header(
                    header::CONTENT_TYPE,
                    "multipart/form-data; boundary=glance-test",
                )
                .body(multipart(&fields))
                .unwrap();
            assert_eq!(
                app.clone().oneshot(request).await.unwrap().status(),
                StatusCode::BAD_REQUEST
            );
        }
    }

    #[tokio::test]
    async fn uploads_over_25_mb_are_rejected() {
        let request = axum::http::Request::builder()
            .method(Method::POST)
            .uri("/v1/analyze")
            .header(header::AUTHORIZATION, "Bearer secret")
            .header(
                header::CONTENT_TYPE,
                "multipart/form-data; boundary=glance-test",
            )
            .body(Body::from(vec![0u8; MAX_UPLOAD + 1]))
            .unwrap();
        let response = router(engine(), "secret".into())
            .oneshot(request)
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    }

    #[test]
    fn bind_is_always_ipv4_loopback() {
        assert_eq!(BIND.ip(), Ipv4Addr::LOCALHOST);
        assert_eq!(BIND.port(), 7878);
    }

    #[test]
    fn cors_only_allows_integration_origins() {
        for origin in [
            "null",
            "chrome-extension://abc",
            "tauri://localhost",
            "https://tauri.localhost",
        ] {
            assert!(allowed_origin(&HeaderValue::from_str(origin).unwrap()));
        }
        for origin in [
            "https://example.com",
            "http://localhost:3000",
            "chrome-extension://abc.evil.com",
            "tauri://evil.com",
        ] {
            assert!(!allowed_origin(&HeaderValue::from_str(origin).unwrap()));
        }
    }

    #[test]
    fn token_persists_without_replacement() {
        let dir = std::env::temp_dir().join(format!("glance-token-{}", std::process::id()));
        let path = dir.join("token");
        let a = token_at(&path).unwrap();
        assert_eq!(URL_SAFE_NO_PAD.decode(&a).unwrap().len(), 32);
        assert_eq!(a, token_at(&path).unwrap());
        fs::remove_dir_all(dir).unwrap();
    }
}
