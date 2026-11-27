import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeDraft, parseDraft } from '../src/lib/utils/form-draft';

const allowed = ['title', 'qty', 'urgent'];

test('gidiş-dönüş: string, sayı, boolean korunur', () => {
  const raw = serializeDraft({ title: 'Kepçe', qty: 3, urgent: true });
  assert.deepEqual(parseDraft(raw, allowed), { title: 'Kepçe', qty: 3, urgent: true });
});

test('bozuk veya boş JSON null verir', () => {
  assert.equal(parseDraft(null, allowed), null);
  assert.equal(parseDraft('', allowed), null);
  assert.equal(parseDraft('{bozuk', allowed), null);
  assert.equal(parseDraft('[1,2]', allowed), null);
  assert.equal(parseDraft('"düz"', allowed), null);
});

test('izinli olmayan anahtarlar atılır', () => {
  const raw = JSON.stringify({ title: 'a', password: 'gizli' });
  assert.deepEqual(parseDraft(raw, allowed), { title: 'a' });
});

test('string/number/boolean dışındaki değerler atılır', () => {
  const raw = JSON.stringify({ title: { x: 1 }, qty: null, urgent: [1], extra: 'z' });
  assert.equal(parseDraft(raw, allowed), null);
});

test('hiç geçerli alan kalmayan taslak null verir (boş nesne, yalnız izinsiz anahtar)', () => {
  assert.equal(parseDraft('{}', allowed), null);
  assert.equal(parseDraft(JSON.stringify({ password: 'gizli' }), allowed), null);
  assert.equal(parseDraft(JSON.stringify({ title: 'a' }), allowed) !== null, true);
});

test('serializeDraft de geçersiz değerleri yazmaz', () => {
  const raw = serializeDraft({ title: 'a', bad: undefined, obj: { a: 1 }, n: NaN } as Record<string, unknown>);
  assert.deepEqual(JSON.parse(raw), { title: 'a' });
});
