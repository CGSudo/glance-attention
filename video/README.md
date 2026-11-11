# Glance Intro Film

48-second animated explainer (1920x1080, 30 fps) for the Glance README and docs.
Single continuous camera: shapes, colors, and camera moves morph without cuts.

## Quick Start (3 Steps)

1. **Preview in browser:**
   ```bash
   npm run dev
   ```
2. **Render all deliverables:**
   ```bash
   node render.mjs
   ```
   Outputs to `assets/video/`:
   - `glance-intro.mp4` (H.264, <= 10 MB)
   - `glance-intro.webm` (VP9, <= 8 MB)
   - `glance-intro-poster.png` (Keyframe from Beat 5)
   - `glance-intro-preview.gif` (960x540, 12 fps, <= 8 MB)
   - `stills/beat-1..6.png` (Review stills for each beat)

3. **Verify deliverables and file sizes:**
   ```bash
   node check.mjs
   ```

## Editing Code

- `src/GlanceIntro.tsx`: Camera choreography, layouts, kinetic captions, overlays.
- `src/Artwork.tsx`: Vector art (easel painting, painter hand, icons, heatmap).
- `src/timeline.ts`: Color palette, keyframe timestamps, and easing curves.
- `NOTES.md`: Morph and transition breakdown for all 6 beats.

## License

Remotion is free for individuals and companies with up to 3 employees.
For commercial teams with 4+ employees, a Remotion Company License is required.
See [remotion.dev/license](https://www.remotion.dev/license) for licensing details.
