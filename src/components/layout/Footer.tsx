import Link from 'next/link';
import Logo from '@/components/brand/Logo';

const columns: { title: string; links: [string, string][] }[] = [
  {
    title: 'Kategoriler',
    links: [
      ['/ilanlar?category=is-makineleri', 'İş makineleri'],
      ['/ilanlar?category=yapi-malzemeleri', 'Yapı malzemeleri'],
      ['/ilanlar?category=nakliye', 'Nakliye ve hafriyat'],
      ['/ilanlar?category=iskele-kalip', 'İskele ve kalıp'],
      ['/ilanlar?category=santiye-ekipmanlari', 'Şantiye ekipmanları'],
    ],
  },
  {
    title: 'Hizmetler',
    links: [
      ['/teklif-iste', 'Ücretsiz teklif al'],
      ['/kesif-yukle', 'Malzeme listemi yükle'],
      ['/hesaplayici', 'Malzeme hesaplama'],
      ['/santiyeden-santiyeye', 'Artan malzeme / boş kamyon'],
      ['/operatorler', 'Operatör bul'],
    ],
  },
  {
    title: 'Firmalar',
    links: [
      ['/kayit?role=company', 'Firma hesabı aç'],
      ['/giris?redirect=/firma-paneli/yeni-ilan', 'İlan ver'],
      ['/odeme-guvencesi', 'Ödeme güvencesi'],
      ['/rehber', 'Rehber'],
      ['/nasil-kullanilir', 'Nasıl kullanılır?'],
    ],
  },
  {
    title: 'Yasal',
    links: [
      ['/uyelik-sozlesmesi', 'Üyelik sözleşmesi'],
      ['/mesafeli-satis-sozlesmesi', 'Mesafeli satış sözleşmesi'],
      ['/iade-ve-iptal-kosullari', 'İade ve iptal koşulları'],
      ['/reklam-kosullari', 'Reklam koşulları'],
      ['/kvkk', 'KVKK aydınlatma metni'],
      ['/gizlilik', 'Gizlilik ve çerez politikası'],
    ],
  },
];

// 6563 sayılı Kanun kapsamındaki künye bilgileri ortam değişkenlerinden okunur;
// doldurulmamış alanlar gösterilmez (yer tutucu metin yayına çıkmaz).
const imprint = [
  ['Ticari unvan', process.env.NEXT_PUBLIC_COMPANY_TITLE],
  ['MERSİS / Vergi no', process.env.NEXT_PUBLIC_COMPANY_TAX_INFO],
  ['Adres', process.env.NEXT_PUBLIC_COMPANY_ADDRESS],
  ['KEP', process.env.NEXT_PUBLIC_COMPANY_KEP],
].filter(([, v]) => v && v.trim()) as [string, string][];

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'destek@santiyego.com';

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-slate-400 pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Logo tone="light" height={52} />
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              İş makinesi kiralama, yapı malzemesi tedariği ve nakliye için firmaları ve şantiyeleri buluşturan
              pazaryeri.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-block mt-4 text-sm text-slate-200 hover:text-white"
            >
              {supportEmail}
            </a>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} ŞantiyeGO. Tüm hakları saklıdır.</p>
          {imprint.length > 0 && (
            <dl className="flex flex-wrap gap-x-5 gap-y-1">
              {imprint.map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <dt className="text-slate-500">{k}:</dt>
                  <dd className="text-slate-300">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </footer>
  );
}
