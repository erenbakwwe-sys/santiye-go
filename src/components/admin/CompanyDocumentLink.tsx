'use client';

import { useEffect, useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Firma doğrulama belgesini (özel "company-documents" kovası) yöneticiye 10 dakikalık
 * imzalı bağlantıyla gösterir. Eski kayıtlarda tam URL saklanmışsa olduğu gibi kullanılır.
 */
export default function CompanyDocumentLink({ value }: { value?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(false);
    if (!value) return;
    if (/^https?:\/\//i.test(value)) {
      setUrl(value);
      return;
    }
    const supabase = createClient();
    supabase.storage
      .from('company-documents')
      .createSignedUrl(value, 600)
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e || !data?.signedUrl) setError(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!value) return <div className="text-slate-500 py-6 text-center">Yüklenmemiş</div>;
  if (error) return <div className="text-red-600 py-6 text-center">Belge açılamadı</div>;
  if (!url) return <div className="text-slate-500 py-6 text-center">Yükleniyor…</div>;

  const isImage = /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border border-slate-200 overflow-hidden hover:border-slate-400"
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Firma belgesi" className="w-full aspect-video object-cover" />
      ) : (
        <span className="flex items-center gap-2 p-4 text-navy-900 font-medium">
          <FileText className="w-5 h-5 text-orange-600" />
          Belgeyi aç (PDF)
          <ExternalLink className="w-4 h-4 ml-auto text-slate-500" />
        </span>
      )}
    </a>
  );
}
