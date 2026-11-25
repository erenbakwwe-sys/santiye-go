import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleItems, realCount } from '../src/lib/utils/sample-content';

const real = [{ id: 'a' }, { id: 'b' }];
const samples = [{ id: 'demo-1' }, { id: 'demo-2' }, { id: 'demo-3' }];

test('demo kapalı + gerçek kayıt yok: boş liste', () => {
  assert.deepEqual(visibleItems([], samples, false), []);
});

test('demo kapalı + gerçek kayıt var: yalnız gerçekler', () => {
  assert.deepEqual(visibleItems(real, samples, false), real);
});

test('demo açık + gerçek yok: örnekler', () => {
  assert.deepEqual(visibleItems([], samples, true), samples);
});

test('demo açık + gerçek var: yalnız gerçekler (örnek karışmaz)', () => {
  assert.deepEqual(visibleItems(real, samples, true), real);
});

test('sayaç yalnız gerçek kayıtları sayar', () => {
  assert.equal(realCount(real), 2);
  assert.equal(realCount([]), 0);
});

test('demo kapalıyken görünen kayıt sayısı gerçek kayıt sayısıdır', () => {
  assert.equal(realCount(real), 2);
  assert.equal(visibleItems(real, samples, false).length, 2);
  assert.equal(visibleItems([], samples, false).length, 0);
});
