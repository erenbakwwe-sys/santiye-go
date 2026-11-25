import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialRoleFromParam, resetOutcome } from '../src/lib/utils/form-helpers';

test('role=company firma sekmesini açar', () => {
  assert.equal(initialRoleFromParam('company'), 'company');
});

// Büyük/küçük harf kararı: yalnız tam "company" geçerli; "COMPANY " gibi bozuk değerler alıcı.
test('diğer her değer alıcıdır', () => {
  for (const v of [null, '', 'buyer', 'admin', 'super_admin', 'COMPANY ', 'Company', ' company']) {
    assert.equal(initialRoleFromParam(v), 'buyer', String(v));
  }
});

test('ağ hatası veya 5xx tekrar denetir', () => {
  assert.equal(resetOutcome({ threw: true, status: 0 }), 'retry');
  assert.equal(resetOutcome({ threw: true, status: 200 }), 'retry');
  assert.equal(resetOutcome({ threw: false, status: 500 }), 'retry');
  assert.equal(resetOutcome({ threw: false, status: 503 }), 'retry');
});

test('normal sunucu cevabı (kullanıcı yok olsa da) genel başarıdır', () => {
  for (const status of [200, 204, 400, 404, 422]) {
    assert.equal(resetOutcome({ threw: false, status }), 'sent', String(status));
  }
});

test('429 hız sınırı rate_limited döner', () => {
  assert.equal(resetOutcome({ threw: false, status: 429 }), 'rate_limited');
});

test('500 ve ağ hatası retry; 200/400/404 sent', () => {
  assert.equal(resetOutcome({ threw: false, status: 500 }), 'retry');
  assert.equal(resetOutcome({ threw: true, status: 0 }), 'retry');
  for (const status of [200, 400, 404]) assert.equal(resetOutcome({ threw: false, status }), 'sent');
});
