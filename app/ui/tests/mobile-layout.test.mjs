import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');

test('WalkthroughGuide has no unsourced social proof and marks clarity value as example', () => {
  const walkthroughSource = fs.readFileSync(path.join(srcDir, 'components/WalkthroughGuide.tsx'), 'utf-8');
  assert.equal(walkthroughSource.includes('4,000+ teams'), false, 'Should not contain 4,000+ teams');
  assert.equal(walkthroughSource.includes('Trusted by'), false, 'Should not contain unsourced social proof');
  assert.ok(walkthroughSource.includes('74 / 100 (example)'), 'Visual clarity value should be marked as example');
});

test('Layout includes mobile Menu button and navigation sheet below 768px', () => {
  const layoutSource = fs.readFileSync(path.join(srcDir, 'components/Layout.tsx'), 'utf-8');
  assert.ok(layoutSource.includes('Menu'), 'Should contain Menu label');
  assert.ok(layoutSource.includes('mobileMenuOpen'), 'Should manage mobile menu state');
  assert.ok(layoutSource.includes('Dialog.Root'), 'Should open nav in a sheet');
  assert.ok(layoutSource.includes('md:hidden'), 'Menu button should be md:hidden');
  assert.ok(layoutSource.includes('hidden md:flex'), 'Desktop nav should be hidden md:flex');
});

test('Analyze provides compact uploader bar and proper ordering on mobile < 768px', () => {
  const analyzeSource = fs.readFileSync(path.join(srcDir, 'screens/Analyze.tsx'), 'utf-8');
  assert.ok(analyzeSource.includes('Mobile Compact Uploader Bar'), 'Should have mobile compact uploader bar');
  assert.ok(analyzeSource.includes('hidden md:block w-72 lg:w-80'), 'Docked uploader panel should be hidden on mobile');
  assert.ok(analyzeSource.includes('SAMPLES.map'), 'Compact uploader bar should map samples');
  assert.ok(analyzeSource.includes('overflow-x-auto'), 'Samples should be a horizontal scroll row');
  assert.ok(analyzeSource.includes('hidden md:flex flex-wrap items-center justify-between border-b'), 'Canvas toolbar hidden below 768px');
  assert.ok(analyzeSource.includes('relative w-full flex flex-col bg-neutral-950 md:flex-1'), 'Canvas container uses normal document flow on mobile');
  assert.equal(analyzeSource.includes('-mt-'), false, 'No negative margins');
  assert.equal(analyzeSource.includes('fixed md:static'), false, 'No fixed metrics panel on mobile');
});
