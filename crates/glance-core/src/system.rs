use crate::{Error, Result};
use ort::{
    environment::Environment,
    ep::ExecutionProviderDispatch,
    session::{Session, builder::SessionBuilder},
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize)]
pub struct SystemInfo {
    pub provider: &'static str,
    pub cpu: String,
    pub threads: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu_name: Option<String>,
    pub recommended_model: &'static str,
}

pub(crate) fn providers() -> Vec<(&'static str, ExecutionProviderDispatch)> {
    vec![
        #[cfg(all(feature = "cuda", any(target_os = "windows", target_os = "linux")))]
        ("cuda", ort::ep::CUDA::default().build()),
        #[cfg(all(feature = "directml", target_os = "windows"))]
        ("directml", ort::ep::DirectML::default().build()),
        #[cfg(all(feature = "coreml", target_os = "macos"))]
        ("coreml", ort::ep::CoreML::default().build()),
    ]
}

pub(crate) fn builder(
    env: &Environment,
    threads: usize,
    provider: Option<(&str, &ExecutionProviderDispatch)>,
) -> Result<SessionBuilder> {
    let mut builder = Session::builder(env)?
        .with_intra_threads(threads)
        .map_err(|e| Error::Invalid(e.to_string()))?;
    if let Some((name, provider)) = provider {
        if name == "directml" {
            builder = builder
                .with_memory_pattern(false)
                .map_err(|e| Error::Invalid(e.to_string()))?
                .with_parallel_execution(false)
                .map_err(|e| Error::Invalid(e.to_string()))?;
        }
        provider.register(&mut builder)?;
    }
    Ok(builder)
}

impl SystemInfo {
    pub(crate) fn detect(env: &Environment) -> Self {
        let threads = std::thread::available_parallelism().map_or(1, |n| n.get().min(2));
        let provider = providers()
            .into_iter()
            .find(|(name, ep)| builder(env, threads, Some((name, ep))).is_ok())
            .map_or("cpu", |(name, _)| name);
        let cpu = cpu_name();
        Self {
            provider,
            cpu,
            threads,
            gpu_name: gpu_name(),
            recommended_model: recommendation(provider),
        }
    }

    pub(crate) fn set_provider(&mut self, provider: &'static str) {
        self.provider = provider;
        self.recommended_model = recommendation(provider);
    }
}

fn recommendation(provider: &str) -> &'static str {
    // SUM's scan Loop fails on DirectML (Intel iGPU) and CoreML is unverified; only CUDA is proven fast.
    if provider == "cuda" { "sum" } else { "unisal" }
}

fn cpu_name() -> String {
    if let Ok(cpu) = std::env::var("PROCESSOR_IDENTIFIER") {
        return cpu;
    }
    #[cfg(target_os = "linux")]
    if let Ok(info) = std::fs::read_to_string("/proc/cpuinfo")
        && let Some(name) = info.lines().find_map(|line| {
            line.strip_prefix("model name")
                .and_then(|s| s.split_once(':'))
                .map(|(_, name)| name.trim())
        })
    {
        return name.into();
    }
    #[cfg(target_os = "macos")]
    if let Ok(output) = std::process::Command::new("sysctl")
        .args(["-n", "machdep.cpu.brand_string"])
        .output()
        && output.status.success()
    {
        return String::from_utf8_lossy(&output.stdout).trim().into();
    }
    std::env::consts::ARCH.into()
}

fn gpu_name() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let output = std::process::Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name",
            ])
            .creation_flags(0x08000000)
            .output()
            .ok()?;
        let name = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        if output.status.success() && !name.is_empty() {
            return Some(name);
        }
    }
    None
}

#[derive(Clone, Default, Deserialize, Serialize)]
pub struct Config {
    pub default_model: Option<String>,
}

fn config_path() -> Result<std::path::PathBuf> {
    let dirs = directories::BaseDirs::new()
        .ok_or_else(|| Error::Invalid("cannot locate config directory".into()))?;
    Ok(dirs.config_dir().join("glance/config.json"))
}

pub fn get_config() -> Result<Config> {
    match std::fs::read(config_path()?) {
        Ok(bytes) => Ok(serde_json::from_slice(&bytes)?),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Config::default()),
        Err(e) => Err(e.into()),
    }
}

pub(crate) fn save_config(config: &Config) -> Result<()> {
    let path = config_path()?;
    std::fs::create_dir_all(path.parent().expect("config parent exists"))?;
    let temp = path.with_extension(format!("{}.tmp", std::process::id()));
    std::fs::write(&temp, serde_json::to_vec_pretty(config)?)?;
    let result = std::fs::rename(&temp, path);
    if result.is_err() {
        let _ = std::fs::remove_file(temp);
    }
    result.map_err(Error::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recommendation_tracks_provider() {
        assert_eq!(recommendation("cuda"), "sum");
        for provider in ["cpu", "directml", "coreml"] {
            assert_eq!(recommendation(provider), "unisal");
        }
    }

    #[test]
    fn config_accepts_optional_default_and_rejects_invalid_type() {
        assert_eq!(
            serde_json::from_str::<Config>(r#"{"default_model":"sum"}"#)
                .unwrap()
                .default_model
                .as_deref(),
            Some("sum")
        );
        assert!(
            serde_json::from_str::<Config>("{}")
                .unwrap()
                .default_model
                .is_none()
        );
        assert!(serde_json::from_str::<Config>(r#"{"default_model":4}"#).is_err());
    }
}
