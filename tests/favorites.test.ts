import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAVORITES_STORAGE_KEY,
  parseFavoriteList,
  toggleFavoriteList,
  isFavoriteId,
  favoriteWriteFailed,
  revertFavoriteList,
} from '../src/lib/utils/favorites';

test('anahtar /favorilerim ile aynı', () => {
  assert.equal(FAVORITES_STORAGE_KEY, 'santiyego_favorites');
});

test('bozuk veya boş kayıt boş liste verir', () => {
  assert.deepEqual(parseFavoriteList(null), []);
  assert.deepEqual(parseFavoriteList(''), []);
  assert.deepEqual(parseFavoriteList('{bozuk'), []);
  assert.deepEqual(parseFavoriteList('{"a":1}'), []);
});

test('kimliği olmayan kayıtlar atılır, ilan nesneleri korunur', () => {
  const raw = JSON.stringify([{ id: 'a', title: 'X' }, { title: 'kimliksiz' }, null, 5, { id: '' }]);
  assert.deepEqual(parseFavoriteList(raw), [{ id: 'a', title: 'X' }]);
});

test('ekleme: başa eklenir, aynı ilan iki kez eklenmez', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  assert.deepEqual(toggleFavoriteList([a], b, true), [b, a]);
  assert.deepEqual(toggleFavoriteList([a, b], a, true).map((x) => x.id).sort(), ['a', 'b']);
});

test('çıkarma: yalnız o ilan silinir; olmayanı çıkarmak listeyi bozmaz', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  assert.deepEqual(toggleFavoriteList([a, b], a, false), [b]);
  assert.deepEqual(toggleFavoriteList([a], { id: 'z' }, false), [a]);
});

test('girdi dizisi değiştirilmez', () => {
  const cur = [{ id: 'a' }];
  toggleFavoriteList(cur, { id: 'b' }, true);
  assert.equal(cur.length, 1);
});

test('isFavoriteId', () => {
  assert.equal(isFavoriteId([{ id: 'a' }], 'a'), true);
  assert.equal(isFavoriteId([{ id: 'a' }], 'b'), false);
});

test('favoriteWriteFailed: Supabase {error} döndürür, fırlatmaz', () => {
  assert.equal(favoriteWriteFailed({ error: { message: 'RLS' } }), true);
  assert.equal(favoriteWriteFailed({ error: null }), false);
  assert.equal(favoriteWriteFailed({}), false);
  assert.equal(favoriteWriteFailed(null), false);
  assert.equal(favoriteWriteFailed(undefined), false);
});

// N3: geri alma tüm listeyi eski hâle döndürmez; yalnız o ilanı tersine çevirir.
test('A eklendi, B eklendi, A geri alınınca liste yalnız B içerir', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  let store = toggleFavoriteList([] as { id: string }[], a, true);
  store = toggleFavoriteList(store, b, true);
  store = revertFavoriteList(store, a, true);
  assert.deepEqual(store, [b]);
});

test('geri alma: çıkarma başarısızsa o ilan geri eklenir, diğerleri korunur', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  assert.deepEqual(revertFavoriteList([b], a, false).map((x) => x.id).sort(), ['a', 'b']);
});
