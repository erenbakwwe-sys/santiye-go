import { Suspense } from 'react';
import SearchClient from './SearchClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'İlanlar | ŞANTİYE GO - İş Makineleri, Yapı Malzemeleri ve Nakliye',
  description: 'Şantiyenize en yakın kiralık iş makineleri, satılık yapı malzemeleri ve nakliye hizmetleri.',
};

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
