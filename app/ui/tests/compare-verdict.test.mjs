import test from 'node:test';
import assert from 'node:assert/strict';
import { clarityVerdict } from '../src/utils/compareVerdict.ts';

test('clarity verdict follows the core B minus A delta, including ties', () => {
  assert.equal(clarityVerdict(3.4437308), 'Variant B has more concentrated attention');
  assert.equal(clarityVerdict(-3.4437308), 'Variant A has more concentrated attention');
  assert.equal(clarityVerdict(0), 'Both variants have equal clarity');
  assert.equal(clarityVerdict(-0), 'Both variants have equal clarity');
});
