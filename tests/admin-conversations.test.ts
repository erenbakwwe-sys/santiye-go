/**
 * ADMIN YAZIŞMA GÖRÜNTÜLEME – saf mantık testleri
 * Çalıştırma: npx tsx --test tests/admin-conversations.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListParams,
  escapeIlike,
  buildConversationSummaries,
  buildThread,
  PAGE_SIZE,
} from '../src/lib/services/admin-conversations.ts';

test('sayfa numarası geçersizse 1 olur, üst sınır uygulanır', () => {
  assert.equal(parseListParams(new URLSearchParams('page=-3')).page, 1);
  assert.equal(parseListParams(new URLSearchParams('page=abc')).page, 1);
  assert.equal(parseListParams(new URLSearchParams('page=4')).page, 4);
  assert.equal(parseListParams(new URLSearchParams('page=999999')).page, 1000);
});

test('arama metni kırpılır ve 60 karakterle sınırlanır', () => {
  assert.equal(parseListParams(new URLSearchParams({ q: '  Anadolu  ' })).q, 'Anadolu');
  assert.equal(parseListParams(new URLSearchParams({ q: 'x'.repeat(200) })).q.length, 60);
  assert.equal(parseListParams(new URLSearchParams('')).q, '');
});

test('arama metnindeki joker karakterler etkisizleştirilir', () => {
  assert.equal(escapeIlike('50%_indirim'), '50\\%\\_indirim');
  assert.equal(escapeIlike('a\\b'), 'a\\\\b');
});

const convs = [
  { id: 'c1', buyer_id: 'u1', company_id: 'f1', listing_id: 'l1', last_message_at: '2026-11-20T10:00:00Z' },
  { id: 'c2', buyer_id: 'u2', company_id: 'f1', listing_id: null, last_message_at: '2026-11-22T10:00:00Z' },
];
const profiles = [{ id: 'u1', full_name: 'Ali Veli' }];
const companies = [{ id: 'f1', name: 'Anadolu Makine' }];
const lastMessages = [
  { conversation_id: 'c1', content: 'a'.repeat(200), created_at: '2026-11-20T10:00:00Z' },
];
const counts = { c1: 7 };

test('konuşma özeti: adlar eşlenir, en yeni üstte, önizleme kısaltılır', () => {
  const out = buildConversationSummaries(convs, profiles, companies, lastMessages, counts);
  assert.deepEqual(out.map((c) => c.id), ['c2', 'c1']);
  const c1 = out[1];
  assert.equal(c1.buyerName, 'Ali Veli');
  assert.equal(c1.companyName, 'Anadolu Makine');
  assert.equal(c1.messageCount, 7);
  assert.ok(c1.preview.length <= 81);
  assert.ok(c1.preview.endsWith('…'));
});

test('konuşma özeti: profili olmayan alıcı ve mesajı olmayan konuşma bozulmaz', () => {
  const out = buildConversationSummaries(convs, profiles, companies, lastMessages, counts);
  const c2 = out[0];
  assert.equal(c2.buyerName, 'Bilinmeyen kullanıcı');
  assert.equal(c2.preview, '');
  assert.equal(c2.messageCount, 0);
});

test('mesaj dizisi: gönderen alıcı mı firma mı işaretlenir, eski mesaj üstte', () => {
  const thread = buildThread(
    [
      { id: 'm2', sender_id: 'u9', content: 'Fiyat 5.000', created_at: '2026-11-20T11:00:00Z', is_deleted: false, attachment_url: null },
      { id: 'm1', sender_id: 'u1', content: 'Merhaba', created_at: '2026-11-20T10:00:00Z', is_deleted: false, attachment_url: null },
    ],
    'u1'
  );
  assert.deepEqual(thread.map((m) => m.id), ['m1', 'm2']);
  assert.equal(thread[0].side, 'buyer');
  assert.equal(thread[1].side, 'company');
});

test('mesaj dizisi: silinmiş mesaj işaretlenir', () => {
  const thread = buildThread(
    [{ id: 'm1', sender_id: 'u1', content: 'x', created_at: '2026-11-20T10:00:00Z', is_deleted: true, attachment_url: null }],
    'u1'
  );
  assert.equal(thread[0].isDeleted, true);
});

test('sayfa boyutu makul', () => {
  assert.ok(PAGE_SIZE >= 10 && PAGE_SIZE <= 50);
});
