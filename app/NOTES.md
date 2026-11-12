# Desktop verification

Measured from existing Windows 0.1.0 artifacts, 2026-11-12; not rebuilt in this run.
- NSIS installer: 26,353,966 bytes; MSI: 33,955,840 bytes (both exceed the 25 MB target).
- Idle RAM: unverified.
- UNISAL cold/warm analyze: unverified.
- SUM cold/warm analyze: unverified.
- TranSalNet cold/warm analyze: unverified.
- UNISAL Video cold/warm analyze: unverified.
- Checks: cargo fmt --check; cargo clippy --all-targets -- -D warnings; cargo test; npm run build; npm run lint — passed.
- Untested: fresh installer launch, real-model desktop timings, idle RAM, macOS, GPU execution, video playback.
