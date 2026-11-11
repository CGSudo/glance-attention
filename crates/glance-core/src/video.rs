use crate::{
    Engine, Error, Result,
    infer::{ContentType, read_image, validate_aois},
    metrics::{self, Aoi, AoiShare},
    render,
};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use image::DynamicImage;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct VideoFrame {
    pub t: f32,
    pub heatmap_png_b64: String,
    pub aoi_share: Vec<AoiShare>,
}
#[derive(Debug, Serialize)]
pub struct VideoResponse {
    pub fps: u32,
    pub frames: Vec<VideoFrame>,
}

impl Engine {
    pub fn video_model(&self, model: Option<&str>) -> Result<String> {
        if let Some(id) = model.filter(|s| *s != "default") {
            let video_id = format!("{id}_video");
            if self
                .registry
                .list()
                .iter()
                .any(|m| m.id == video_id && m.installed)
            {
                return Ok(video_id);
            }
            self.registry.get(id)?;
            return Ok(id.into());
        }
        self.registry
            .list()
            .iter()
            .find(|m| m.id.ends_with("_video") && m.installed)
            .map(|m| m.id.clone())
            .map(Ok)
            .unwrap_or_else(|| self.registry.resolve(None))
    }

    pub fn video_images(
        &mut self,
        images: impl IntoIterator<Item = Result<DynamicImage>>,
        model: Option<&str>,
        aois: &[Aoi],
    ) -> Result<VideoResponse> {
        validate_aois(aois)?;
        let id = self.video_model(model)?;
        self.reset_temporal(&id);
        let temporal = self.registry.get(&id)?.tasks.iter().any(|t| t == "video");
        let mut frames = Vec::new();
        for (i, image) in images.into_iter().enumerate() {
            let map = self.infer_frame(&image?, &id, temporal, ContentType::Natural)?;
            frames.push(VideoFrame {
                t: i as f32 / 5.0,
                heatmap_png_b64: STANDARD.encode(render::heatmap(&map)?),
                aoi_share: metrics::aoi_share(&map, aois),
            });
        }
        self.reset_temporal(&id);
        if frames.is_empty() {
            return Err(Error::Invalid(
                "no image frames supplied; export frames at 5 fps".into(),
            ));
        }
        Ok(VideoResponse { fps: 5, frames })
    }

    pub fn video_dir(
        &mut self,
        dir: &Path,
        model: Option<&str>,
        aois: &[Aoi],
    ) -> Result<VideoResponse> {
        let mut paths = std::fs::read_dir(dir)?
            .map(|e| e.map(|e| e.path()))
            .collect::<std::io::Result<Vec<_>>>()?;
        paths.retain(|p| {
            p.is_file()
                && p.extension().is_some_and(|s| {
                    matches!(
                        s.to_ascii_lowercase().to_str(),
                        Some("png" | "jpg" | "jpeg" | "webp")
                    )
                })
        });
        paths.sort();
        self.video_images(paths.iter().map(|p| read_image(p)), model, aois)
    }
}
