import Link from 'next/link';
import { Phone, PhoneCall } from 'lucide-react';

/**
 * "Bölgenizde ilan yoksa talebinizi bize yazın, sizin için firma bulup arayalım."
 * Teklif talebi bölgede uygun firma bulamazsa ŞantiyeGO Tedarik hesabına ve yöneticilere
 * düşer (bkz. quote_requests_distribute); bu kutu o akışa yönlendirir.
 */
export default function FindSupplierBox({ compact = false }: { compact?: boolean }) {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
  return (
    <div
      className={`bg-orange-50 border-2 border-orange-200 rounded-md ${compact ? 'p-5' : 'p-5 sm:p-7'} flex flex-col md:flex-row md:items-center gap-5`}
    >
      <span className="shrink-0 w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center">
        <PhoneCall className="w-6 h-6" strokeWidth={1.75} />
      </span>
      <div className="flex-1">
        <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-navy-900`}>
          Bölgenizde ilan yok mu? Sizin için firma bulup arayalım
        </h2>
        <p className="mt-1.5 text-base text-slate-700 leading-relaxed">
          Neye ihtiyacınız olduğunu yazın. Bölgenizde uygun firma yoksa talebiniz ekibimize gelir; sizi arar, uygun
          firmayı biz buluruz. Ücretsizdir.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
        <Link href="/teklif-iste" className="btn-primary">
          Talebimi yazayım
        </Link>
        {phone && (
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn-secondary">
            <Phone className="w-5 h-5" />
            {phone}
          </a>
        )}
      </div>
    </div>
  );
}
