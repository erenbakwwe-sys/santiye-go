import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRehberDate } from '../src/lib/utils/rehber-format';

test('ISO tarih gün.ay.yıl biçimine çevrilir', () => {
  assert.equal(formatRehberDate('2026-10-15'), '15.10.2026');
  assert.equal(formatRehberDate('2026-01-05'), '05.01.2026');
});

test('geçersiz girdi aynen döner', () => {
  assert.equal(formatRehberDate('yakında'), 'yakında');
  assert.equal(formatRehberDate(''), '');
  assert.equal(formatRehberDate('2026-13-45'), '2026-13-45');
  assert.equal(formatRehberDate('2026-02-30'), '2026-02-30');
});
