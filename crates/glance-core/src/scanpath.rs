use crate::metrics::Heatmap;
use serde::{Deserialize, Serialize};

pub const LABEL: &str = "approximation (Itti & Koch 1998 IOR)";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Fixation {
    pub x: f32,
    pub y: f32,
    pub order: usize,
}

pub fn predict(map: &Heatmap) -> Vec<Fixation> {
    let w = map.width as f32;
    let h = map.height as f32;
    let sigma = (0.04 * w).max(1.0);
    let mut scores: Vec<f32> = map
        .values
        .iter()
        .enumerate()
        .map(|(i, &v)| {
            let x = (i % map.width as usize) as f32 + 0.5;
            let y = (i / map.width as usize) as f32 + 0.5;
            v * (0.5
                + 0.5
                    * (-0.5
                        * (((x - w / 2.0) / (w * 0.35)).powi(2)
                            + ((y - h / 2.0) / (h * 0.35)).powi(2)))
                    .exp())
        })
        .collect();
    let mut chosen: Vec<(f32, f32)> = Vec::new();
    for _ in 0..7 {
        let peak = scores
            .iter()
            .enumerate()
            .filter(|(i, _)| {
                let (x, y) = (
                    (*i % map.width as usize) as f32 + 0.5,
                    (*i / map.width as usize) as f32 + 0.5,
                );
                chosen
                    .iter()
                    .all(|&(px, py)| (x - px).hypot(y - py) >= sigma)
            })
            .max_by(|a, b| a.1.total_cmp(b.1));
        let Some((i, _)) = peak else {
            break;
        };
        let (px, py) = (
            (i % map.width as usize) as f32 + 0.5,
            (i / map.width as usize) as f32 + 0.5,
        );
        chosen.push((px, py));
        for (j, score) in scores.iter_mut().enumerate() {
            let dx = (j % map.width as usize) as f32 + 0.5 - px;
            let dy = (j / map.width as usize) as f32 + 0.5 - py;
            *score *= 1.0 - (-(dx * dx + dy * dy) / (2.0 * sigma * sigma)).exp();
        }
    }
    chosen
        .into_iter()
        .enumerate()
        .map(|(i, (x, y))| Fixation {
            x: x / w * 100.0,
            y: y / h * 100.0,
            order: i + 1,
        })
        .collect()
}
