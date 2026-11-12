import assert from 'node:assert/strict';
import test from 'node:test';
import { fitCapture, MAX_CAPTURE_SIZE } from './capture-size.js';

test('size guard preserves captures at limit and scales width by 0.8 above limit', async () => {
  assert.deepEqual(await fitCapture(2000, 4000, () => MAX_CAPTURE_SIZE), { width: 2000, height: 4000, cropped: false });
  const attempts = [];
  const result = await fitCapture(2000, 4000, (width, height) => {
    attempts.push([width, height]);
    return width > 1280 ? MAX_CAPTURE_SIZE + 1 : MAX_CAPTURE_SIZE;
  });
  assert.deepEqual(attempts, [[2000, 4000], [1600, 3200], [1280, 2560]]);
  assert.deepEqual(result, { width: 1280, height: 2560, cropped: false });
});

test('size guard stops at width 800 then crops height until it fits', async () => {
  const attempts = [];
  const result = await fitCapture(1000, 2000, (width, height) => {
    attempts.push([width, height]);
    return height > 1024 ? MAX_CAPTURE_SIZE + 1 : MAX_CAPTURE_SIZE;
  });
  assert.deepEqual(attempts, [[1000, 2000], [800, 1600], [800, 1280], [800, 1024]]);
  assert.deepEqual(result, { width: 800, height: 1024, cropped: true });
});

test('size guard never enlarges narrow captures and rejects impossible sizes', async () => {
  assert.deepEqual(await fitCapture(600, 10, (_, height) => height > 8 ? MAX_CAPTURE_SIZE + 1 : 1),
    { width: 600, height: 8, cropped: true });
  await assert.rejects(fitCapture(800, 2, () => MAX_CAPTURE_SIZE + 1), /cannot fit session storage/);
});
