# Security Policy

## Reporting Security Vulnerabilities

Please **do not report security vulnerabilities via public GitHub issues**.

To report a vulnerability privately, use [GitHub Security Advisories](https://github.com/CGSudo/glance-attention/security/advisories/new).

The maintainers will acknowledge receipt within 48 hours and provide a timeline for remediation.

---

## Architectural Security Model

Glance is designed as an offline-first desktop tool with a strictly defined security perimeter:

### 1. Local-Only Network Binding
The local HTTP API (`glance serve`) binds strictly to `127.0.0.1` (loopback). It must **never** bind to `0.0.0.0` or expose services to the local network.

### 2. Bearer Token Authentication
All local API endpoints require an `Authorization: Bearer <token>` header. The token is generated locally and stored with restricted file permissions in `~/.glance/token`.

### 3. Zero Telemetry & Air-Gapped Analysis
Images and visual inputs processed by Glance are analyzed in-memory or on local disk. No image data, hashes, or analytical telemetry are ever transmitted to any remote server.

### 4. Model Integrity Verification
Pre-trained model artifacts are verified against cryptographic SHA-256 checksums defined in `models/registry.json` prior to execution in the ONNX runtime. Unverified or mismatched weights are rejected.

---

## Supported Versions

| Version | Supported |
|---|---|
| `0.1.x` | :white_check_mark: |
| `< 0.1.0` | :x: |
