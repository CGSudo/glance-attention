use crate::{Error, Result, scanpath::Fixation};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug)]
pub struct Heatmap {
    pub width: u32,
    pub height: u32,
    pub values: Vec<f32>,
}

impl Heatmap {
    pub fn new(width: u32, height: u32, mut values: Vec<f32>) -> Result<Self> {
        if width == 0
            || height == 0
            || u64::from(width) * u64::from(height) != values.len() as u64
            || values.iter().any(|v| !v.is_finite() || *v < 0.0)
        {
            return Err(Error::Invalid(
                "heatmap must have positive dimensions and finite nonnegative pixels".into(),
            ));
        }
        let sum: f64 = values.iter().map(|&x| f64::from(x)).sum();
        if sum <= 0.0 {
            return Err(Error::Invalid("heatmap has zero mass".into()));
        }
        for v in &mut values {
            *v = (f64::from(*v) / sum) as f32;
        }
        Ok(Self {
            width,
            height,
            values,
        })
    }

    pub fn resized(&self, width: u32, height: u32) -> Result<Self> {
        Self::new(
            width,
            height,
            resize_bilinear(&self.values, self.width, self.height, width, height),
        )
    }
}

pub(crate) fn resize_bilinear(values: &[f32], w: u32, h: u32, width: u32, height: u32) -> Vec<f32> {
    let mut out = Vec::with_capacity(width as usize * height as usize);
    for y in 0..height {
        let sy = ((y as f32 + 0.5) * h as f32 / height as f32 - 0.5).clamp(0.0, (h - 1) as f32);
        let y0 = sy as u32;
        let y1 = (y0 + 1).min(h - 1);
        let dy = sy - y0 as f32;
        for x in 0..width {
            let sx = ((x as f32 + 0.5) * w as f32 / width as f32 - 0.5).clamp(0.0, (w - 1) as f32);
            let x0 = sx as u32;
            let x1 = (x0 + 1).min(w - 1);
            let dx = sx - x0 as f32;
            let top =
                values[(y0 * w + x0) as usize] * (1.0 - dx) + values[(y0 * w + x1) as usize] * dx;
            let bottom =
                values[(y1 * w + x0) as usize] * (1.0 - dx) + values[(y1 * w + x1) as usize] * dx;
            out.push(top * (1.0 - dy) + bottom * dy);
        }
    }
    out
}

/// AOI and fixation coordinates use percentages (0–100), matching the desktop canvas.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Aoi {
    pub id: String,
    #[serde(flatten)]
    pub shape: Shape,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum Shape {
    Rect {
        x: f32,
        y: f32,
        width: f32,
        height: f32,
    },
    Polygon {
        points: Vec<[f32; 2]>,
    },
}

impl Aoi {
    pub fn validate(&self) -> Result<()> {
        let valid = match &self.shape {
            Shape::Rect {
                x,
                y,
                width,
                height,
            } => {
                [x, y, width, height]
                    .into_iter()
                    .all(|v| v.is_finite() && (0.0..=100.0).contains(v))
                    && x + width <= 100.0
                    && y + height <= 100.0
                    && *width > 0.0
                    && *height > 0.0
            }
            Shape::Polygon { points } => {
                (3..=1000).contains(&points.len())
                    && points
                        .iter()
                        .flatten()
                        .all(|v| v.is_finite() && (0.0..=100.0).contains(v))
            }
        };
        if !valid || self.id.is_empty() {
            return Err(Error::Invalid(
                "AOI needs an id and valid 0–100 percentage coordinates".into(),
            ));
        }
        Ok(())
    }

    pub fn contains(&self, px: f32, py: f32) -> bool {
        match &self.shape {
            Shape::Rect {
                x,
                y,
                width,
                height,
            } => px >= *x && px < x + width && py >= *y && py < y + height,
            Shape::Polygon { points } => {
                let mut inside = false;
                for (a, b) in points
                    .iter()
                    .zip(points.iter().cycle().skip(1))
                    .take(points.len())
                {
                    if (a[1] > py) != (b[1] > py)
                        && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]
                    {
                        inside = !inside;
                    }
                }
                inside
            }
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AoiShare {
    pub id: String,
    pub share: f32,
}
#[derive(Debug, Serialize)]
pub struct FirstGlance {
    pub id: String,
    pub rank: Option<usize>,
}
#[derive(Debug)]
pub struct Agreement {
    pub std: Heatmap,
    pub mean_cc: f32,
}
#[derive(Debug, Serialize)]
pub struct AoiDelta {
    pub id: String,
    pub delta: f32,
}
#[derive(Debug, Serialize)]
pub struct CompareDelta {
    pub clarity: f32,
    pub aoi_share: Vec<AoiDelta>,
}

pub fn clarity(map: &Heatmap) -> f32 {
    let small = if map.width == 64 && map.height == 64 {
        map.clone()
    } else {
        let Some(buffer) = image::ImageBuffer::<image::Luma<f32>, _>::from_raw(
            map.width,
            map.height,
            map.values.clone(),
        ) else {
            return 0.0;
        };
        let pixels =
            image::imageops::resize(&buffer, 64, 64, image::imageops::FilterType::Triangle)
                .into_raw();
        match Heatmap::new(64, 64, pixels) {
            Ok(small) => small,
            Err(_) => return 0.0,
        }
    };
    let entropy: f64 = small
        .values
        .iter()
        .filter(|&&p| p > 0.0)
        .map(|&p| -f64::from(p) * f64::from(p).ln())
        .sum();
    ((1.0 - entropy / 4096f64.ln()) * 100.0).clamp(0.0, 100.0) as f32
}

pub fn aoi_share(map: &Heatmap, aois: &[Aoi]) -> Vec<AoiShare> {
    aois.iter()
        .map(|aoi| {
            let mass: f64 = map
                .values
                .iter()
                .enumerate()
                .filter(|(i, _)| {
                    let x = (*i % map.width as usize) as f32 + 0.5;
                    let y = (*i / map.width as usize) as f32 + 0.5;
                    aoi.contains(x / map.width as f32 * 100.0, y / map.height as f32 * 100.0)
                })
                .map(|(_, v)| f64::from(*v))
                .sum();
            AoiShare {
                id: aoi.id.clone(),
                share: (mass * 100.0) as f32,
            }
        })
        .collect()
}

pub fn first_glance(path: &[Fixation], aois: &[Aoi]) -> Vec<FirstGlance> {
    aois.iter()
        .map(|aoi| FirstGlance {
            id: aoi.id.clone(),
            rank: path
                .iter()
                .find(|p| aoi.contains(p.x, p.y))
                .map(|p| p.order),
        })
        .collect()
}

pub fn fog_threshold(map: &Heatmap) -> f32 {
    let mut sorted = map.values.clone();
    sorted.sort_unstable_by(f32::total_cmp);
    let mut mass = 0.0;
    for v in sorted {
        mass += v;
        if mass >= 0.25 {
            return v;
        }
    }
    0.0
}

pub fn cc(a: &Heatmap, b: &Heatmap) -> Result<f32> {
    if a.width != b.width || a.height != b.height {
        return Err(Error::Invalid(
            "CC requires matching heatmap dimensions".into(),
        ));
    }
    let ma = a.values.iter().map(|&v| f64::from(v)).sum::<f64>() / a.values.len() as f64;
    let mb = b.values.iter().map(|&v| f64::from(v)).sum::<f64>() / b.values.len() as f64;
    let (mut cov, mut va, mut vb) = (0.0, 0.0, 0.0);
    for (&a, &b) in a.values.iter().zip(&b.values) {
        let (a, b) = (f64::from(a) - ma, f64::from(b) - mb);
        cov += a * b;
        va += a * a;
        vb += b * b;
    }
    if va == 0.0 || vb == 0.0 {
        return Ok(if a.values == b.values { 1.0 } else { 0.0 });
    }
    Ok((cov / (va * vb).sqrt()).clamp(-1.0, 1.0) as f32)
}

pub fn agreement(maps: &[Heatmap]) -> Result<Agreement> {
    if maps.len() < 2 {
        return Err(Error::Invalid(
            "agreement requires at least two models".into(),
        ));
    }
    let first = &maps[0];
    let mut total = 0.0;
    let mut pairs = 0;
    for (i, a) in maps.iter().enumerate() {
        for b in &maps[..i] {
            total += cc(a, b)?;
            pairs += 1;
        }
    }
    let values = (0..first.values.len())
        .map(|i| {
            let mean = maps.iter().map(|m| f64::from(m.values[i])).sum::<f64>() / maps.len() as f64;
            (maps
                .iter()
                .map(|m| (f64::from(m.values[i]) - mean).powi(2))
                .sum::<f64>()
                / maps.len() as f64)
                .sqrt() as f32
        })
        .collect();
    Ok(Agreement {
        std: Heatmap {
            width: first.width,
            height: first.height,
            values,
        },
        mean_cc: total / pairs as f32,
    })
}

pub fn compare(a: &Heatmap, b: &Heatmap, aois: &[Aoi]) -> Result<CompareDelta> {
    let sa = aoi_share(a, aois);
    let sb = aoi_share(b, aois);
    Ok(CompareDelta {
        clarity: clarity(b) - clarity(a),
        aoi_share: sa
            .iter()
            .zip(sb)
            .map(|(a, b)| AoiDelta {
                id: a.id.clone(),
                delta: b.share - a.share,
            })
            .collect(),
    })
}
