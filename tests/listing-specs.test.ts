import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleSpecs } from '../src/lib/utils/listing-specs';

test('boş değerler elenir', () => {
  const r = visibleSpecs({ boom_length: null, working_hours: undefined, brand: '', model: '   ', year: 2020 });
  assert.deepEqual(r, [{ label: 'Model yılı', value: '2020' }]);
});

test('"-" ve "—" değerleri elenir', () => {
  assert.deepEqual(visibleSpecs({ brand: '-', model: '—' }), []);
});

test('iç/sistem alanları elenir', () => {
  const r = visibleSpecs({
    pricing_type: 'fixed',
    unit_price_rate: 5,
    unit_price_unit: 'm² başına',
    service_area_type: 'radius',
    working_hours: 1,
  });
  assert.deepEqual(r, [{ label: 'Çalışma saati', value: '1' }]);
});

test('brand_model, material_unit, service_radius_km Türkçe etiketle gelir', () => {
  const r = visibleSpecs({ brand_model: 'CAT 320', material_unit: 'Ton', service_radius_km: 100 });
  assert.deepEqual(r, [
    { label: 'Marka / model', value: 'CAT 320' },
    { label: 'Birim', value: 'Ton' },
    { label: 'Hizmet yarıçapı', value: '100 km' },
  ]);
});

test('bilinmeyen İngilizce anahtar elenir', () => {
  assert.deepEqual(visibleSpecs({ some_unknown_key: 'x' }), []);
});

test('boolean değerler Var/Yok olur, false de gösterilir', () => {
  const r = visibleSpecs({ installation_included: true, soundproof: false });
  assert.deepEqual(r, [
    { label: 'Montaj dahil', value: 'Var' },
    { label: 'Ses yalıtımlı', value: 'Yok' },
  ]);
});

test('0 sayısı boş sayılmaz', () => {
  assert.deepEqual(visibleSpecs({ axle_count: 0 }), [{ label: 'Aks sayısı', value: '0' }]);
});

test('hepsi elenince boş dizi döner; null/undefined girdi de güvenli', () => {
  assert.deepEqual(visibleSpecs({ pricing_type: 'fixed', x: '-' }), []);
  assert.deepEqual(visibleSpecs(null), []);
  assert.deepEqual(visibleSpecs(undefined), []);
});

test('condition: alt çizgili değer okunur Türkçe olur', () => {
  assert.deepEqual(visibleSpecs({ condition: 'az_kullanılmış' }), [{ label: 'Durum', value: 'Az kullanılmış' }]);
});

test('condition: bilinen "sıfır" değeri baş harfi büyük gelir', () => {
  assert.deepEqual(visibleSpecs({ condition: 'sıfır' }), [{ label: 'Durum', value: 'Sıfır' }]);
});

test('alt çizgili metinde Türkçe i -> İ büyütülür', () => {
  assert.deepEqual(visibleSpecs({ condition: 'ikinci_el' }), [{ label: 'Durum', value: 'İkinci el' }]);
});

test('alt çizgisiz metin ve sayı değişmez', () => {
  assert.deepEqual(visibleSpecs({ brand: 'caterpillar', year: 2020 }), [
    { label: 'Marka', value: 'caterpillar' },
    { label: 'Model yılı', value: '2020' },
  ]);
});

test('min_order_quantity gösterilir: "En az sipariş miktarı"', () => {
  assert.deepEqual(visibleSpecs({ min_order_quantity: 5 }), [{ label: 'En az sipariş miktarı', value: '5' }]);
});

test('dizi değer ", " ile birleşir', () => {
  assert.deepEqual(visibleSpecs({ brand: ['A', 'B'] }), [{ label: 'Marka', value: 'A, B' }]);
  assert.deepEqual(visibleSpecs({ min_order_quantity: ['A', 'B'] }), [{ label: 'En az sipariş miktarı', value: 'A, B' }]);
});

test('nesne değer olan satır gösterilmez', () => {
  assert.deepEqual(visibleSpecs({ min_order_quantity: { a: 1 }, year: 2020 }), [{ label: 'Model yılı', value: '2020' }]);
});
