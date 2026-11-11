use crate::{
    Result,
    metrics::{Heatmap, fog_threshold},
};
use image::{DynamicImage, ImageFormat, Rgb, RgbImage};
use std::io::Cursor;

fn color(v: f32) -> [u8; 3] {
    const LUT: [[u8; 3]; 9] = [
        [0, 0, 4],
        [31, 12, 72],
        [85, 15, 109],
        [136, 34, 106],
        [186, 54, 85],
        [227, 89, 51],
        [249, 140, 10],
        [249, 201, 50],
        [252, 255, 164],
    ];
    let t = v.clamp(0.0, 1.0) * 8.0;
    let i = (t as usize).min(7);
    std::array::from_fn(|c| {
        (f32::from(LUT[i][c]) * (1.0 - (t - i as f32)) + f32::from(LUT[i + 1][c]) * (t - i as f32))
            as u8
    })
}

pub fn png(image: RgbImage) -> Result<Vec<u8>> {
    let mut out = Cursor::new(Vec::new());
    DynamicImage::ImageRgb8(image).write_to(&mut out, ImageFormat::Png)?;
    Ok(out.into_inner())
}

pub fn heatmap(map: &Heatmap) -> Result<Vec<u8>> {
    let max = map
        .values
        .iter()
        .copied()
        .fold(0.0, f32::max)
        .max(f32::MIN_POSITIVE);
    png(RgbImage::from_fn(map.width, map.height, |x, y| {
        Rgb(color(map.values[(y * map.width + x) as usize] / max))
    }))
}

pub fn overlay(image: &DynamicImage, map: &Heatmap) -> Result<Vec<u8>> {
    let src = image.to_rgb8();
    let max = map
        .values
        .iter()
        .copied()
        .fold(0.0, f32::max)
        .max(f32::MIN_POSITIVE);
    png(RgbImage::from_fn(map.width, map.height, |x, y| {
        let v = map.values[(y * map.width + x) as usize] / max;
        let c = color(v);
        let p = src.get_pixel(x, y);
        let alpha = 0.6 * v;
        Rgb(std::array::from_fn(|i| {
            (f32::from(p[i]) * (1.0 - alpha) + f32::from(c[i]) * alpha) as u8
        }))
    }))
}

pub fn fog(image: &DynamicImage, map: &Heatmap) -> Result<Vec<u8>> {
    let src = image.to_rgb8();
    let threshold = fog_threshold(map);
    png(RgbImage::from_fn(map.width, map.height, |x, y| {
        let p = src.get_pixel(x, y);
        let dim = if map.values[(y * map.width + x) as usize] < threshold {
            0.2
        } else {
            1.0
        };
        Rgb(std::array::from_fn(|i| (f32::from(p[i]) * dim) as u8))
    }))
}
