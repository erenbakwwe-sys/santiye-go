import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortByTurkishName } from '../src/lib/utils/city-sort';

const names = (items: { name: string }[]) => items.map((i) => i.name);

test('Ç, Ö, Ş, Ü, Ğ Türkçe harf sırasında yerleşir', () => {
  const sorted = sortByTurkishName([
    { name: 'Denizli' },
    { name: 'Çorum' },
    { name: 'Çanakkale' },
    { name: 'Adana' },
  ]);
  assert.deepEqual(names(sorted), ['Adana', 'Çanakkale', 'Çorum', 'Denizli']);
});

test('I, İ sırası: Isparta < İstanbul < İzmir', () => {
  const sorted = sortByTurkishName([{ name: 'İzmir' }, { name: 'İstanbul' }, { name: 'Isparta' }, { name: 'Hatay' }]);
  assert.deepEqual(names(sorted), ['Hatay', 'Isparta', 'İstanbul', 'İzmir']);
});

test('Şanlıurfa Tekirdağ öncesinde, Ü/Ö doğru yerde', () => {
  const sorted = sortByTurkishName([{ name: 'Tekirdağ' }, { name: 'Şanlıurfa' }, { name: 'Van' }, { name: 'Ordu' }, { name: 'Osmaniye' }, { name: 'Ömerli' }]);
  assert.deepEqual(names(sorted), ['Ordu', 'Osmaniye', 'Ömerli', 'Şanlıurfa', 'Tekirdağ', 'Van']);
});

test('girdiyi değiştirmez, yeni dizi döndürür; id korunur', () => {
  const input = [{ id: 34, name: 'İstanbul' }, { id: 6, name: 'Ankara' }];
  const copy = [...input];
  const sorted = sortByTurkishName(input);
  assert.notEqual(sorted, input);
  assert.deepEqual(input, copy);
  assert.deepEqual(sorted.map((i) => i.id), [6, 34]);
});
