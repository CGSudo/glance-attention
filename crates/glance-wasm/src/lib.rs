#![forbid(unsafe_code)]

use glance_core::{
    Error, Result, infer,
    metrics::{self, Aoi, Heatmap},
    registry::Model,
};
use image::{DynamicImage, GenericImageView};
use std::{cell::RefCell, collections::VecDeque};
use wasm_bindgen::prelude::*;

// Retain source pixels for overlays and two full-precision maps for comparison, never image storage.
thread_local! {
    static IMAGE: RefCell<Option<(DynamicImage, String)>> = const { RefCell::new(None) };
    static RESULTS: RefCell<VecDeque<(String, Heatmap, Vec<Aoi>)>> = const { RefCell::new(VecDeque::new()) };
}

#[wasm_bindgen]
pub struct Prepared {
    tensor: Vec<f32>,
    dims: Vec<u32>,
    pub width: u32,
    pub height: u32,
}

#[wasm_bindgen]
impl Prepared {
    #[wasm_bindgen(getter)]
    pub fn tensor(&self) -> Vec<f32> {
        self.tensor.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn dims(&self) -> Vec<u32> {
        self.dims.clone()
    }
}

fn prepare(bytes: &[u8], model_json: &str) -> Result<Prepared> {
    IMAGE.with_borrow_mut(|image| *image = None);
    let model: Model = serde_json::from_str(model_json)?;
    let image = infer::decode(bytes)?;
    let tensor = infer::preprocess(&image, &model)?;
    let dims = if model.input.layout == "NCHW" {
        vec![1, 3, model.input.h, model.input.w]
    } else {
        vec![1, model.input.h, model.input.w, 3]
    };
    let (width, height) = image.dimensions();
    IMAGE.with_borrow_mut(|source| *source = Some((image, model_json.into())));
    Ok(Prepared {
        tensor,
        dims,
        width,
        height,
    })
}

#[wasm_bindgen]
pub fn preprocess(image_bytes: &[u8], model_json: &str) -> std::result::Result<Prepared, JsError> {
    prepare(image_bytes, model_json).map_err(|e| JsError::new(&e.to_string()))
}

fn complete(
    output: &[f32],
    dims: &[u32],
    width: u32,
    height: u32,
    model_json: &str,
    aois_json: &str,
    squint: bool,
) -> Result<String> {
    let (image, prepared_model) = IMAGE
        .with_borrow_mut(Option::take)
        .ok_or_else(|| Error::Invalid("call preprocess before finish".into()))?;
    if image.dimensions() != (width, height) || prepared_model != model_json {
        return Err(Error::Invalid(
            "finish must match the preprocessed image and model".into(),
        ));
    }
    let model: Model = serde_json::from_str(model_json)?;
    let aois: Vec<Aoi> = serde_json::from_str(aois_json)?;
    let dims: Vec<i64> = dims.iter().map(|&d| i64::from(d)).collect();
    let (response, map) = infer::finish(&image, &model, &dims, output, &aois, squint)?;
    let json = serde_json::to_string(&response)?;
    RESULTS.with_borrow_mut(|results| {
        if results.len() == 2 {
            results.pop_front();
        }
        results.push_back((json.clone(), map, aois));
    });
    Ok(json)
}

#[wasm_bindgen]
pub fn finish(
    output: &[f32],
    dims: &[u32],
    width: u32,
    height: u32,
    model_json: &str,
    aois_json: &str,
    layers: Option<String>,
) -> std::result::Result<String, JsError> {
    complete(
        output,
        dims,
        width,
        height,
        model_json,
        aois_json,
        layers.as_deref() == Some("squint"),
    )
    .map_err(|e| JsError::new(&e.to_string()))
}

fn comparison(a_json: &str, b_json: &str) -> Result<String> {
    RESULTS.with_borrow(|results| {
        let find = |json: &str| {
            results
                .iter()
                .find(|(key, _, _)| key == json)
                .ok_or_else(|| {
                    Error::Invalid("compare requires the two latest finish results".into())
                })
        };
        let (_, a, aois) = find(a_json)?;
        let (_, b, _) = find(b_json)?;
        let cc = if (a.width, a.height) == (b.width, b.height) {
            metrics::cc(a, b)?
        } else {
            metrics::cc(a, &b.resized(a.width, a.height)?)?
        };
        Ok(serde_json::to_string(&infer::CompareResponse {
            a: serde_json::from_str(a_json)?,
            b: serde_json::from_str(b_json)?,
            delta: metrics::compare(a, b, aois)?,
            cc,
        })?)
    })
}

#[wasm_bindgen]
pub fn compare(a_json: &str, b_json: &str) -> std::result::Result<String, JsError> {
    comparison(a_json, b_json).map_err(|e| JsError::new(&e.to_string()))
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests;
