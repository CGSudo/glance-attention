use crate::{Error, Result};
use serde::{Deserialize, Serialize};
#[cfg(feature = "native")]
use sha2::{Digest, Sha256};
#[cfg(feature = "native")]
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Input {
    pub w: u32,
    pub h: u32,
    pub layout: String,
    pub mean: [f32; 3],
    pub std: [f32; 3],
    #[serde(default = "rgb")]
    pub color: String,
    #[serde(default = "scale")]
    pub scale: f32,
    #[serde(default = "stretch")]
    pub resize: String,
    #[serde(default = "bilinear")]
    pub interpolation: String,
    #[serde(default)]
    pub padding_value: u8,
}

fn rgb() -> String {
    "RGB".into()
}
fn scale() -> f32 {
    1.0 / 255.0
}
fn stretch() -> String {
    "stretch".into()
}
fn bilinear() -> String {
    "bilinear".into()
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct State {
    pub input: String,
    pub output: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Condition {
    pub name: String,
    #[serde(default = "natural_condition")]
    pub default_index: usize,
}
fn natural_condition() -> usize {
    1
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub tasks: Vec<String>,
    pub input: Input,
    pub output: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub sha256: String,
    #[serde(default)]
    pub size_mb: f64,
    pub license: String,
    #[serde(default)]
    pub citation: String,
    #[serde(default)]
    pub benchmark: serde_json::Value,
    #[serde(default)]
    pub blur_sigma: Option<f32>,
    #[serde(default)]
    pub state: Option<State>,
    #[serde(default)]
    pub condition: Option<Condition>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub conditions: Vec<String>,
}

impl Model {
    pub fn validate(&self) -> Result<()> {
        if self.id.is_empty()
            || self.id.len() > 100
            || !self
                .id
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
        {
            return Err(Error::Invalid(
                "model id must contain only letters, digits, '-' or '_'".into(),
            ));
        }
        if self.input.w == 0
            || self.input.h == 0
            || self.input.w > 4096
            || self.input.h > 4096
            || !matches!(self.input.layout.as_str(), "NCHW" | "NHWC")
            || !matches!(self.input.color.as_str(), "RGB" | "BGR")
            || !matches!(self.input.resize.as_str(), "stretch" | "letterbox")
            || !matches!(self.input.interpolation.as_str(), "bilinear" | "lanczos")
            || !self.input.scale.is_finite()
            || self.input.scale <= 0.0
            || self.input.mean.iter().any(|x| !x.is_finite())
            || self.input.std.iter().any(|x| !x.is_finite() || *x <= 0.0)
            || !matches!(self.output.as_str(), "prob" | "logit")
            || self
                .blur_sigma
                .is_some_and(|s| !s.is_finite() || !(0.0..=64.0).contains(&s))
        {
            return Err(Error::Invalid(format!(
                "invalid preprocessing/output for model {}",
                self.id
            )));
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct ModelSummary {
    pub id: String,
    pub name: String,
    pub tasks: Vec<String>,
    pub license: String,
    pub installed: bool,
    pub size_mb: f64,
    pub citation: String,
    pub benchmark: serde_json::Value,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub conditions: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub condition: Option<Condition>,
}

#[cfg(feature = "native")]
pub struct Registry {
    pub models: Vec<Model>,
    pub dir: PathBuf,
}

#[cfg(feature = "native")]
impl Registry {
    pub fn load() -> Result<Self> {
        let dirs = directories::BaseDirs::new()
            .ok_or_else(|| Error::Invalid("cannot locate data directory".into()))?;
        let json = include_str!(concat!(env!("OUT_DIR"), "/registry.json"));
        let value: serde_json::Value = serde_json::from_str(json)?;
        let models = serde_json::from_value(value.get("models").unwrap_or(&value).clone())?;
        Self::from_models(models, dirs.data_dir().join("glance/models"))
    }

    pub fn from_models(mut models: Vec<Model>, dir: PathBuf) -> Result<Self> {
        fs::create_dir_all(&dir)?;
        for model in &models {
            model.validate()?;
        }
        for entry in fs::read_dir(&dir)? {
            let path = entry?.path();
            if path.extension().is_some_and(|s| s == "json") {
                let model: Model = serde_json::from_slice(&fs::read(path)?)?;
                model.validate()?;
                models.retain(|m| m.id != model.id);
                models.push(model);
            }
        }
        Ok(Self { models, dir })
    }

    pub fn get(&self, id: &str) -> Result<&Model> {
        self.models
            .iter()
            .find(|m| m.id == id)
            .ok_or_else(|| Error::Invalid(format!("unknown model '{id}'; run glance models list")))
    }

    pub fn path(&self, id: &str) -> Result<PathBuf> {
        self.get(id)?.validate()?;
        Ok(self.dir.join(format!("{id}.onnx")))
    }

    pub fn list(&self) -> Vec<ModelSummary> {
        self.models
            .iter()
            .map(|m| ModelSummary {
                id: m.id.clone(),
                name: m.name.clone(),
                tasks: m.tasks.clone(),
                license: m.license.clone(),
                installed: self.dir.join(format!("{}.onnx", m.id)).is_file(),
                size_mb: m.size_mb,
                citation: m.citation.clone(),
                benchmark: m.benchmark.clone(),
                conditions: m.conditions.clone(),
                condition: m.condition.clone(),
            })
            .collect()
    }

    pub fn resolve(&self, id: Option<&str>) -> Result<String> {
        if let Some(id) = id.filter(|s| *s != "default") {
            self.get(id)?;
            return Ok(id.into());
        }
        self.models.iter().find(|m| m.tasks.iter().any(|t| t == "image") && self.dir.join(format!("{}.onnx", m.id)).is_file())
            .map(|m| m.id.clone()).ok_or_else(|| Error::Invalid("no installed image model; run glance models install <id> or models import <file.onnx>".into()))
    }

    pub fn install(&self, id: &str) -> Result<()> {
        self.install_with_progress(id, |_, _| {})
    }

    pub fn install_with_progress(
        &self,
        id: &str,
        mut progress: impl FnMut(u64, Option<u64>),
    ) -> Result<()> {
        let model = self.get(id)?;
        if !model.url.starts_with("https://") || model.sha256.len() != 64 {
            return Err(Error::Invalid(
                "model requires an HTTPS URL and SHA-256 checksum".into(),
            ));
        }
        let path = self.path(id)?;
        let temp = path.with_extension("onnx.download");
        let config = ureq::Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(600)))
            .build();
        let agent: ureq::Agent = config.into();
        let mut dest = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        let result = (|| {
            let mut response = agent.get(&model.url).call()?;
            let total = response
                .headers()
                .get("content-length")
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.parse::<u64>().ok());
            progress(0, total);
            let mut source = response.body_mut().as_reader().take(2_000_000_001);
            let mut hasher = Sha256::new();
            let mut buf = [0u8; 64 * 1024];
            let mut size = 0u64;
            loop {
                let n = source.read(&mut buf)?;
                if n == 0 {
                    break;
                }
                size += n as u64;
                if size > 2_000_000_000 {
                    return Err(Error::Invalid("model download exceeds 2 GB".into()));
                }
                hasher.update(&buf[..n]);
                dest.write_all(&buf[..n])?;
                progress(size, total);
            }
            check_digest(&hex(&hasher.finalize()), &model.sha256)?;
            dest.sync_all()?;
            drop(dest);
            fs::rename(&temp, &path)?;
            Ok(())
        })();
        if result.is_err() {
            let _ = fs::remove_file(temp);
        }
        result
    }

    pub fn import(&mut self, source: &Path, mut model: Model) -> Result<()> {
        model.validate()?;
        if source.extension().is_none_or(|s| s != "onnx") {
            return Err(Error::Invalid("import requires an .onnx file".into()));
        }
        let bytes = fs::read(source)?;
        if bytes.is_empty() {
            return Err(Error::Invalid("empty ONNX model".into()));
        }
        if !model.sha256.is_empty() {
            verify_sha256(&bytes, &model.sha256)?;
        }
        model.sha256 = hex(&Sha256::digest(&bytes));
        let path = self.dir.join(format!("{}.onnx", model.id));
        if path.exists() {
            verify_sha256(&fs::read(&path)?, &model.sha256).map_err(|_| {
                Error::Invalid(format!(
                    "model '{}' already exists with different weights; import under a new id",
                    model.id
                ))
            })?;
        } else {
            fs::write(&path, bytes)?;
        }
        fs::write(
            path.with_extension("json"),
            serde_json::to_vec_pretty(&model)?,
        )?;
        self.models.retain(|m| m.id != model.id);
        self.models.push(model);
        Ok(())
    }
}

#[cfg(feature = "native")]
fn check_digest(actual: &str, expected: &str) -> Result<()> {
    if expected.len() != 64
        || !expected.bytes().all(|b| b.is_ascii_hexdigit())
        || !actual.eq_ignore_ascii_case(expected)
    {
        return Err(Error::Invalid("SHA-256 mismatch; model rejected".into()));
    }
    Ok(())
}

#[cfg(feature = "native")]
pub fn verify_sha256(bytes: &[u8], expected: &str) -> Result<()> {
    check_digest(&hex(&Sha256::digest(bytes)), expected)
}

#[cfg(feature = "native")]
fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
