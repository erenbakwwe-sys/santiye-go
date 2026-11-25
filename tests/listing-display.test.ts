import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDistance, shouldShowNearbySection } from '../src/lib/utils/listing-display';

test('mesafe sayıysa "km" ile yazılır', () => {
  assert.equal(formatDistance(12.4), '12,4 km');
  assert.equal(formatDistance(3), '3 km');
  assert.equal(formatDistance(0), '0 km');
});

test('mesafe yoksa (null, undefined, NaN) hiçbir şey yazılmaz', () => {
  assert.equal(formatDistance(null), null);
  assert.equal(formatDistance(undefined), null);
  assert.equal(formatDistance(Number.NaN), null);
});

test('1 km altı metre olarak yazılır', () => {
  assert.equal(formatDistance(0.45), '450 m');
});

test('yakın ilanlar, son eklenenlerin aynısıysa bölüm gösterilmez', () => {
  assert.equal(shouldShowNearbySection([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }, { id: 'c' }]), false);
});

test('yakın ilan yoksa bölüm gösterilmez', () => {
  assert.equal(shouldShowNearbySection([], [{ id: 'a' }]), false);
});

test('yakın ilanlarda son eklenenlerde olmayan varsa bölüm gösterilir', () => {
  assert.equal(shouldShowNearbySection([{ id: 'a' }, { id: 'z' }], [{ id: 'a' }, { id: 'b' }]), true);
});
