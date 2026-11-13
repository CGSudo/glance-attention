import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRevealTiming } from '../src/screens/analyzeReveal.ts';

test('Analyze reveal reserves sequential heatmap, path, reading, typing, and card slots', () => {
  const timing = analyzeRevealTiming(7, 40);
  assert.deepEqual(timing.numbers, [900, 1150, 1400, 1650, 1900, 2150, 2400]);
  assert.deepEqual(timing.lines, [1050, 1300, 1550, 1800, 2050, 2300]);
  assert.equal(timing.pause, 2650);
  assert.equal(timing.typing - timing.pause, 1000);
  assert.equal(timing.typingEnd - timing.typing, 40 * 35);
  assert.deepEqual(timing.cards, [5050, 5300, 5550, 5800]);
  assert.equal(timing.end, 6050);
  const empty = analyzeRevealTiming(0, 0);
  assert.deepEqual(empty.numbers, []);
  assert.deepEqual(empty.lines, []);
  assert.equal(empty.typing, 1900);
});
