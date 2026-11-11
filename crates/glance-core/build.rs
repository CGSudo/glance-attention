use std::{env, fs, path::PathBuf};

fn main() {
    let registry = PathBuf::from("../../models/registry.json");
    println!("cargo:rerun-if-changed={}", registry.display());
    let json = match fs::read_to_string(&registry) {
        Ok(json) => json,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => "[]".into(),
        Err(e) => panic!("cannot read model registry: {e}"),
    };
    fs::write(
        PathBuf::from(env::var_os("OUT_DIR").expect("Cargo OUT_DIR")).join("registry.json"),
        json,
    )
    .expect("write embedded registry");
}
