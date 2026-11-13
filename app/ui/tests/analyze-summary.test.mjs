import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyzeSummary, getPositionLabel } from '../src/utils/analyzeSummary.ts';

test('Look order uses the summary position labels, including boundaries', () => {
  for (const [x, y, label] of [
    [0, 0, 'top left'], [35, 34, 'top center'], [66, 34, 'top right'],
    [34, 35, 'left side'], [35, 35, 'center'], [65, 65, 'center'],
    [66, 65, 'right side'], [49, 66, 'bottom left'], [50, 66, 'bottom right'],
  ]) {
    assert.equal(getPositionLabel({ x, y }), label);
    assert.ok(buildAnalyzeSummary({ metrics: { clarity: 1, aoi_share: [] }, scanpath: [{ x, y }] }, []).includes(`at the ${label} first`));
  }
});

test('Analyze summary uses result values, look order, and marked attention shares', () => {
  const aois = [
    { id: 'title', name: 'Title', x: 0, y: 0, width: 30, height: 30 },
    { id: 'buy', name: 'Buy', x: 70, y: 70, width: 20, height: 20 },
  ];
  const result = {
    metrics: { clarity: 32, aoi_share: [{ id: 'title', share: 31.2 }, { id: 'buy', share: 4.5 }] },
    scanpath: [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 80, y: 80 }, { x: 10, y: 80 }],
  };
  assert.equal(buildAnalyzeSummary(result, aois), 'Clarity score: 32.0. Higher means eyes settle on fewer places. The look order has 4 attention spots. People may look at "Title" first, then the center, then "Buy". Of your marked areas, "Title" gets the most attention (31.2%), and "Buy" gets the least (4.5%).');
  assert.deepEqual(result.metrics.aoi_share.map(area => area.id), ['title', 'buy']);
  for (const clarity of [39, 40, 69, 70]) {
    assert.ok(buildAnalyzeSummary({ ...result, metrics: { clarity, aoi_share: [] } }, []).startsWith(`Clarity score: ${clarity}.0. Higher means eyes settle on fewer places.`));
  }
  assert.ok(buildAnalyzeSummary({ ...result, metrics: { clarity: 6.9045568, aoi_share: [] } }, []).startsWith('Clarity score: 6.9. Higher means eyes settle on fewer places.'));
  assert.equal(buildAnalyzeSummary({ metrics: { clarity: 70, aoi_share: [] }, scanpath: [] }, aois), 'Clarity score: 70.0. Higher means eyes settle on fewer places. The look order has 0 attention spots.');
  assert.equal(buildAnalyzeSummary({ ...result, scanpath: [{ x: 80, y: 80 }] }, [aois[1]]), 'Clarity score: 32.0. Higher means eyes settle on fewer places. The look order has 1 attention spot. People may look at "Buy" first. Your "Buy" area gets 4.5% of attention.');
});
