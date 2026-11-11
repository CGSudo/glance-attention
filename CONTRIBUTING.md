# Contributing to Glance

Thank you for contributing to Glance. We build honest, free, offline attention-prediction tools for designers and engineers.

---

## Quick Summary

- **Core stack**: Rust (`crates/glance-core`, `crates/glance-cli`) + React/TS/Tailwind (`app/ui`) + Tauri 2 (`app/src-tauri`).
- **Principles**: 100% offline local inference, verifiable peer-reviewed citations, no telemetry, no unvalidated accuracy or emotion claims.
- **Commit style**: [Conventional Commits](https://www.conventionalcommits.org/).

---

## 1. Prerequisites

- **Rust**: 1.75+ (`rustup update stable`)
- **Node.js**: 20+ and npm 10+
- **Python**: 3.10+ (only required if exporting PyTorch models to ONNX)
- **Tauri 2 CLI**: `cargo install tauri-cli --version "^2.0.0"`

---

## 2. Local Setup & Building

### Rust Crates (Core & CLI)

```bash
# Check and build core library and CLI
cargo check --workspace
cargo build --release

# Run Rust unit tests
cargo test --workspace
```

### Desktop UI (`app/ui`)

```bash
cd app/ui
npm install
npm run build
```

### Desktop App (Tauri 2)

```bash
# Run desktop development build
cargo tauri dev
```

---

## 3. Model Export (PyTorch → ONNX)

Models in Glance are distributed as standalone ONNX files with strict SHA-256 validation.

To export or verify parity for a model:

```bash
cd tools/export
python -m venv .venv
# activate venv (.venv\Scripts\activate on Windows, source .venv/bin/activate on Unix)
pip install -r requirements.txt

# Export a specific model (e.g. SUM)
python export_sum.py --weights path/to/weights.pth --out ../../models/sum.onnx

# Verify parity between PyTorch and ONNX (must satisfy max abs diff < 1e-3)
python check_parity.py --onnx ../../models/sum.onnx --samples ../../samples/
```

> **License note**: Only models with open redistribution licenses (MIT, Apache-2.0, CC-BY) may be added to `models/registry.json`. Proprietary or unreleased models must remain "Bring Your Own ONNX" user imports.

---

## 4. Testing & Verification

Always run test suites before opening a pull request:

```bash
# 1. Rust unit and integration tests
cargo test --workspace

# 2. UI typecheck & build
cd app/ui && npm run build

# 3. Documentation link verification
cd docs && node check-links.mjs
```

---

## 5. Commit Guidelines

We use **Conventional Commits**:

- `feat(scope)`: new feature (e.g., `feat(cli): add batch export to CSV`)
- `fix(scope)`: bug fix (e.g., `fix(core): correct CC metric denominator when variance is zero`)
- `docs(scope)`: documentation updates (e.g., `docs(science): clarify NSS human ceiling calculation`)
- `perf(scope)`: performance improvements (e.g., `perf(onnx): enable parallel execution providers`)
- `refactor(scope)`: code refactoring without behavior change
- `test(scope)`: adding or updating tests

Keep commit messages concise and imperative ("add...", "fix...").

---

## 6. Code Review Standards

- **Privacy**: No external network requests during image analysis. Local API must only bind `127.0.0.1`.
- **Honesty**: Show raw benchmark metrics alongside published human ceilings. Never label a metric as "94% accurate".
- **Minimal Dependencies**: Prefer standard library and established lightweight crates. Avoid heavy, speculative dependencies.
