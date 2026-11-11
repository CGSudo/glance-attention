# GitHub Repository Settings for Glance

This document defines the exact repository settings for `CGSudo/glance-attention`.

---

## 1. About / General

- **Description** (308 / 350 chars):
  ```
  Free, open-source desktop attention prediction (Windows & macOS). Predict where people look in the first ~3s of free viewing. 100% offline, private ONNX inference (SUM, UNISAL, TranSalNet). Transparent research-backed metrics (AUC/CC benchmarks, AOI share, clarity). GUI, CLI, local HTTP API, and MCP agent server.
  ```
- **Website**:
  ```
  https://cgsudo.github.io/glance-attention/
  ```

---

## 2. Repository Topics (Exactly 20)

Add the following 20 comma-separated topics under **Settings** > **General** > **Topics**:

```
eye-tracking, saliency, attention, heatmap, neuromarketing, ux-research, onnx, tauri, rust, figma-plugin, sharex, mcp, offline-first, open-source-alternative, design-tools, cro, visual-attention, computer-vision, desktop-app, privacy
```

---

## 3. Social Preview Upload Steps

1. Navigate to `https://github.com/CGSudo/glance-attention/settings`.
2. In the **General** tab, scroll down to the **Social preview** section.
3. Click **Edit** > **Upload an image...**.
4. Select the pre-rendered image from the repository:
   ```
   .github/social-preview.png
   ```
   *(Dimensions: 1280 × 640 px; PNG format; optimized for Twitter / OpenGraph cards).*
5. Confirm the upload preview and click **Save changes**.

---

## 4. Releases Naming Convention

- **Tag format**: `v{major}.{minor}.{patch}` (e.g. `v0.1.0`).
- **Release title**: `Glance v{version} — {Milestone / Focus}` (e.g. `Glance v0.1.0 — Initial Desktop Release`).
- **Release notes structure**:
  - **Summary**: 3 concise bullet points outlining key user benefits.
  - **Downloads Table**:
    | Platform | Binary | Architecture | Checksum (SHA-256) |
    |---|---|---|---|
    | Windows | `glance-x64-setup.exe` | x86_64 | `[hash]` |
    | macOS (Apple Silicon) | `glance-aarch64.dmg` | arm64 | `[hash]` |
    | macOS (Intel) | `glance-x64.dmg` | x86_64 | `[hash]` |
    | CLI Binary | `glance-cli-{os}.tar.gz` | Universal | `[hash]` |
  - **Security / Gatekeeper Note**: Instructions for running unsigned open-source binaries safely.

---

## 5. GitHub Discussions Categories

Enable GitHub Discussions under **Settings** > **General** > **Features** > **Discussions**. Configure these categories:

1. :mega: **Announcements** *(Discussion format: Announcement, Maintainers only)*: New releases, model registry additions, benchmark evaluations.
2. :speech_balloon: **General** *(Discussion format: Open discussion)*: General conversation, workflow tips, and design critique setups.
3. :bulb: **Ideas** *(Discussion format: Idea voting)*: Feature requests, new integrations (ShareX, Figma, Chrome), and export options.
4. :question: **Q&A** *(Discussion format: Q&A)*: Setup troubleshooting, local API bearer token configuration, and MCP agent tooling help.
5. :microscope: **Research & Science** *(Discussion format: Open discussion)*: Peer-reviewed visual saliency papers, MIT300/SALICON benchmarks, scanpath models, and metric formula evaluations.
6. :tada: **Show and Tell** *(Discussion format: Open discussion)*: Showcase before-and-after design hierarchy comparisons and practical A/B test results.
