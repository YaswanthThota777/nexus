import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactNumber } from '../src/utils/formatters.js';

test('returns plain number for small values', () => {
  assert.equal(formatCompactNumber(900), '900');
});

test('returns compact format for large values', () => {
  assert.equal(formatCompactNumber(1500), '1.5K');
});

test('returns safe fallback for invalid input', () => {
  assert.equal(formatCompactNumber('abc'), '0');
});
