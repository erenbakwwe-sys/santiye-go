import type { ReactNode } from 'react';

export interface GuideArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readTimeMin: number;
  date: string; // YYYY-MM-DD
  body: ReactNode;
}

const H2 = 'text-base sm:text-lg font-black text-navy-900 mt-6 mb-2';

/** Yalnızca gerçekten içeriği olan makaleler. İçeriksiz adres /rehber/[slug] içinde 404 verir. */
export const GUIDES: GuideArticle[] = [
  {
    slug: 'is-makinesi-kiralarken-dikkat-edilmesi-gerekenler',
    title: 'Şantiye Ekipmanı ve Makine Kiralama Rehberi',
    summary: 'Operatör belgeleri, periyodik muayene raporları, nakliye sorumluluğu ve kira sözleşmesi maddeleri hakkında rehber.',
    category: 'Mevzuat & Standartlar',
    readTimeMin: 6,
    date: '2026-10-15',
    body: (
      <>
        <p>
          İnşaat projelerinde doğru makine ve ekipmanın seçilmesi, şantiye bütçesinin ve iş programının korunmasındaki en kritik faktördür. Operatörlü kiralamalarda G sınıfı ehliyet ve SRC belgesi zorunluluğu, akaryakıt anlaşması ve şantiyeye nakliye organizasyonu kira başlangıcında netleştirilmelidir.
        </p>
        <h2 className={H2}>1. Periyodik Kontrol ve Muayene Raporları</h2>
        <p>
          İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği uyarınca vinç, platform, ekskavatör ve kaldırma iletme araçlarının yılda en az bir kez akredite mühendislerce kontrol edilmiş olması ve geçerli raporunun bulunması kanuni zorunluluktur.
        </p>
      </>
    ),
  },
];

export function getGuide(slug: string): GuideArticle | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
