#![forbid(unsafe_code)]

mod mcp;

use glance_cli::server;

use anyhow::{Context, Result, bail};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use clap::{Args, Parser, Subcommand};
use glance_core::{
    Engine,
    infer::{ContentType, read_image},
    metrics::Aoi,
    registry::{Model, Registry},
};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Parser)]
#[command(
    name = "glance",
    version,
    about = "Predict visual attention locally. Start: glance models list"
)]
pub struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Show execution provider, hardware, and recommended model as JSON.
    Doctor,
    /// Analyze an image; save heatmap, overlay, fog and JSON.
    Analyze {
        image: PathBuf,
        #[command(flatten)]
        options: AnalysisOptions,
        #[arg(long)]
        open: bool,
    },
    /// Compare attention for images A and B; deltas are B minus A.
    Compare {
        a: PathBuf,
        b: PathBuf,
        #[command(flatten)]
        options: AnalysisOptions,
    },
    /// Analyze ordered image frames, sampled at 5 fps.
    Video {
        #[arg(long)]
        frames: PathBuf,
        #[command(flatten)]
        options: AnalysisOptions,
    },
    /// List, download, or import ONNX models.
    Models {
        #[command(subcommand)]
        command: ModelCommand,
    },
    /// Serve authenticated HTTP API at 127.0.0.1:7878.
    Serve,
    /// Serve MCP tools over stdin/stdout.
    Mcp,
}

#[derive(Args)]
struct AnalysisOptions {
    #[arg(long)]
    model: Option<String>,
    /// SUM content condition. Other models ignore it.
    #[arg(long, default_value = "natural")]
    content_type: ContentType,
    /// AOI JSON file; coordinates are percentages from 0 to 100.
    #[arg(long)]
    aoi: Option<PathBuf>,
    #[arg(long, default_value = "out")]
    out: PathBuf,
    /// Print the exact API response as JSON.
    #[arg(long)]
    json: bool,
}

#[derive(Subcommand)]
enum ModelCommand {
    List,
    Install {
        id: String,
    },
    /// Import ONNX with metadata; defaults to neighboring .json sidecar.
    Import {
        path: PathBuf,
        #[arg(long)]
        sidecar: Option<PathBuf>,
    },
}

fn aois(path: Option<&Path>) -> Result<Vec<Aoi>> {
    let aois = path
        .map(|p| -> Result<Vec<Aoi>> {
            Ok(serde_json::from_slice(
                &fs::read(p).with_context(|| format!("read AOIs: {}", p.display()))?,
            )?)
        })
        .transpose()?
        .unwrap_or_default();
    glance_core::infer::validate_aois(&aois)?;
    Ok(aois)
}

fn save_analysis(result: &glance_core::AnalyzeResponse, out: &Path) -> Result<()> {
    fs::create_dir_all(out)?;
    for (name, data) in [
        ("heatmap.png", &result.heatmap_png_b64),
        ("overlay.png", &result.overlay_png_b64),
        ("fog.png", &result.fog_png_b64),
    ] {
        fs::write(out.join(name), STANDARD.decode(data)?)?;
    }
    if let Some(agreement) = &result.metrics.agreement {
        fs::write(
            out.join("uncertainty.png"),
            STANDARD.decode(&agreement.uncertainty_png_b64)?,
        )?;
    }
    fs::write(
        out.join("analysis.json"),
        serde_json::to_vec_pretty(result)?,
    )?;
    Ok(())
}

fn open_image(path: &Path) -> Result<()> {
    let path = path.canonicalize()?;
    #[cfg(target_os = "windows")]
    let status = Command::new("rundll32.exe")
        .arg("url.dll,FileProtocolHandler")
        .arg(&path)
        .status()?;
    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg(&path).status()?;
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let status = Command::new("xdg-open").arg(&path).status()?;
    if !status.success() {
        bail!("could not open overlay: {}", path.display());
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let mut engine = Engine::new(Registry::load()?)?;
    match cli.command {
        Commands::Doctor => println!("{}", serde_json::to_string_pretty(&engine.system)?),
        Commands::Analyze {
            image,
            options,
            open,
        } => {
            let regions = aois(options.aoi.as_deref())?;
            let result = engine.analyze_path_with_content_type(
                &image,
                options.model.as_deref(),
                &regions,
                options.content_type,
            )?;
            save_analysis(&result, &options.out)?;
            if options.json {
                println!("{}", serde_json::to_string(&result)?);
            } else {
                println!(
                    "Clarity: {:.1}/100 | {} | {}",
                    result.metrics.clarity,
                    result.model,
                    options.out.join("overlay.png").display()
                );
                eprintln!("Scanpath: {}", glance_core::scanpath::LABEL);
            }
            if open {
                open_image(&options.out.join("overlay.png"))?;
            }
        }
        Commands::Compare { a, b, options } => {
            let result = engine.compare_with_content_type(
                &read_image(&a)?,
                &read_image(&b)?,
                options.model.as_deref(),
                &aois(options.aoi.as_deref())?,
                options.content_type,
            )?;
            save_analysis(&result.a, &options.out.join("a"))?;
            save_analysis(&result.b, &options.out.join("b"))?;
            fs::write(
                options.out.join("compare.json"),
                serde_json::to_vec_pretty(&result)?,
            )?;
            if options.json {
                println!("{}", serde_json::to_string(&result)?);
            } else {
                println!(
                    "Clarity Δ: {:+.1} | CC: {:.3} | {}",
                    result.delta.clarity,
                    result.cc,
                    options.out.join("compare.json").display()
                );
            }
        }
        Commands::Video { frames, options } => {
            let result = engine.video_dir(
                &frames,
                options.model.as_deref(),
                &aois(options.aoi.as_deref())?,
            )?;
            fs::create_dir_all(&options.out)?;
            for (i, frame) in result.frames.iter().enumerate() {
                fs::write(
                    options.out.join(format!("{i:06}.png")),
                    STANDARD.decode(&frame.heatmap_png_b64)?,
                )?;
            }
            fs::write(
                options.out.join("video.json"),
                serde_json::to_vec_pretty(&result)?,
            )?;
            if options.json {
                println!("{}", serde_json::to_string(&result)?);
            } else {
                println!(
                    "{} frames | 5 fps | {}",
                    result.frames.len(),
                    options.out.join("video.json").display()
                );
            }
        }
        Commands::Models { command } => match command {
            ModelCommand::List => println!("{}", serde_json::to_string(&engine.registry.list())?),
            ModelCommand::Install { id } => {
                engine.registry.install(&id)?;
                println!("{{\"ok\":true}}");
            }
            ModelCommand::Import { path, sidecar } => {
                let sidecar = sidecar.unwrap_or_else(|| path.with_extension("json"));
                let model: Model = serde_json::from_slice(
                    &fs::read(&sidecar)
                        .with_context(|| format!("read model sidecar: {}", sidecar.display()))?,
                )?;
                engine.registry.import(&path, model)?;
                println!("{{\"ok\":true}}");
            }
        },
        Commands::Serve => server::serve(engine).await?,
        Commands::Mcp => {
            eprintln!("Warming default model");
            engine.warmup()?;
            mcp::serve(&mut engine)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_has_no_public_bind_option() {
        assert!(Cli::try_parse_from(["glance", "serve", "--host", "0.0.0.0"]).is_err());
    }
}
