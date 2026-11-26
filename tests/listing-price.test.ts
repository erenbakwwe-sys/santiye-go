import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparablePrices, cheapestId, unitRatePrice, unitLabel } from '../src/lib/utils/listing-price';

test('satılık ilanda günlük/haftalık/aylık kira fiyatı gösterilmez', () => {
  const p = comparablePrices({ listing_type: 'sale', price_daily: 5300, price_weekly: 1, price_monthly: 2, price_sale: 5500 });
  assert.deepEqual(p, { daily: null, weekly: null, monthly: null, sale: 5500 });
});

test('kiralık ilanda satış fiyatı gösterilmez', () => {
  const p = comparablePrices({ listing_type: 'rental', price_daily: 900, price_weekly: 5000, price_monthly: 18000, price_sale: 777 });
  assert.deepEqual(p, { daily: 900, weekly: 5000, monthly: 18000, sale: null });
});

test('hizmet ilanında satış fiyatı gösterilmez, günlük kalır', () => {
  assert.deepEqual(comparablePrices({ listing_type: 'service', price_daily: 100, price_sale: 50 }),
    { daily: 100, weekly: null, monthly: null, sale: null });
});

test('fiyatı hiç olmayan ilanda hepsi null', () => {
  assert.deepEqual(comparablePrices({ listing_type: 'rental' }),
    { daily: null, weekly: null, monthly: null, sale: null });
  assert.deepEqual(comparablePrices({ listing_type: 'sale', price_sale: null }),
    { daily: null, weekly: null, monthly: null, sale: null });
});

// 0 ve negatif: gerçek bir fiyat değil, "girilmemiş" demek (formda boş alan 0 kaydolabilir); 0 ₺ "en ucuz" sayılmamalı.
test('0 ve negatif fiyat null sayılır; NaN ve sayısal olmayan da', () => {
  assert.equal(comparablePrices({ listing_type: 'sale', price_sale: 0 }).sale, null);
  assert.equal(comparablePrices({ listing_type: 'sale', price_sale: -5 }).sale, null);
  assert.equal(comparablePrices({ listing_type: 'rental', price_daily: 0 }).daily, null);
  assert.equal(comparablePrices({ listing_type: 'rental', price_daily: Number.NaN }).daily, null);
});

test('en ucuz: null fiyat sayılmaz, kiralık ile satılık kıyaslanmaz', () => {
  const a = { id: 'a', listing_type: 'rental' as const, price_daily: 1000 };
  const b = { id: 'b', listing_type: 'rental' as const, price_daily: 800 };
  const c = { id: 'c', listing_type: 'sale' as const, price_daily: 1, price_sale: 50 };
  const d = { id: 'd', listing_type: 'rental' as const };
  const all = [a, b, c, d];
  assert.equal(cheapestId(all, 'daily'), 'b');
  assert.equal(cheapestId([d], 'daily'), null);
  // satılıkta yalnız bir fiyat var -> rozet yok
  assert.equal(cheapestId(all, 'sale'), null);
});

test('en ucuz: tek fiyat varsa rozet yok', () => {
  assert.equal(cheapestId([{ id: 'a', listing_type: 'sale', price_sale: 100 }], 'sale'), null);
  assert.equal(cheapestId([{ id: 'a', listing_type: 'rental', price_daily: 100 }, { id: 'b', listing_type: 'rental' }], 'daily'), null);
});

test('en ucuz: iki fiyat varsa ucuz olanın id\'si', () => {
  const l = [
    { id: 'a', listing_type: 'sale', price_sale: 900 },
    { id: 'b', listing_type: 'sale', price_sale: 700 },
  ];
  assert.equal(cheapestId(l, 'sale'), 'b');
});

test('en ucuz: en düşükte eşitlik varsa rozet yok; üstteki eşitlik sorun değil', () => {
  assert.equal(cheapestId([
    { id: 'a', listing_type: 'sale', price_sale: 700 },
    { id: 'b', listing_type: 'sale', price_sale: 700 },
  ], 'sale'), null);
  assert.equal(cheapestId([
    { id: 'a', listing_type: 'sale', price_sale: 700 },
    { id: 'b', listing_type: 'sale', price_sale: 900 },
    { id: 'c', listing_type: 'sale', price_sale: 900 },
  ], 'sale'), 'a');
});

test('en ucuz: 0/null fiyatlar sayılmaz', () => {
  assert.equal(cheapestId([
    { id: 'a', listing_type: 'sale', price_sale: 0 },
    { id: 'b', listing_type: 'sale', price_sale: 500 },
  ], 'sale'), null);
});

// Kart (ListingCard.renderPrice): hizmet + unit_rate -> price_daily || price_sale, birim price_unit || 'm²'.
test('hizmet birim fiyatı karttaki gibi: daily || sale, birim price_unit || m²', () => {
  assert.deepEqual(unitRatePrice({ listing_type: 'service', pricing_type: 'unit_rate', price_sale: 250, price_unit: 'm³' }),
    { amount: 250, unit: 'm³' });
  assert.deepEqual(unitRatePrice({ listing_type: 'service', pricing_type: 'unit_rate', price_daily: 120, price_sale: 250 }),
    { amount: 120, unit: 'm²' });
  assert.equal(unitRatePrice({ listing_type: 'service', pricing_type: 'fixed', price_daily: 120 }), null);
  // N2: unit_rate her ilan türünde birim fiyattır
  assert.deepEqual(unitRatePrice({ listing_type: 'rental', pricing_type: 'unit_rate', price_daily: 120 }), { amount: 120, unit: 'm²' });
  assert.equal(unitRatePrice({ listing_type: 'service', pricing_type: 'unit_rate' }), null);
});

test('hizmet birim fiyatı günlük/satış en ucuz kıyasına karışmaz', () => {
  const svc = { id: 's', listing_type: 'service', pricing_type: 'unit_rate', price_sale: 10, price_daily: 5 };
  assert.deepEqual(comparablePrices(svc), { daily: null, weekly: null, monthly: null, sale: null });
  const l = [svc, { id: 'a', listing_type: 'rental', price_daily: 900 }, { id: 'b', listing_type: 'rental', price_daily: 800 }];
  assert.equal(cheapestId(l, 'daily'), 'b');
});

// N2: unit_rate her ilan türünde birim fiyattır (demo iskele: kiralık + unit_rate + m2_ay).
test('kiralık + unit_rate: kira/satış kıyasına girmez, birim fiyatı dolu', () => {
  const isk = { id: 'i', listing_type: 'rental', pricing_type: 'unit_rate', price_unit: 'm2_ay', price_daily: 45 };
  assert.deepEqual(comparablePrices(isk), { daily: null, weekly: null, monthly: null, sale: null });
  assert.deepEqual(unitRatePrice(isk), { amount: 45, unit: 'm²/ay' });
});

test('en ucuz: kiralık unit_rate ilan sayılmaz', () => {
  const l = [
    { id: 'i', listing_type: 'rental', pricing_type: 'unit_rate', price_unit: 'm2_ay', price_daily: 45 },
    { id: 'a', listing_type: 'rental', price_daily: 26000 },
    { id: 'b', listing_type: 'rental', price_daily: 5500 },
  ];
  assert.equal(cheapestId(l, 'daily'), 'b');
});

test('unitLabel: bilinen birimler okunur etikete, bilinmeyen "/" olur, boş boş kalır', () => {
  assert.equal(unitLabel('m2_ay'), 'm²/ay');
  assert.equal(unitLabel('m2'), 'm²');
  assert.equal(unitLabel('m3'), 'm³');
  assert.equal(unitLabel('adet'), 'adet');
  assert.equal(unitLabel('foo_bar'), 'foo/bar');
  assert.equal(unitLabel(''), '');
  assert.equal(unitLabel(null), '');
});
