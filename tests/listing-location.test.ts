import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLocation, isCompanyVerified } from '../src/lib/utils/listing-display';

test('il ve ilçe virgülle birleşir', () => {
  assert.equal(formatLocation('İstanbul', 'Tuzla'), 'İstanbul, Tuzla');
});

test('yalnız biri doluysa tek başına yazılır', () => {
  assert.equal(formatLocation('İstanbul', null), 'İstanbul');
  assert.equal(formatLocation(null, 'Tuzla'), 'Tuzla');
});

test('ikisi de boşsa null döner', () => {
  assert.equal(formatLocation(null, undefined), null);
  assert.equal(formatLocation('  ', ''), null);
});

test('firma yalnız doğrulama bilgisi true ise doğrulanmıştır', () => {
  assert.equal(isCompanyVerified({ company: { is_verified: true } }), true);
  assert.equal(isCompanyVerified({ company_is_verified: true }), true);
  assert.equal(isCompanyVerified({ company: { is_verified: false } }), false);
  assert.equal(isCompanyVerified({ company: { name: 'X' } }), false);
  assert.equal(isCompanyVerified({}), false);
  assert.equal(isCompanyVerified({ company: { is_verified: 'true' as unknown as boolean } }), false);
});
