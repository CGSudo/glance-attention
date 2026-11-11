import assert from 'node:assert/strict';
import test from 'node:test';
import { saveFile } from '../src/utils/saveFile.ts';
import { sampleVideoFrames } from '../src/api/video.ts';

test('native export writes only to a selected path and propagates failures', async () => {
  const calls = [];
  let selectedPath = 'C:/picked/report.json';
  globalThis.window = { __TAURI_INTERNALS__: { async invoke(command, args, options) {
    calls.push({ command, args, options });
    if (command === 'plugin:dialog|save') return selectedPath;
    if (selectedPath === 'fail') throw new Error('Disk full');
  } } };
  await saveFile('report.json', new Blob(['{}']));
  assert.equal(calls[0].args.options.defaultPath, 'report.json');
  assert.equal(calls[1].command, 'plugin:fs|write_file');
  assert.deepEqual(Array.from(calls[1].args), [123, 125]);
  assert.match(JSON.stringify(calls[1].options), /picked/);
  calls.length = 0;
  selectedPath = null;
  await saveFile('report.json', new Blob(['{}']));
  assert.equal(calls.length, 1);
  selectedPath = 'fail';
  await assert.rejects(saveFile('report.json', new Blob(['{}'])), /Disk full/);
});

test('browser export keeps download behavior', async () => {
  globalThis.window = {};
  let clicked = false;
  const link = { click() { clicked = true; } };
  globalThis.document = { createElement(tag) { assert.equal(tag, 'a'); return link; } };
  await saveFile('report.json', new Blob(['{}']));
  assert.equal(link.download, 'report.json');
  assert.ok(link.href.startsWith('blob:'));
  assert.ok(clicked);
});

test('sample frame uses the same sequence input as decoded video', async () => {
  const frame = new Blob(['image'], { type: 'image/png' });
  const samples = [];
  for await (const sample of sampleVideoFrames(frame)) samples.push(sample);
  assert.deepEqual(samples, [{ frame, t: 0, progress: 50 }]);
});
