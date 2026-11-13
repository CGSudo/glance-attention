export type ColorRampType = 'inferno' | 'viridis';

interface RGB {
  r: number;
  g: number;
  b: number;
}

// 6 control points for inferno (perceptually uniform)
const INFERNO_STOPS: { pos: number; rgb: RGB }[] = [
  { pos: 0.0, rgb: { r: 10, g: 8, b: 24 } },
  { pos: 0.2, rgb: { r: 66, g: 15, b: 107 } },
  { pos: 0.4, rgb: { r: 140, g: 41, b: 129 } },
  { pos: 0.6, rgb: { r: 211, g: 84, b: 73 } },
  { pos: 0.8, rgb: { r: 251, g: 159, b: 32 } },
  { pos: 1.0, rgb: { r: 252, g: 255, b: 164 } },
];

// 6 control points for viridis (colorblind-safe)
const VIRIDIS_STOPS: { pos: number; rgb: RGB }[] = [
  { pos: 0.0, rgb: { r: 68, g: 1, b: 84 } },
  { pos: 0.2, rgb: { r: 59, g: 82, b: 139 } },
  { pos: 0.4, rgb: { r: 33, g: 145, b: 140 } },
  { pos: 0.6, rgb: { r: 94, g: 201, b: 98 } },
  { pos: 0.8, rgb: { r: 178, g: 224, b: 43 } },
  { pos: 1.0, rgb: { r: 253, g: 231, b: 37 } },
];

function interpolateColor(stops: { pos: number; rgb: RGB }[], t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];
    if (clamped >= s0.pos && clamped <= s1.pos) {
      const f = (clamped - s0.pos) / (s1.pos - s0.pos);
      return {
        r: Math.round(s0.rgb.r + f * (s1.rgb.r - s0.rgb.r)),
        g: Math.round(s0.rgb.g + f * (s1.rgb.g - s0.rgb.g)),
        b: Math.round(s0.rgb.b + f * (s1.rgb.b - s0.rgb.b)),
      };
    }
  }
  return stops[stops.length - 1].rgb;
}

export function getColorForValue(val: number, ramp: ColorRampType): RGB {
  return interpolateColor(ramp === 'viridis' ? VIRIDIS_STOPS : INFERNO_STOPS, val);
}

export function buildColorLookupTable(ramp: ColorRampType): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  const stops = ramp === 'viridis' ? VIRIDIS_STOPS : INFERNO_STOPS;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const { r, g, b } = interpolateColor(stops, t);
    lut[i * 4] = r;
    lut[i * 4 + 1] = g;
    lut[i * 4 + 2] = b;
    // Low-attention areas must be transparent (alpha ramps with value)
    lut[i * 4 + 3] = Math.round(t * 255);
  }
  return lut;
}

export function recolorHeatmap(pixels: Uint8ClampedArray, ramp: ColorRampType): void {
  const lut = buildColorLookupTable(ramp);
  // Core heatmap PNG alpha stores normalized attention; preserve it in either palette.
  for (let i = 0; i < pixels.length; i += 4) {
    const offset = pixels[i + 3] * 4;
    pixels[i] = lut[offset];
    pixels[i + 1] = lut[offset + 1];
    pixels[i + 2] = lut[offset + 2];
  }
}
