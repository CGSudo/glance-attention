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

test('Layout includes mobile Menu button and navigation sheet below 1024px', () => {
  const layoutSource = fs.readFileSync(path.join(srcDir, 'components/Layout.tsx'), 'utf-8');
  assert.ok(layoutSource.includes('Menu'), 'Should contain Menu label');
  assert.ok(layoutSource.includes('mobileMenuOpen'), 'Should manage mobile menu state');
  assert.ok(layoutSource.includes('Dialog.Root'), 'Should open nav in a sheet');
  assert.ok(layoutSource.includes('lg:hidden'), 'Menu button should be lg:hidden');
  assert.ok(layoutSource.includes('hidden lg:flex'), 'Desktop nav should be hidden lg:flex');
});

test('Analyze provides compact uploader bar and proper ordering below 1024px', () => {
  const analyzeSource = fs.readFileSync(path.join(srcDir, 'screens/Analyze.tsx'), 'utf-8');
  assert.ok(analyzeSource.includes('Mobile Compact Uploader Bar'), 'Should have mobile compact uploader bar');
  assert.ok(analyzeSource.includes('order-last lg:order-none w-full lg:w-80'), 'Recents and samples follow results below 1024px');
  assert.equal(analyzeSource.includes('SAMPLES.map'), false, 'Samples appear only in the lower library grid');
  assert.equal((analyzeSource.match(/<TrustBadges/g) || []).length, 1, 'One trust block in the library panel');
  const toolbarSource = analyzeSource.split('Canvas Toolbar (Desktop >= 1024px)')[1].split('Viewport canvas container')[0];
  assert.ok(toolbarSource.includes('hidden lg:flex items-center justify-between'), 'Canvas toolbar hidden below 1024px');
  assert.equal(toolbarSource.includes('flex-wrap'), false, 'Desktop toolbar stays on one row');
  assert.equal(toolbarSource.includes('min-h-[44px]'), false, 'Desktop toolbar uses compact controls');
  assert.equal((analyzeSource.match(/aria-label="Remove image"/g) || []).length, 1, 'One image removal control');
  assert.ok(analyzeSource.includes('relative w-full flex flex-col bg-neutral-950 lg:flex-1'), 'Canvas container uses normal document flow below 1024px');
  assert.equal(analyzeSource.includes('-mt-'), false, 'No negative margins');
  assert.equal(analyzeSource.includes('fixed md:static'), false, 'No fixed metrics panel on mobile');
});
