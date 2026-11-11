# Glance UI Notes

## Done
- Full React 18 + TS strict + Tailwind + Radix UI + Lucide-react frontend in `app/ui`.
- 8 screens: Home, Analyze, Compare, Video, Models, Batch, Learn, Settings.
- Analyze canvas: zoom/pan, layers (heatmap, gaze order 1-7, fog, uncertainty), opacity slider, AOI draw/rename/delete.
- Metrics panel: Clarity (entropy), AOI share %, first glance rank, ensemble agreement with formula/source popovers.
- Model accuracy cards: raw AUC/CC vs human ceiling bars (AUC 0.934, CC 0.983); unbenchmarked shows "not benchmarked".
- Learn screen: 5-step kid-level explainer with inline SVGs + "what it can't know" boundaries.
- Video: 5 fps scrubber, heatmap overlay, inline SVG AOI share chart. Batch: table, CSV export, PDF report.
- Visuals & A11y: enterprise calm theme, WCAG AA contrast, reduced motion, 3-step onboarding.

## Mocked
- Deterministic canvas saliency engine: luminance contrast + Gaussian blur + Itti & Koch 1998 IOR scanpath.
- Synthetic video frame generator and multi-image batch queue.
- Model catalog state mirroring SPEC `registry.json`.

## Known Gaps
- Rust / Tauri IPC transport: `Transport` interface is tiny and ready for Tauri command wrapper.
- Arbitrary polygon AOIs: UI currently draws rectangular AOIs; polygon support reserved for Tauri v2.
