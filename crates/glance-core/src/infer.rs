use crate::{
    Error, Result,
    metrics::{self, Aoi, AoiShare, CompareDelta, Heatmap},
    registry::Model,
    render,
    scanpath::{self, Fixation},
};
#[cfg(feature = "native")]
use crate::{
    registry::Registry,
    system::{self, SystemInfo},
};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use image::{DynamicImage, GenericImageView, ImageReader, imageops::FilterType};
#[cfg(feature = "native")]
use ort::{
    environment::Environment, ep::ExecutionProviderDispatch, session::Session, value::Tensor,
};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
#[cfg(feature = "native")]
use std::{
    collections::{HashMap, VecDeque},
    path::{Path, PathBuf},
    sync::Mutex,
};

pub const MAX_UPLOAD: usize = 25 * 1024 * 1024;
const MAX_PIXELS: u64 = 16_000_000;

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ContentType {
    #[default]
    Natural,
    Ecommerce,
    Ui,
}

impl std::str::FromStr for ContentType {
    type Err = Error;

    fn from_str(value: &str) -> Result<Self> {
        match value {
            "natural" => Ok(Self::Natural),
            "ecommerce" => Ok(Self::Ecommerce),
            "ui" => Ok(Self::Ui),
            _ => Err(Error::Invalid(
                "content_type must be natural, ecommerce, or ui".into(),
            )),
        }
    }
}

#[cfg(feature = "native")]
impl ContentType {
    fn condition_index(self, model: &Model) -> Result<usize> {
        let (name, index) = match self {
            Self::Natural => (
                "natural",
                model.condition.as_ref().map_or(1, |c| c.default_index),
            ),
            Self::Ecommerce => ("ecommerce", 2),
            Self::Ui => ("ui", 3),
        };
        if model.conditions.is_empty() {
            return Ok(index);
        }
        model
            .conditions
            .iter()
            .position(|c| c == name)
            .ok_or_else(|| {
                Error::Invalid(format!("model '{}' has no '{name}' condition", model.id))
            })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgreementInfo {
    pub uncertainty_png_b64: String,
    pub mean_cc: f32,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Metrics {
    pub clarity: f32,
    pub aoi_share: Vec<AoiShare>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agreement: Option<AgreementInfo>,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeResponse {
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub heatmap_png_b64: String,
    pub overlay_png_b64: String,
    pub fog_png_b64: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub squint_png_b64: Option<String>,
    pub scanpath: Vec<Fixation>,
    pub metrics: Metrics,
}
#[derive(Debug, Serialize)]
pub struct CompareResponse {
    pub a: AnalyzeResponse,
    pub b: AnalyzeResponse,
    pub delta: CompareDelta,
    pub cc: f32,
}

#[cfg(feature = "native")]
struct Loaded {
    session: Session,
    state: HashMap<String, (Vec<i64>, Vec<f32>)>,
    provider: &'static str,
}

#[cfg(feature = "native")]
pub struct Engine {
    pub registry: Registry,
    pub system: SystemInfo,
    default_model: Option<String>,
    sessions: VecDeque<(String, Loaded)>,
}

#[cfg(feature = "native")]
pub fn environment() -> Result<Environment> {
    static ENV: Mutex<Option<Environment>> = Mutex::new(None);
    let mut env = ENV
        .lock()
        .map_err(|_| Error::Invalid("runtime lock poisoned".into()))?;
    if env.is_none() {
        let runtime = ort::init()
            .with_name("glance")
            .with_telemetry(false)
            .build()?;
        runtime.set_log_level(ort::logging::LogLevel::Fatal);
        *env = Some(runtime);
    }
    env.clone()
        .ok_or_else(|| Error::Invalid("runtime initialization failed".into()))
}

pub fn decode(bytes: &[u8]) -> Result<DynamicImage> {
    if bytes.len() > MAX_UPLOAD {
        return Err(Error::Invalid("image exceeds 25 MB upload limit".into()));
    }
    let mut reader = ImageReader::new(Cursor::new(bytes)).with_guessed_format()?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(16_000);
    limits.max_image_height = Some(16_000);
    limits.max_alloc = Some(256 * 1024 * 1024);
    reader.limits(limits);
    let image = reader.decode()?;
    validate_image(&image)?;
    Ok(image)
}

#[cfg(feature = "native")]
pub fn read_image(path: &Path) -> Result<DynamicImage> {
    if std::fs::metadata(path)?.len() > MAX_UPLOAD as u64 {
        return Err(Error::Invalid("image exceeds 25 MB upload limit".into()));
    }
    decode(&std::fs::read(path)?)
}

fn validate_image(image: &DynamicImage) -> Result<()> {
    let (w, h) = image.dimensions();
    if w == 0 || h == 0 || u64::from(w) * u64::from(h) > MAX_PIXELS {
        return Err(Error::Invalid(
            "image must contain 1–16,000,000 pixels".into(),
        ));
    }
    Ok(())
}

pub fn validate_aois(aois: &[Aoi]) -> Result<()> {
    if aois.len() > 100 {
        return Err(Error::Invalid("maximum 100 AOIs".into()));
    }
    let mut ids = std::collections::HashSet::new();
    for aoi in aois {
        aoi.validate()?;
        if !ids.insert(&aoi.id) {
            return Err(Error::Invalid("AOI ids must be unique".into()));
        }
    }
    Ok(())
}

#[cfg(feature = "native")]
impl Engine {
    pub fn new(registry: Registry) -> Result<Self> {
        Ok(Self {
            registry,
            system: SystemInfo::detect(&environment()?),
            default_model: system::get_config()?.default_model,
            sessions: VecDeque::new(),
        })
    }

    pub fn resolve_model(&self, model: Option<&str>) -> Result<String> {
        let id = model
            .filter(|id| *id != "default")
            .or(self.default_model.as_deref())
            .unwrap_or(self.system.recommended_model);
        self.registry.get(id)?;
        Ok(id.into())
    }

    pub fn config(&self) -> system::Config {
        system::Config {
            default_model: self.default_model.clone(),
        }
    }

    pub fn set_config(&mut self, config: system::Config) -> Result<()> {
        if let Some(id) = &config.default_model {
            self.registry.get(id)?;
        }
        system::save_config(&config)?;
        self.default_model = config.default_model;
        Ok(())
    }

    /// Warm the installed default before accepting HTTP or MCP requests.
    pub fn warmup(&mut self) -> Result<()> {
        let id = self.resolve_model(None)?;
        if self.registry.path(&id)?.is_file() {
            let model = self.registry.get(&id)?;
            let image = DynamicImage::new_rgb8(model.input.w, model.input.h);
            self.infer(&image, &id)?;
            if self.resolve_model(None)? != id {
                self.warmup()?;
            }
        }
        Ok(())
    }

    fn optimized_model_path(&self, id: &str, provider: &str) -> Result<PathBuf> {
        let model = self.registry.get(id)?;
        model.validate()?;
        let dirs = directories::BaseDirs::new()
            .ok_or_else(|| Error::Invalid("cannot locate cache directory".into()))?;
        let sha8 = model
            .sha256
            .get(..8)
            .filter(|s| s.bytes().all(|b| b.is_ascii_hexdigit()))
            .ok_or_else(|| Error::Invalid("model cache requires a checksum".into()))?;
        Ok(dirs
            .cache_dir()
            .join("glance/ort")
            .join(format!("{id}-{sha8}-{provider}.ort")))
    }

    fn load_session(
        &self,
        id: &str,
        env: &Environment,
        provider: Option<(&str, &ExecutionProviderDispatch)>,
    ) -> Result<Session> {
        let builder = || system::builder(env, self.system.threads, provider);
        let cache = self
            .optimized_model_path(id, provider.map_or("cpu", |(name, _)| name))
            .ok();
        if let Some(cache) = &cache
            && cache.is_file()
            && let Ok(session) = builder()?.commit_from_file(cache)
        {
            return Ok(session);
        }
        let path = self.registry.path(id)?;
        if let Some(cache) = cache
            && let Some(parent) = cache.parent()
            && std::fs::create_dir_all(parent).is_ok()
        {
            // Publish atomically so another CLI/app process never reads a partial model.
            let temp = cache.with_extension(format!("{}.ort", std::process::id()));
            let result = builder()?
                .with_optimized_model_path(&temp)
                .map_err(|e| Error::Invalid(e.to_string()))
                .and_then(|mut builder| builder.commit_from_file(&path).map_err(Error::from));
            if let Ok(session) = result {
                let _ = std::fs::rename(&temp, cache);
                let _ = std::fs::remove_file(&temp);
                return Ok(session);
            }
            let _ = std::fs::remove_file(temp);
        }
        builder()?.commit_from_file(path).map_err(Error::from)
    }

    fn session(&mut self, id: &str) -> Result<&mut Loaded> {
        if let Some(index) = self.sessions.iter().position(|(cached, _)| cached == id) {
            let loaded = self.sessions.remove(index).expect("cached session exists");
            self.sessions.push_back(loaded);
        } else {
            let path = self.registry.path(id)?;
            if !path.is_file() {
                return Err(Error::Invalid(format!(
                    "model '{id}' is not installed; run glance models install {id}"
                )));
            }
            let env = environment()?;
            // Evict before loading so initialization cannot retain a third session.
            if self.sessions.len() == 2 {
                self.sessions.pop_front();
            }
            let mut accelerated = None;
            for (name, ep) in system::providers()
                .into_iter()
                .filter(|_| self.system.provider != "cpu")
            {
                if let Ok(session) = self.load_session(id, &env, Some((name, &ep))) {
                    accelerated = Some((session, name));
                    break;
                }
            }
            let (session, provider) = match accelerated {
                Some(loaded) => loaded,
                None => {
                    self.sessions.retain(|(_, loaded)| loaded.provider == "cpu");
                    (self.load_session(id, &env, None)?, "cpu")
                }
            };
            self.system.set_provider(provider);
            self.sessions.push_back((
                id.into(),
                Loaded {
                    session,
                    state: HashMap::new(),
                    provider,
                },
            ));
        }
        if let Some((_, loaded)) = self.sessions.back() {
            self.system.set_provider(loaded.provider);
        }
        self.sessions
            .back_mut()
            .map(|(_, loaded)| loaded)
            .ok_or_else(|| Error::Invalid("session cache unavailable".into()))
    }

    pub fn reset_temporal(&mut self, id: &str) {
        if let Some((_, loaded)) = self.sessions.iter_mut().find(|(cached, _)| cached == id) {
            loaded.state.clear();
        }
    }

    pub fn infer(&mut self, image: &DynamicImage, id: &str) -> Result<Heatmap> {
        self.infer_with_content_type(image, id, ContentType::Natural)
    }

    pub fn infer_with_content_type(
        &mut self,
        image: &DynamicImage,
        id: &str,
        content_type: ContentType,
    ) -> Result<Heatmap> {
        self.infer_frame(image, id, false, content_type)
    }

    pub(crate) fn infer_frame(
        &mut self,
        image: &DynamicImage,
        id: &str,
        temporal: bool,
        content_type: ContentType,
    ) -> Result<Heatmap> {
        let result = self.run_frame(image, id, temporal, content_type);
        if matches!(result, Err(Error::Ort(_))) && self.system.provider != "cpu" {
            // Some GPU kernels fail only at execution, after successful registration.
            let index = self
                .sessions
                .iter()
                .position(|(cached, _)| cached == id)
                .ok_or_else(|| Error::Invalid("session cache unavailable".into()))?;
            let (_, Loaded { session, state, .. }) =
                self.sessions.remove(index).expect("cached session exists");
            drop(session);
            self.sessions.retain(|(_, loaded)| loaded.provider == "cpu");
            self.system.set_provider("cpu");
            let session = self.load_session(id, &environment()?, None)?;
            self.sessions.push_back((
                id.into(),
                Loaded {
                    session,
                    state,
                    provider: "cpu",
                },
            ));
            return self.run_frame(image, id, temporal, content_type);
        }
        result
    }

    fn run_frame(
        &mut self,
        image: &DynamicImage,
        id: &str,
        temporal: bool,
        content_type: ContentType,
    ) -> Result<Heatmap> {
        validate_image(image)?;
        let model = self.registry.get(id)?.clone();
        model.validate()?;
        let input = preprocess(image, &model)?;
        let loaded = self.session(id)?;
        if !temporal {
            loaded.state.clear();
        }
        let first = loaded
            .session
            .inputs()
            .first()
            .ok_or_else(|| Error::Invalid("model has no inputs".into()))?;
        let first_name = first.name().to_owned();
        let mut input_shape = if model.input.layout == "NCHW" {
            vec![1, 3, i64::from(model.input.h), i64::from(model.input.w)]
        } else {
            vec![1, i64::from(model.input.h), i64::from(model.input.w), 3]
        };
        if first.dtype().tensor_shape().is_some_and(|s| s.len() == 5) {
            input_shape.insert(1, 1);
        }
        let mut inputs = vec![(
            first_name,
            Tensor::from_array((input_shape, input))?.into_dyn(),
        )];
        let mut states = Vec::new();
        for inlet in loaded.session.inputs().iter().skip(1) {
            let name = inlet.name().to_owned();
            let shape = inlet
                .dtype()
                .tensor_shape()
                .ok_or_else(|| Error::Invalid("recurrent inputs must be f32 tensors".into()))?
                .to_vec();
            let count = shape
                .iter()
                .try_fold(1usize, |n, &d| {
                    if d > 0 {
                        n.checked_mul(d as usize)
                    } else {
                        None
                    }
                })
                .filter(|&n| n <= 16_000_000)
                .ok_or_else(|| {
                    Error::Invalid(
                        "recurrent input needs fixed dimensions, at most 16M elements".into(),
                    )
                })?;
            let is_condition = model.condition.as_ref().is_some_and(|c| c.name == name);
            let data = if is_condition {
                let index = content_type.condition_index(&model)?;
                if index >= count {
                    return Err(Error::Invalid("condition index outside input shape".into()));
                }
                let mut data = vec![0.0; count];
                data[index] = 1.0;
                data
            } else {
                if !model.tasks.iter().any(|t| t == "video") {
                    return Err(Error::Invalid(format!(
                        "unsupported auxiliary input '{name}'"
                    )));
                }
                loaded
                    .state
                    .get(&name)
                    .map(|(_, v)| v.clone())
                    .unwrap_or_else(|| vec![0.0; count])
            };
            inputs.push((
                name.clone(),
                Tensor::from_array((shape.clone(), data))?.into_dyn(),
            ));
            if !is_condition {
                states.push((name, shape));
            }
        }
        let first_output = loaded
            .session
            .outputs()
            .first()
            .map(|o| o.name().to_owned())
            .ok_or_else(|| Error::Invalid("model has no outputs".into()))?;
        let outputs = loaded.session.run(inputs)?;
        let output = outputs
            .get("heatmap")
            .or_else(|| outputs.get(&first_output))
            .ok_or_else(|| Error::Invalid("model has no heatmap output".into()))?;
        let (shape, data) = output.try_extract_tensor::<f32>()?;
        let heatmap = postprocess(shape, data, &model, image.width(), image.height())?;
        if temporal {
            for (name, shape) in states {
                let output_name = model
                    .state
                    .as_ref()
                    .filter(|s| s.input == name)
                    .map(|s| s.output.clone())
                    .unwrap_or_else(|| format!("new_{name}"));
                let state = outputs.get(output_name.as_str()).ok_or_else(|| {
                    Error::Invalid(format!(
                        "recurrent input '{name}' requires output '{output_name}'"
                    ))
                })?;
                let (actual, data) = state.try_extract_tensor::<f32>()?;
                if actual.as_ref() != shape.as_slice() || data.iter().any(|v| !v.is_finite()) {
                    return Err(Error::Invalid("invalid recurrent state output".into()));
                }
                loaded.state.insert(name, (shape, data.to_vec()));
            }
        }
        Ok(heatmap)
    }

    fn prediction(
        &mut self,
        image: &DynamicImage,
        model: Option<&str>,
        content_type: ContentType,
    ) -> Result<(String, Heatmap, Option<AgreementInfo>)> {
        if model == Some("ensemble") {
            let ids: Vec<_> = self
                .registry
                .list()
                .into_iter()
                .filter(|m| m.installed && m.tasks.iter().any(|t| t == "image"))
                .map(|m| m.id)
                .collect();
            let maps: Vec<_> = ids
                .iter()
                .map(|id| self.infer_with_content_type(image, id, content_type))
                .collect::<Result<_>>()?;
            let agreement = metrics::agreement(&maps)?;
            let values = (0..maps[0].values.len())
                .map(|i| maps.iter().map(|m| m.values[i]).sum::<f32>() / maps.len() as f32)
                .collect();
            let map = Heatmap::new(image.width(), image.height(), values)?;
            Ok((
                "ensemble".into(),
                map,
                Some(AgreementInfo {
                    uncertainty_png_b64: STANDARD.encode(render::heatmap(&agreement.std)?),
                    mean_cc: agreement.mean_cc,
                }),
            ))
        } else {
            let id = self.resolve_model(model)?;
            let map = self.infer_with_content_type(image, &id, content_type)?;
            Ok((id, map, None))
        }
    }

    pub fn analyze(
        &mut self,
        image: &DynamicImage,
        model: Option<&str>,
        aois: &[Aoi],
    ) -> Result<AnalyzeResponse> {
        self.analyze_with_content_type(image, model, aois, ContentType::Natural)
    }

    pub fn analyze_with_content_type(
        &mut self,
        image: &DynamicImage,
        model: Option<&str>,
        aois: &[Aoi],
        content_type: ContentType,
    ) -> Result<AnalyzeResponse> {
        self.analyze_with_layers(image, model, aois, content_type, false)
    }

    pub fn analyze_with_layers(
        &mut self,
        image: &DynamicImage,
        model: Option<&str>,
        aois: &[Aoi],
        content_type: ContentType,
        squint: bool,
    ) -> Result<AnalyzeResponse> {
        validate_aois(aois)?;
        let (id, map, agreement) = self.prediction(image, model, content_type)?;
        response(image, id, &map, aois, agreement, squint)
    }

    pub fn analyze_bytes(
        &mut self,
        bytes: &[u8],
        model: Option<&str>,
        aois: &[Aoi],
    ) -> Result<AnalyzeResponse> {
        self.analyze(&decode(bytes)?, model, aois)
    }

    pub fn analyze_bytes_with_content_type(
        &mut self,
        bytes: &[u8],
        model: Option<&str>,
        aois: &[Aoi],
        content_type: ContentType,
    ) -> Result<AnalyzeResponse> {
        self.analyze_with_content_type(&decode(bytes)?, model, aois, content_type)
    }

    pub fn analyze_path(
        &mut self,
        path: &Path,
        model: Option<&str>,
        aois: &[Aoi],
    ) -> Result<AnalyzeResponse> {
        self.analyze(&read_image(path)?, model, aois)
    }

    pub fn analyze_path_with_content_type(
        &mut self,
        path: &Path,
        model: Option<&str>,
        aois: &[Aoi],
        content_type: ContentType,
    ) -> Result<AnalyzeResponse> {
        self.analyze_with_content_type(&read_image(path)?, model, aois, content_type)
    }

    pub fn compare(
        &mut self,
        a: &DynamicImage,
        b: &DynamicImage,
        model: Option<&str>,
        aois: &[Aoi],
    ) -> Result<CompareResponse> {
        self.compare_with_content_type(a, b, model, aois, ContentType::Natural)
    }

    pub fn compare_with_content_type(
        &mut self,
        a: &DynamicImage,
        b: &DynamicImage,
        model: Option<&str>,
        aois: &[Aoi],
        content_type: ContentType,
    ) -> Result<CompareResponse> {
        validate_aois(aois)?;
        let (ida, ma, aa) = self.prediction(a, model, content_type)?;
        let (idb, mb, ab) = self.prediction(b, Some(&ida), content_type)?;
        let cc = if (ma.width, ma.height) == (mb.width, mb.height) {
            metrics::cc(&ma, &mb)?
        } else {
            metrics::cc(&ma, &mb.resized(ma.width, ma.height)?)?
        };
        Ok(CompareResponse {
            a: response(a, ida, &ma, aois, aa, false)?,
            b: response(b, idb, &mb, aois, ab, false)?,
            delta: metrics::compare(&ma, &mb, aois)?,
            cc,
        })
    }
}

pub fn response(
    image: &DynamicImage,
    id: String,
    map: &Heatmap,
    aois: &[Aoi],
    agreement: Option<AgreementInfo>,
    squint: bool,
) -> Result<AnalyzeResponse> {
    validate_image(image)?;
    validate_aois(aois)?;
    if (image.width(), image.height()) != (map.width, map.height) {
        return Err(Error::Invalid(
            "heatmap dimensions must match the image".into(),
        ));
    }
    Ok(AnalyzeResponse {
        model: id,
        width: image.width(),
        height: image.height(),
        heatmap_png_b64: STANDARD.encode(render::heatmap(map)?),
        overlay_png_b64: STANDARD.encode(render::overlay(image, map)?),
        fog_png_b64: STANDARD.encode(render::fog(image, map)?),
        squint_png_b64: squint
            .then(|| {
                render::squint(image, image.width() as f32 * 0.02)
                    .map(|bytes| STANDARD.encode(bytes))
            })
            .transpose()?,
        scanpath: scanpath::predict(map),
        metrics: Metrics {
            clarity: metrics::clarity(map),
            aoi_share: metrics::aoi_share(map, aois),
            agreement,
        },
    })
}

pub fn finish(
    image: &DynamicImage,
    model: &Model,
    dims: &[i64],
    output: &[f32],
    aois: &[Aoi],
    squint: bool,
) -> Result<(AnalyzeResponse, Heatmap)> {
    validate_aois(aois)?;
    let map = postprocess(dims, output, model, image.width(), image.height())?;
    let result = response(image, model.id.clone(), &map, aois, None, squint)?;
    Ok((result, map))
}

pub fn preprocess(image: &DynamicImage, model: &Model) -> Result<Vec<f32>> {
    validate_image(image)?;
    model.validate()?;
    let filter = if model.input.interpolation == "lanczos" {
        FilterType::Lanczos3
    } else {
        FilterType::Triangle
    };
    let rgb = if model.input.resize == "letterbox" {
        let ratio = (f64::from(model.input.w) / f64::from(image.width()))
            .min(f64::from(model.input.h) / f64::from(image.height()));
        let w = (f64::from(image.width()) * ratio).floor().max(1.0) as u32;
        let h = (f64::from(image.height()) * ratio).floor().max(1.0) as u32;
        let resized = image.resize_exact(w, h, filter).to_rgb8();
        let mut padded = image::RgbImage::from_pixel(
            model.input.w,
            model.input.h,
            image::Rgb([model.input.padding_value; 3]),
        );
        image::imageops::replace(
            &mut padded,
            &resized,
            i64::from((model.input.w - w) / 2),
            i64::from((model.input.h - h) / 2),
        );
        padded
    } else {
        image
            .resize_exact(model.input.w, model.input.h, filter)
            .to_rgb8()
    };
    let n = (model.input.w * model.input.h) as usize;
    let mut data = vec![0.0; n * 3];
    for (i, pixel) in rgb.pixels().enumerate() {
        for c in 0..3 {
            let j = if model.input.layout == "NCHW" {
                c * n + i
            } else {
                i * 3 + c
            };
            let channel = if model.input.color == "BGR" { 2 - c } else { c };
            data[j] = (f32::from(pixel[channel]) * model.input.scale - model.input.mean[c])
                / model.input.std[c];
        }
    }
    Ok(data)
}

pub fn postprocess(
    shape: &[i64],
    data: &[f32],
    model: &Model,
    width: u32,
    height: u32,
) -> Result<Heatmap> {
    model.validate()?;
    if width == 0 || height == 0 || u64::from(width) * u64::from(height) > MAX_PIXELS {
        return Err(Error::Invalid("invalid output image dimensions".into()));
    }
    let spatial = if shape.len() >= 2 && shape[..shape.len() - 2].iter().all(|d| *d == 1) {
        &shape[shape.len() - 2..]
    } else if shape.len() == 4 && shape[0] == 1 && shape[3] == 1 {
        &shape[1..3]
    } else {
        return Err(Error::Invalid(format!(
            "expected single heatmap output, got {shape:?}"
        )));
    };
    if spatial.iter().any(|&d| d <= 0 || d > 16_000)
        || spatial[0] * spatial[1] != data.len() as i64
        || data.iter().any(|v| !v.is_finite())
    {
        return Err(Error::Invalid("invalid heatmap output".into()));
    }
    let (w, h) = (spatial[1] as u32, spatial[0] as u32);
    let mut values = if model.input.resize == "letterbox" {
        let ratio = (f64::from(width) / f64::from(w)).max(f64::from(height) / f64::from(h));
        let nw = (f64::from(w) * ratio).floor().max(f64::from(width)) as u32;
        let nh = (f64::from(h) * ratio).floor().max(f64::from(height)) as u32;
        if u64::from(nw) * u64::from(nh) > 64_000_000 {
            return Err(Error::Invalid("letterbox output exceeds 64M pixels".into()));
        }
        let resized = metrics::resize_bilinear(data, w, h, nw, nh);
        let (left, top) = ((nw - width) / 2, (nh - height) / 2);
        (0..height)
            .flat_map(|y| {
                resized[((y + top) * nw + left) as usize..((y + top) * nw + left + width) as usize]
                    .iter()
                    .copied()
            })
            .collect()
    } else {
        metrics::resize_bilinear(data, w, h, width, height)
    };
    if model.output == "logit" {
        let max = values.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        for v in &mut values {
            *v = (*v - max).exp();
        }
    }
    let mut heatmap = Heatmap::new(width, height, values)?;
    if let Some(sigma) = model.blur_sigma.filter(|s| *s > 0.0) {
        let buf = image::ImageBuffer::<image::Luma<f32>, _>::from_raw(
            heatmap.width,
            heatmap.height,
            heatmap.values,
        )
        .ok_or_else(|| Error::Invalid("invalid blur dimensions".into()))?;
        heatmap = Heatmap::new(width, height, image::imageops::blur(&buf, sigma).into_raw())?;
    }
    Ok(heatmap)
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use super::*;

    fn model() -> Model {
        serde_json::from_str(include_str!("../tests/fixtures/fixture.json")).unwrap()
    }

    #[test]
    fn preprocessing_honors_bgr_letterbox() {
        let mut value = serde_json::to_value(model()).unwrap();
        value["input"]["w"] = 4.into();
        value["input"]["h"] = 4.into();
        value["input"]["color"] = "BGR".into();
        value["input"]["resize"] = "letterbox".into();
        value["input"]["padding_value"] = 1.into();
        let model: Model = serde_json::from_value(value).unwrap();
        let image =
            DynamicImage::ImageRgb8(image::RgbImage::from_pixel(2, 1, image::Rgb([255, 0, 0])));
        let data = preprocess(&image, &model).unwrap();
        assert_eq!(data[4], 0.0);
        assert_eq!(data[36], 1.0);
        assert!((data[0] - 1.0 / 255.0).abs() < 1e-6);
    }

    #[test]
    fn logit_resize_precedes_exponentiation() {
        let mut model = model();
        model.output = "logit".into();
        let map = postprocess(&[1, 1, 1, 2], &[0.0, -4f32.ln()], &model, 3, 1).unwrap();
        for (actual, expected) in map.values.iter().zip([4.0 / 7.0, 2.0 / 7.0, 1.0 / 7.0]) {
            assert!((actual - expected).abs() < 1e-5);
        }
    }

    #[test]
    fn content_conditions_preserve_sidecars_and_validate_names() {
        let mut model = model();
        model.condition = Some(crate::registry::Condition {
            name: "condition".into(),
            default_index: 0,
        });
        assert_eq!(ContentType::Natural.condition_index(&model).unwrap(), 0);
        model.conditions = ["salicon", "natural", "ecommerce", "ui"]
            .map(String::from)
            .into();
        for (content_type, index) in [
            (ContentType::Natural, 1),
            (ContentType::Ecommerce, 2),
            (ContentType::Ui, 3),
        ] {
            assert_eq!(content_type.condition_index(&model).unwrap(), index);
        }
        assert!("salicon".parse::<ContentType>().is_err());
        assert!(serde_json::from_str::<ContentType>("\"unknown\"").is_err());
    }

    #[test]
    fn lazy_cache_evicts_least_recently_used_and_defaults_follow_hardware() {
        let dir = std::env::temp_dir().join(format!("glance-lru-{}", std::process::id()));
        let mut registry = Registry::from_models(vec![], dir.clone()).unwrap();
        for id in ["unisal", "sum", "third"] {
            let mut model = model();
            model.id = id.into();
            registry
                .import(
                    Path::new(concat!(
                        env!("CARGO_MANIFEST_DIR"),
                        "/tests/fixtures/fixture.onnx"
                    )),
                    model,
                )
                .unwrap();
        }
        let mut engine = Engine::new(registry).unwrap();
        engine.default_model = None;
        assert!(engine.sessions.is_empty());
        engine.system.set_provider("cpu");
        assert_eq!(engine.resolve_model(None).unwrap(), "unisal");
        engine.system.set_provider("cuda");
        assert_eq!(engine.resolve_model(Some("default")).unwrap(), "sum");
        engine.default_model = Some("third".into());
        assert_eq!(engine.resolve_model(None).unwrap(), "third");
        assert_eq!(engine.resolve_model(Some("unisal")).unwrap(), "unisal");
        for id in ["unisal", "sum", "unisal", "third"] {
            engine.session(id).unwrap();
            assert!(engine.sessions.len() <= 2);
        }
        assert_eq!(
            engine
                .sessions
                .iter()
                .map(|(id, _)| id.as_str())
                .collect::<Vec<_>>(),
            ["unisal", "third"]
        );
        drop(engine);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn failed_accelerated_inference_retries_cpu_once() {
        let dir = std::env::temp_dir().join(format!("glance-fallback-{}", std::process::id()));
        let mut registry = Registry::from_models(vec![], dir.clone()).unwrap();
        let mut model = model();
        model.input.w = 7;
        registry
            .import(
                Path::new(concat!(
                    env!("CARGO_MANIFEST_DIR"),
                    "/tests/fixtures/fixture.onnx"
                )),
                model,
            )
            .unwrap();
        let mut engine = Engine::new(registry).unwrap();
        // Simulate an accelerated session independently of this test host's GPU.
        engine.session("fixture").unwrap().provider = "directml";
        engine.system.set_provider("directml");
        let image = DynamicImage::new_rgb8(8, 8);
        assert!(matches!(
            engine.infer(&image, "fixture"),
            Err(Error::Ort(_))
        ));
        assert_eq!(engine.system.provider, "cpu");
        assert_eq!(engine.system.recommended_model, "unisal");
        assert_eq!(engine.sessions.len(), 1);
        assert_eq!(engine.sessions[0].1.provider, "cpu");
        drop(engine);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn optimized_cache_reloads_and_recovers_from_corruption() {
        let dir = std::env::temp_dir().join(format!("glance-cache-{}", std::process::id()));
        let mut registry = Registry::from_models(vec![], dir.clone()).unwrap();
        let mut metadata = model();
        metadata.id = format!("cache-test-{}", std::process::id());
        let id = metadata.id.clone();
        registry
            .import(
                Path::new(concat!(
                    env!("CARGO_MANIFEST_DIR"),
                    "/tests/fixtures/fixture.onnx"
                )),
                metadata,
            )
            .unwrap();
        let engine = Engine::new(registry).unwrap();
        let cache = engine.optimized_model_path(&id, "cpu").unwrap();
        let _ = std::fs::remove_file(&cache);
        drop(
            engine
                .load_session(&id, &environment().unwrap(), None)
                .unwrap(),
        );
        assert!(cache.is_file());
        drop(
            engine
                .load_session(&id, &environment().unwrap(), None)
                .unwrap(),
        );
        std::fs::write(&cache, b"broken cache").unwrap();
        drop(
            engine
                .load_session(&id, &environment().unwrap(), None)
                .unwrap(),
        );
        assert!(std::fs::metadata(&cache).unwrap().len() > 12);
        assert_ne!(cache, engine.optimized_model_path(&id, "directml").unwrap());
        drop(engine);
        std::fs::remove_file(cache).unwrap();
        std::fs::remove_dir_all(dir).unwrap();
    }
}
