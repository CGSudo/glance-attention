use glance_core::{
    Engine,
    metrics::{self, Aoi, Heatmap},
    registry::{Model, Registry},
    scanpath,
};

fn map(w: u32, h: u32, values: Vec<f32>) -> Heatmap {
    Heatmap::new(w, h, values).unwrap()
}

#[test]
fn metrics_match_hand_calculations() {
    let uniform = map(64, 64, vec![1.0; 4096]);
    let mut values = vec![0.0; 4096];
    values[0] = 1.0;
    let peak = map(64, 64, values);
    assert!(metrics::clarity(&uniform).abs() < 0.001);
    assert!((metrics::clarity(&peak) - 100.0).abs() < 0.001);
    let a = map(2, 2, vec![1.0, 2.0, 3.0, 4.0]);
    let b = map(2, 2, vec![4.0, 3.0, 2.0, 1.0]);
    let aois: Vec<Aoi> =
        serde_json::from_str(r#"[{"id":"left","x":0,"y":0,"width":50,"height":100}]"#).unwrap();
    assert!((metrics::aoi_share(&a, &aois)[0].share - 40.0).abs() < 0.001);
    assert!((metrics::cc(&a, &b).unwrap() + 1.0).abs() < 0.001);
    let agreement = metrics::agreement(&[a.clone(), b.clone()]).unwrap();
    assert!((agreement.mean_cc + 1.0).abs() < 0.001);
    assert!((agreement.std.values[0] - 0.15).abs() < 0.001);
    assert!((agreement.std.values[1] - 0.05).abs() < 0.001);
    let delta = metrics::compare(&a, &b, &aois).unwrap();
    assert!((delta.aoi_share[0].delta - 20.0).abs() < 0.001);
    assert!(delta.clarity.abs() < 0.001);
    assert!((metrics::fog_threshold(&a) - 0.2).abs() < 0.001);
    let points = vec![
        scanpath::Fixation {
            x: 75.0,
            y: 25.0,
            order: 1,
        },
        scanpath::Fixation {
            x: 25.0,
            y: 25.0,
            order: 2,
        },
    ];
    assert_eq!(metrics::first_glance(&points, &aois)[0].rank, Some(2));
}

#[test]
fn scanpath_respects_inhibition_radius() {
    let heatmap = map(100, 80, vec![1.0; 8000]);
    let path = scanpath::predict(&heatmap);
    assert_eq!(path.len(), 7);
    for (i, a) in path.iter().enumerate() {
        for b in &path[..i] {
            let dx = a.x - b.x;
            let dy = (a.y - b.y) * 0.8;
            assert!(dx.hypot(dy) >= 4.0 - 0.001);
        }
    }
}

#[test]
fn checksum_mismatch_is_rejected() {
    assert!(glance_core::registry::verify_sha256(b"abc", &"0".repeat(64)).is_err());
    assert!(
        glance_core::registry::verify_sha256(
            b"abc",
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        )
        .is_ok()
    );
}

#[test]
fn clarity_downsampling_preserves_isolated_mass() {
    let mut values = vec![0.0; 1_000_000];
    values[500_500] = 1.0;
    assert!(metrics::clarity(&map(1000, 1000, values)) > 80.0);
}

#[test]
fn video_carries_state_and_resets_each_sequence() {
    let dir = std::env::temp_dir().join(format!("glance-video-test-{}", std::process::id()));
    let mut model: Model = serde_json::from_str(include_str!("fixtures/fixture.json")).unwrap();
    model.id = "fixture_video".into();
    model.tasks = vec!["video".into()];
    let mut registry = Registry::from_models(vec![], dir.clone()).unwrap();
    registry
        .import(
            std::path::Path::new(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/tests/fixtures/fixture_video.onnx"
            )),
            model,
        )
        .unwrap();
    let mut engine = Engine::new(registry).unwrap();
    let image = image::DynamicImage::ImageRgb8(image::RgbImage::from_fn(8, 8, |x, y| {
        image::Rgb([x as u8 * 30, y as u8 * 30, 100])
    }));
    let run = |engine: &mut Engine| {
        engine
            .video_images([Ok(image.clone()), Ok(image.clone())], None, &[])
            .unwrap()
    };
    let a = run(&mut engine);
    let b = run(&mut engine);
    assert_eq!(a.fps, 5);
    assert_eq!(a.frames[1].t, 0.2);
    assert_ne!(a.frames[0].heatmap_png_b64, a.frames[1].heatmap_png_b64);
    assert_eq!(a.frames[0].heatmap_png_b64, b.frames[0].heatmap_png_b64);
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn fixture_analyze_has_original_shape_and_normalized_mass() {
    let dir = std::env::temp_dir().join(format!("glance-test-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let model: Model = serde_json::from_str(include_str!("fixtures/fixture.json")).unwrap();
    let mut registry = Registry::from_models(vec![], dir.clone()).unwrap();
    registry
        .import(
            std::path::Path::new(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/tests/fixtures/fixture.onnx"
            )),
            model,
        )
        .unwrap();
    let mut engine = Engine::new(registry).unwrap();
    let image = image::DynamicImage::ImageRgb8(image::RgbImage::from_fn(17, 11, |x, y| {
        image::Rgb([x as u8 * 10, y as u8 * 20, 100])
    }));
    let heatmap = engine.infer(&image, "fixture").unwrap();
    assert_eq!(
        (heatmap.width, heatmap.height, heatmap.values.len()),
        (17, 11, 187)
    );
    assert!((heatmap.values.iter().sum::<f32>() - 1.0).abs() < 1e-5);
    assert!(heatmap.values.iter().all(|v| v.is_finite() && *v >= 0.0));
    let result = engine.analyze(&image, Some("fixture"), &[]).unwrap();
    assert_eq!(result.scanpath.len(), 7);
    assert!(!result.overlay_png_b64.is_empty());
    assert!(engine.analyze_bytes(b"invalid image", None, &[]).is_err());
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
#[ignore = "requires models/unisal.onnx and samples/expected/unisal"]
fn real_unisal_matches_pytorch_samples() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let models: Vec<Model> =
        serde_json::from_slice(&std::fs::read(root.join("models/registry.json")).unwrap()).unwrap();
    let registry = Registry {
        models,
        dir: root.join("models"),
    };
    let mut engine = Engine::new(registry).unwrap();
    let mut paths = std::fs::read_dir(root.join("samples"))
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .filter(|path| path.extension().is_some_and(|extension| extension == "png"))
        .collect::<Vec<_>>();
    paths.sort();
    assert!(!paths.is_empty(), "samples/*.png missing");
    for path in paths {
        let image = glance_core::infer::read_image(&path).unwrap();
        let start = std::time::Instant::now();
        let map = engine.infer(&image, "unisal").unwrap();
        let elapsed = start.elapsed();
        assert!((map.values.iter().map(|&v| f64::from(v)).sum::<f64>() - 1.0).abs() < 1e-5);
        let expected = image::open(
            root.join("samples/expected/unisal")
                .join(path.file_name().unwrap()),
        )
        .unwrap()
        .to_luma16();
        let expected = Heatmap::new(
            expected.width(),
            expected.height(),
            expected.into_raw().into_iter().map(f32::from).collect(),
        )
        .unwrap();
        let cc = metrics::cc(&map, &expected).unwrap();
        eprintln!(
            "{} provider={} inference_ms={:.1} CC={cc:.6}",
            path.display(),
            engine.system.provider,
            elapsed.as_secs_f64() * 1000.0
        );
        assert!(cc > 0.99, "{} CC={cc}", path.display());
    }
    let image = glance_core::infer::read_image(&root.join("samples/product.png")).unwrap();
    let mut timings = Vec::new();
    for _ in 0..3 {
        let start = std::time::Instant::now();
        engine.infer(&image, "unisal").unwrap();
        timings.push(start.elapsed().as_secs_f64() * 1000.0);
    }
    timings.sort_by(f64::total_cmp);
    eprintln!(
        "UNISAL provider={} threads={} warmed_median_ms={:.1} (3 runs; preprocess + inference + postprocess)",
        engine.system.provider, engine.system.threads, timings[1]
    );
}
