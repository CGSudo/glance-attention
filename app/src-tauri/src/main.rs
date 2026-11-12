#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![forbid(unsafe_code)]

use glance_core::{
    Engine,
    infer::{AnalyzeResponse, CompareResponse, ContentType, decode},
    metrics::Aoi,
    registry::{Model, ModelSummary, Registry},
    system::{Config, SystemInfo},
    video::VideoResponse,
};
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{
    Emitter, Manager, State,
    menu::{CheckMenuItem, Menu, PredefinedMenuItem, Submenu},
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

type SharedEngine = Arc<Mutex<Engine>>;

async fn run<T: Send + 'static>(
    engine: &SharedEngine,
    work: impl FnOnce(&mut Engine) -> glance_core::Result<T> + Send + 'static,
) -> Result<T, String> {
    let engine = engine.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut engine = engine
            .lock()
            .map_err(|_| "Engine unavailable".to_string())?;
        work(&mut engine).map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn list_models(engine: State<'_, SharedEngine>) -> Result<Vec<ModelSummary>, String> {
    run(&engine, |engine| Ok(engine.registry.list())).await
}

#[derive(Clone, Serialize)]
struct InstallProgress {
    id: String,
    downloaded: u64,
    total: Option<u64>,
}

#[tauri::command]
async fn install_model(
    app: tauri::AppHandle,
    engine: State<'_, SharedEngine>,
    id: String,
) -> Result<serde_json::Value, String> {
    run(&engine, move |engine| {
        let mut last_percent = None;
        engine
            .registry
            .install_with_progress(&id, |downloaded, total| {
                let percent = total
                    .filter(|total| *total > 0)
                    .map(|total| downloaded.saturating_mul(100) / total);
                if percent != last_percent || downloaded == 0 {
                    let _ = app.emit(
                        "model-install-progress",
                        InstallProgress {
                            id: id.clone(),
                            downloaded,
                            total,
                        },
                    );
                    last_percent = percent;
                }
            })?;
        Ok(serde_json::json!({"ok": true}))
    })
    .await
}

#[tauri::command]
async fn import_model(
    app: tauri::AppHandle,
    engine: State<'_, SharedEngine>,
    path: PathBuf,
    metadata_path: PathBuf,
) -> Result<serde_json::Value, String> {
    if !app.fs_scope().is_allowed(&path) || !app.fs_scope().is_allowed(&metadata_path) {
        return Err("Choose the ONNX model and JSON metadata using the file dialog".into());
    }
    run(&engine, move |engine| {
        if std::fs::metadata(&path)?.len() > 2_000_000_000
            || std::fs::metadata(&metadata_path)?.len() > 64 * 1024
        {
            return Err(glance_core::Error::Invalid(
                "Model exceeds 2 GB or metadata exceeds 64 KB".into(),
            ));
        }
        let metadata: Model = serde_json::from_slice(&std::fs::read(metadata_path)?)?;
        engine.registry.import(&path, metadata)?;
        Ok(serde_json::json!({"ok": true}))
    })
    .await
}

#[tauri::command]
async fn analyze(
    engine: State<'_, SharedEngine>,
    image: Vec<u8>,
    model: Option<String>,
    aois: Vec<Aoi>,
    content_type: Option<ContentType>,
    layers: Option<String>,
) -> Result<AnalyzeResponse, String> {
    if layers.as_deref().is_some_and(|layers| layers != "squint") {
        return Err("layers must be squint".into());
    }
    run(&engine, move |engine| {
        engine.analyze_with_layers(
            &decode(&image)?,
            model.as_deref(),
            &aois,
            content_type.unwrap_or_default(),
            layers.is_some(),
        )
    })
    .await
}

#[tauri::command]
async fn compare(
    engine: State<'_, SharedEngine>,
    a: Vec<u8>,
    b: Vec<u8>,
    model: Option<String>,
    aois: Vec<Aoi>,
    content_type: Option<ContentType>,
) -> Result<CompareResponse, String> {
    run(&engine, move |engine| {
        engine.compare_with_content_type(
            &decode(&a)?,
            &decode(&b)?,
            model.as_deref(),
            &aois,
            content_type.unwrap_or_default(),
        )
    })
    .await
}

#[tauri::command]
async fn analyze_video_frames(
    app: tauri::AppHandle,
    engine: State<'_, SharedEngine>,
    frames: Vec<Vec<u8>>,
    model: Option<String>,
    aois: Vec<Aoi>,
) -> Result<VideoResponse, String> {
    run(&engine, move |engine| {
        if frames.iter().map(Vec::len).sum::<usize>() > glance_core::infer::MAX_UPLOAD {
            return Err(glance_core::Error::Invalid(
                "Frames exceed 25 MB upload limit".into(),
            ));
        }
        let result = engine.video_images(
            frames.iter().enumerate().map(|(index, frame)| {
                let _ = app.emit("video-progress", index * 100 / frames.len());
                decode(frame)
            }),
            model.as_deref(),
            &aois,
        )?;
        let _ = app.emit("video-progress", 100);
        Ok(result)
    })
    .await
}

#[tauri::command]
async fn system_info(engine: State<'_, SharedEngine>) -> Result<SystemInfo, String> {
    run(&engine, |engine| Ok(engine.system.clone())).await
}

#[tauri::command]
async fn get_config(engine: State<'_, SharedEngine>) -> Result<Config, String> {
    run(&engine, |engine| Ok(engine.config())).await
}

#[tauri::command]
async fn set_config(engine: State<'_, SharedEngine>, config: Config) -> Result<Config, String> {
    run(&engine, move |engine| {
        engine.set_config(config)?;
        Ok(engine.config())
    })
    .await
}

fn main() {
    let engine = tauri::async_runtime::block_on(tauri::async_runtime::spawn_blocking(|| {
        Engine::new(Registry::load()?).map(|engine| Arc::new(Mutex::new(engine)))
    }))
    .expect("Engine worker failed")
    .expect("Engine initialization failed");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(engine)
        .setup(|app| {
            let window = &app.config().app.windows[0];
            tauri::WebviewWindowBuilder::from_config(app, window)?
                .on_navigation(|url| {
                    matches!(
                        (url.scheme(), url.host_str()),
                        ("tauri", Some("localhost")) | ("http" | "https", Some("tauri.localhost"))
                    ) || cfg!(debug_assertions)
                        && url.scheme() == "http"
                        && url.host_str() == Some("localhost")
                        && url.port() == Some(5173)
                })
                .build()?;
            let toggle = CheckMenuItem::with_id(
                app,
                "background-server",
                "Open in background server",
                true,
                false,
                None::<&str>,
            )?;
            let submenu = Submenu::with_items(
                app,
                "Glance",
                true,
                &[&toggle, &PredefinedMenuItem::quit(app, None)?],
            )?;
            app.set_menu(Menu::with_items(app, &[&submenu])?)?;
            let shutdown = Mutex::new(None::<tokio::sync::oneshot::Sender<()>>);
            app.on_menu_event(move |app, event| {
                if event.id().as_ref() != "background-server" {
                    return;
                }
                let mut shutdown = shutdown.lock().expect("Server control unavailable");
                if let Some(sender) = shutdown.take() {
                    let _ = sender.send(());
                    let _ = toggle.set_checked(false);
                    return;
                }
                let start = || -> Result<_, Box<dyn std::error::Error>> {
                    let listener = std::net::TcpListener::bind(glance_cli::server::BIND)?;
                    listener.set_nonblocking(true)?;
                    let router = glance_cli::server::shared_router(
                        app.state::<SharedEngine>().inner().clone(),
                        glance_cli::server::token()?,
                    );
                    Ok((listener, router))
                };
                match start() {
                    Ok((listener, router)) => {
                        let (sender, receiver) = tokio::sync::oneshot::channel();
                        *shutdown = Some(sender);
                        let _ = toggle.set_checked(true);
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let result = async {
                                let listener = tokio::net::TcpListener::from_std(listener)?;
                                axum::serve(listener, router)
                                    .with_graceful_shutdown(async {
                                        let _ = receiver.await;
                                    })
                                    .await
                            }
                            .await;
                            if let Err(error) = result {
                                app.dialog()
                                    .message(error.to_string())
                                    .title("Background server failed")
                                    .show(|_| {});
                            }
                        });
                    }
                    Err(error) => {
                        let _ = toggle.set_checked(false);
                        app.dialog()
                            .message(error.to_string())
                            .title("Background server unavailable")
                            .show(|_| {});
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_models,
            install_model,
            import_model,
            analyze,
            compare,
            analyze_video_frames,
            system_info,
            get_config,
            set_config
        ])
        .run(tauri::generate_context!())
        .expect("Glance desktop failed");
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};

    #[test]
    fn ipc_matches_engine_json_and_rejects_invalid_inputs() {
        let dir = std::env::temp_dir().join(format!("glance-ipc-{}", std::process::id()));
        let mut registry = Registry::from_models(vec![], dir.clone()).unwrap();
        let model: Model = serde_json::from_str(include_str!(
            "../../../crates/glance-core/tests/fixtures/fixture.json"
        ))
        .unwrap();
        registry
            .import(
                std::path::Path::new(concat!(
                    env!("CARGO_MANIFEST_DIR"),
                    "/../../crates/glance-core/tests/fixtures/fixture.onnx"
                )),
                model,
            )
            .unwrap();
        let engine = Arc::new(Mutex::new(Engine::new(registry).unwrap()));
        let app = tauri::test::mock_builder()
            .manage(engine)
            .invoke_handler(tauri::generate_handler![
                list_models,
                analyze,
                compare,
                system_info,
                get_config,
                set_config
            ])
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap();
        let window = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();
        let call = |command: &str, body: Value| {
            tauri::test::get_ipc_response(
                &window,
                tauri::webview::InvokeRequest {
                    cmd: command.into(),
                    callback: tauri::ipc::CallbackFn(0),
                    error: tauri::ipc::CallbackFn(1),
                    // The app origin differs per platform; a foreign origin is denied by the ACL.
                    url: if cfg!(windows) {
                        "http://tauri.localhost"
                    } else {
                        "tauri://localhost"
                    }
                    .parse()
                    .unwrap(),
                    body: tauri::ipc::InvokeBody::Json(body),
                    headers: Default::default(),
                    invoke_key: tauri::test::INVOKE_KEY.into(),
                },
            )
            .map(|response| response.deserialize::<Value>().unwrap())
        };
        let image =
            include_bytes!("../../../crates/glance-core/tests/fixtures/input.png").as_slice();
        let analysis = call(
            "analyze",
            json!({"image":image,"model":"fixture","aois":[],"contentType":"ui","layers":"squint"}),
        )
        .unwrap();
        assert_eq!(analysis["width"], 3);
        assert_eq!(analysis["height"], 2);
        assert!(
            analysis["squint_png_b64"]
                .as_str()
                .unwrap()
                .starts_with("iVBOR")
        );
        assert!(
            analysis["heatmap_png_b64"]
                .as_str()
                .unwrap()
                .starts_with("iVBOR")
        );
        let comparison = call(
            "compare",
            json!({"a":image,"b":image,"model":"fixture","aois":[]}),
        )
        .unwrap();
        assert_eq!(comparison["cc"], 1.0);
        assert_eq!(comparison["delta"]["clarity"], 0.0);
        assert_eq!(
            call("list_models", json!({})).unwrap()[0]["installed"],
            true
        );
        assert!(
            call("system_info", json!({})).unwrap()["threads"]
                .as_u64()
                .unwrap()
                > 0
        );
        assert!(
            call("get_config", json!({}))
                .unwrap()
                .get("default_model")
                .is_some()
        );
        assert!(call("set_config", json!({"config":{"default_model":"missing"}})).is_err());
        assert!(call("analyze", json!({"image":[],"model":"fixture","aois":[]})).is_err());
        assert!(
            call(
                "analyze",
                json!({"image":image,"model":"fixture","aois":[],"contentType":"invalid"})
            )
            .is_err()
        );
        drop(window);
        drop(app);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
