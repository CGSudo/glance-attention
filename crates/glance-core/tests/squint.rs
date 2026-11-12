#[test]
fn squint_fixture_is_normalized_grayscale_and_blurred() {
    let image = image::load_from_memory(include_bytes!("fixtures/input.png")).unwrap();
    let bytes = glance_core::render::squint(&image, image.width() as f32 * 0.02).unwrap();
    let output = image::load_from_memory(&bytes).unwrap().to_rgb8();
    assert_eq!(output.dimensions(), (image.width(), image.height()));
    assert!(output.pixels().all(|p| p[0] == p[1] && p[1] == p[2]));
    let large = image.resize_exact(100, 60, image::imageops::FilterType::Nearest);
    let large_output = image::load_from_memory(&glance_core::squint(&large, 2.0).unwrap())
        .unwrap()
        .to_rgb8();
    assert!(
        large_output.pixels().all(|p| p[0] == 117),
        "large flat image must stay flat"
    );
    for (width, height) in [(1, 1), (1, 100), (100, 1), (3, 2)] {
        let thin = image.resize_exact(width, height, image::imageops::FilterType::Nearest);
        let output = image::load_from_memory(&glance_core::squint(&thin, 2.0).unwrap())
            .unwrap()
            .to_rgb8();
        assert!(
            output.pixels().all(|p| p[0] == 117),
            "flat {width}x{height} must stay flat"
        );
    }
    assert!(
        output.pixels().all(|p| p[0] == 117),
        "flat Rec.709 luma must stay flat after blur: source={:?}, output={:?}",
        image.to_rgb8(),
        output
    );
    let edge = image::DynamicImage::ImageRgb8(image::RgbImage::from_fn(100, 10, |x, _| {
        image::Rgb([if x < 50 { 0 } else { 255 }; 3])
    }));
    let blurred = image::load_from_memory(&glance_core::render::squint(&edge, 2.0).unwrap())
        .unwrap()
        .to_rgb8();
    assert!((1..255).contains(&blurred.get_pixel(49, 5)[0]));
    assert_eq!(blurred.pixels().map(|p| p[0]).min(), Some(0));
    assert_eq!(blurred.pixels().map(|p| p[0]).max(), Some(255));
    assert!(glance_core::render::squint(&image, f32::NAN).is_err());
}
