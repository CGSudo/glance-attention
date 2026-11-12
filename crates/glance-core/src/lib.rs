#![forbid(unsafe_code)]

pub mod infer;
pub mod metrics;
pub mod registry;
pub mod render;
pub mod scanpath;
#[cfg(feature = "native")]
pub mod system;
#[cfg(feature = "native")]
pub mod video;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Invalid(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Image(#[from] image::ImageError),
    #[error(transparent)]
    #[cfg(feature = "native")]
    Ort(#[from] ort::Error),
    #[error(transparent)]
    #[cfg(feature = "native")]
    Download(#[from] ureq::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
pub use infer::AnalyzeResponse;
#[cfg(feature = "native")]
pub use infer::Engine;
pub use render::squint;
