use super::*;
use glance_core::{Engine, registry::Registry};
use ort::{session::Session, value::Tensor};

#[test]
fn native_output_through_wasm_finish_has_identical_metrics_and_layers() {
    let root =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../glance-core/tests/fixtures");
    let model_json = include_str!("../../glance-core/tests/fixtures/fixture.json");
    let model: Model = serde_json::from_str(model_json).unwrap();
    let source =
        image::RgbImage::from_fn(17, 11, |x, y| image::Rgb([x as u8 * 10, y as u8 * 20, 100]));
    let image_bytes = glance_core::render::png(source).unwrap();
    let bytes = image_bytes.as_slice();
    let image = infer::decode(bytes).unwrap();
    let aois_json = r#"[{"id":"left","x":0,"y":0,"width":50,"height":100}]"#;
    let aois = serde_json::from_str::<Vec<Aoi>>(aois_json).unwrap();
    let mut engine = Engine::new(Registry {
        models: vec![model],
        dir: root.clone(),
    })
    .unwrap();
    engine.system.provider = "cpu";
    let native = engine.analyze(&image, Some("fixture"), &aois).unwrap();
    assert!(native.metrics.clarity > 0.0);
    assert!(native.metrics.aoi_share[0].share < 50.0);
    let prepared = prepare(bytes, model_json).unwrap();
    let environment = infer::environment().unwrap();
    let mut session = Session::builder(&environment)
        .unwrap()
        .with_intra_threads(engine.system.threads)
        .unwrap()
        .commit_from_file(root.join("fixture.onnx"))
        .unwrap();
    let input_name = session.inputs()[0].name().to_owned();
    let output = session
        .run(vec![(
            input_name,
            Tensor::from_array((
                prepared
                    .dims
                    .iter()
                    .map(|&d| i64::from(d))
                    .collect::<Vec<_>>(),
                prepared.tensor,
            ))
            .unwrap()
            .into_dyn(),
        )])
        .unwrap();
    let (dims, values) = output[0].try_extract_tensor::<f32>().unwrap();
    let dims: Vec<u32> = dims.iter().map(|&d| d as u32).collect();
    let json = finish(
        values,
        &dims,
        image.width(),
        image.height(),
        model_json,
        aois_json,
        None,
    )
    .unwrap();
    let browser: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert_eq!(json, serde_json::to_string(&native).unwrap());
    assert!(browser.get("squint_png_b64").is_none());
    let delta: serde_json::Value = serde_json::from_str(&compare(&json, &json).unwrap()).unwrap();
    assert_eq!(delta["cc"], 1.0);
    assert_eq!(delta["delta"]["clarity"], 0.0);
    prepare(bytes, model_json).unwrap();
    let squint = complete(
        values,
        &dims,
        image.width(),
        image.height(),
        model_json,
        aois_json,
        true,
    )
    .unwrap();
    assert!(
        serde_json::from_str::<serde_json::Value>(&squint).unwrap()["squint_png_b64"]
            .as_str()
            .unwrap()
            .starts_with("iVBOR")
    );
    assert!(
        complete(
            values,
            &dims,
            image.width(),
            image.height(),
            model_json,
            aois_json,
            false
        )
        .is_err()
    );
    prepare(bytes, model_json).unwrap();
    assert!(
        complete(
            values,
            &dims,
            999,
            image.height(),
            model_json,
            aois_json,
            false
        )
        .is_err()
    );
    assert!(prepare(b"invalid", model_json).is_err());
    assert!(comparison("{}", "{}").is_err());
}
