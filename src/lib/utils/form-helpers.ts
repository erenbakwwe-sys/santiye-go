/** Kayıt sayfasında adres parametresinden başlangıç rolü. Yalnız tam "company" firma açar. */
export function initialRoleFromParam(value: string | null): 'buyer' | 'company' {
  return value === 'company' ? 'company' : 'buyer';
}

/**
 * Şifre sıfırlama isteğinin sonucu. 429 (hız sınırı) e-posta gitmemiş olabilir; ayrı döner. İstek tamamlanamadıysa (ağ hatası) ya da sunucu 5xx
 * döndüyse tekrar denetilir; sunucu normal cevap verdiyse (kullanıcı bulunamasa bile)
 * kullanıcı varlığını sızdırmamak için aynı genel başarı gösterilir.
 */
export function resetOutcome({ threw, status }: { threw: boolean; status: number }): 'sent' | 'retry' | 'rate_limited' {
  if (status === 429 && !threw) return 'rate_limited';
  if (threw || status >= 500) return 'retry';
  return 'sent';
}
