import Link from 'next/link';
import { HardHat, ShieldCheck, MapPin, PhoneCall } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-slate-300 pt-12 pb-24 md:pb-12 border-t border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-md">
                <HardHat className="w-6 h-6" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                ŞANTİYE <span className="text-orange-500">GO</span>
              </span>
            </div>
            <p className="text-sm font-semibold text-orange-400">
              Şantiyenizin akıllı çözüm ortağı.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Akıllı şantiye ve yapı marketiniz. Türkiye genelinde iş makinesi kiralama, yapı malzemesi tedariği ve ağır nakliye hizmetlerini tek platformda buluşturan dijital pazaryeri.
            </p>
            <div className="text-xs text-slate-400 italic">
              &quot;Aradığın her şey, sana en yakın yerde, en iyi tekliflerle!&quot;
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-orange-500 pl-2">
              Kategoriler
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li>
                <Link href="/ilanlar?category=is-makineleri" className="hover:text-orange-400 transition">
                  İş Makineleri Kiralama
                </Link>
              </li>
              <li>
                <Link href="/ilanlar?category=ekskavator" className="hover:text-orange-400 transition pl-2">
                  • Ekskavatör & JCB Kepçe
                </Link>
              </li>
              <li>
                <Link href="/ilanlar?category=vinc" className="hover:text-orange-400 transition pl-2">
                  • Mobil & Kule Vinçler
                </Link>
              </li>
              <li>
                <Link href="/ilanlar?category=yapi-malzemeleri" className="hover:text-orange-400 transition">
                  Yapı Malzemeleri Satışı
                </Link>
              </li>
              <li>
                <Link href="/ilanlar?category=cimento" className="hover:text-orange-400 transition pl-2">
                  • Çimento & Hazır Beton
                </Link>
              </li>
              <li>
                <Link href="/ilanlar?category=demir-donati" className="hover:text-orange-400 transition pl-2">
                  • Nervürlü İnşaat Demiri
                </Link>
              </li>
              <li>
                <Link href="/ilanlar?category=nakliye" className="hover:text-orange-400 transition">
                  Hafriyat & Ağır Nakliyat
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & KVKK */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-orange-500 pl-2">
              Kurumsal & Yasal
            </h3>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li>
                <Link href="/mesafeli-satis-sozlesmesi" className="hover:text-orange-400 transition">
                  Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li>
                <Link href="/iade-ve-iptal-kosullari" className="hover:text-orange-400 transition">
                  İade ve İptal Koşulları
                </Link>
              </li>
              <li>
                <Link href="/uyelik-sozlesmesi" className="hover:text-orange-400 transition">
                  Pazaryeri Üyelik Sözleşmesi
                </Link>
              </li>
              <li>
                <Link href="/reklam-kosullari" className="hover:text-orange-400 transition">
                  Reklam ve Öne Çıkarma Şartları
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="hover:text-orange-400 transition flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                  KVKK Aydınlatma Metni
                </Link>
              </li>
              <li>
                <Link href="/gizlilik" className="hover:text-orange-400 transition">
                  Gizlilik & Çerez Politikası
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-orange-400 transition text-slate-500">
                  Yönetim Paneli (Admin)
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-orange-500 pl-2">
              Güvenli Pazaryeri
            </h3>
            <div className="bg-navy-900 border border-navy-800 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-slate-300">
                  <strong className="text-white">PostGIS Konum Doğrulama:</strong> İlanlar gerçek koordinatlarla haritada listelenir, mesafe filtreleriyle şantiyenize en yakın makinayı anında bulursunuz.
                </p>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-navy-800">
                <PhoneCall className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-slate-300">
                  <strong className="text-white">Doğrudan İletişim:</strong> Aracı komisyonu olmadan onaylı firma telefon ve WhatsApp hattıyla anında irtibata geçin.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Zorunlu Yasal Şirket Künye Alanı (Elektronik Ticaret Mevzuatı Uyarınca) */}
        <div className="pt-6 border-t border-navy-800 text-[11px] text-slate-300 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 border-b border-navy-900 pb-4">
            <div>
              <span className="text-slate-300 block font-bold">Ticari Unvan:</span>
              <span className="text-slate-300 font-mono">[Şirket Ticari Unvanı]</span>
            </div>
            <div>
              <span className="text-slate-300 block font-bold">MERSİS / Vergi No:</span>
              <span className="text-slate-300 font-mono">[MERSİS No] • [Vergi No]</span>
            </div>
            <div>
              <span className="text-slate-300 block font-bold">Merkez Adres:</span>
              <span className="text-slate-300">[Şirket Kayıtlı Tebligat Adresi]</span>
            </div>
            <div>
              <span className="text-slate-300 block font-bold">İletişim & KEP:</span>
              <span className="text-slate-300">destek@santiyego.com • [KEP Adresi]</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <p>© {new Date().getFullYear()} ŞANTİYE GO. Tüm hakları saklıdır.</p>
            <p className="text-[11px] text-slate-300">
              Türkiye Geneli İş Makinesi, Yapı Malzemesi, İskele & İnşaat Hizmetleri Pazaryeri
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
