import test from 'node:test';
import assert from 'node:assert/strict';
import { recolorHeatmap, getColorForValue } from '../src/utils/colorRamps.ts';
import { HERO_SVG, SAMPLE_SVGS } from '../src/utils/samples.ts';

test('heatmap palettes use attention alpha without changing attention or transparency', () => {
  const source = new Uint8ClampedArray([0, 0, 0, 0, 100, 100, 100, 128, 255, 255, 255, 255]);
  const results = ['inferno', 'viridis'].map(ramp => {
    const pixels = source.slice();
    recolorHeatmap(pixels, ramp);
    for (const index of [0, 4, 8]) {
      assert.equal(pixels[index + 3], source[index + 3]);
      assert.deepEqual([...pixels.slice(index, index + 3)], Object.values(getColorForValue(source[index + 3] / 255, ramp)));
    }
    return pixels;
  });
  assert.notDeepEqual(results[0], results[1]);
});

test('comparison sample B changes only CTA colors on the same landing page', () => {
  assert.notEqual(SAMPLE_SVGS['hero-variant'], HERO_SVG);
  assert.equal(SAMPLE_SVGS['hero-variant']
    .replace('fill="#fbbf24"', 'fill="url(#hCta)"')
    .replace('x="128" y="285" fill="#0f172a"', 'x="128" y="285" fill="#ffffff"'), HERO_SVG);
});
