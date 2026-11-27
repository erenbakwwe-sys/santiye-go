'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HelpCircle, X, BookOpen, Phone, MessageCircle, Mail, PlayCircle } from 'lucide-react';
import { OPEN_INTRO_EVENT } from './IntroGuide';

const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
const whatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim();
const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'destek@santiyego.com';

/** 0532 123 45 67 / +90 532... -> 905321234567 (wa.me biçimi) */
function toWaNumber(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90')) return digits;
  if (digits.startsWith('0')) return `9${digits}`;
  return `90${digits}`;
}

/**
 * Her sayfada sağ altta duran "Yardım" düğmesi.
 * Telefon / WhatsApp numarası NEXT_PUBLIC_SUPPORT_PHONE ve NEXT_PUBLIC_SUPPORT_WHATSAPP
 * ortam değişkenlerinden okunur; tanımlı değilse o satır gösterilmez.
 */
export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const row =
    'flex items-center gap-3 w-full px-4 py-3.5 text-left text-base text-navy-900 hover:bg-slate-50 transition-colors';

  return (
    <div ref={panelRef} className="fixed right-4 bottom-[76px] md:right-6 md:bottom-6 z-40 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Yardım"
          className="absolute right-0 bottom-16 w-[min(320px,calc(100vw-2rem))] bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 bg-navy-900 text-white flex items-center justify-between">
            <span className="font-semibold">Size nasıl yardımcı olalım?</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 text-slate-300 hover:text-white"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            <Link href="/nasil-kullanilir" onClick={() => setOpen(false)} className={row}>
              <BookOpen className="w-5 h-5 text-orange-600 shrink-0" />
              <span>
                <span className="block font-medium">Nasıl kullanılır?</span>
                <span className="block text-sm text-slate-600">Adım adım anlatım</span>
              </span>
            </Link>
            <button
              type="button"
              className={row}
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event(OPEN_INTRO_EVENT));
              }}
            >
              <PlayCircle className="w-5 h-5 text-orange-600 shrink-0" />
              <span>
                <span className="block font-medium">Kısa tanıtımı izle</span>
                <span className="block text-sm text-slate-600">3 adımda site nasıl çalışır</span>
              </span>
            </button>
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, '')}`} className={row}>
                <Phone className="w-5 h-5 text-orange-600 shrink-0" />
                <span>
                  <span className="block font-medium">Bizi arayın</span>
                  <span className="block text-sm text-slate-600 tabular">{phone}</span>
                </span>
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${toWaNumber(whatsapp)}?text=${encodeURIComponent('Merhaba, ŞantiyeGO hakkında yardım almak istiyorum.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={row}
              >
                <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <span className="block font-medium">WhatsApp&apos;tan yazın</span>
                  <span className="block text-sm text-slate-600 tabular">{whatsapp}</span>
                </span>
              </a>
            )}
            <a href={`mailto:${email}`} className={row}>
              <Mail className="w-5 h-5 text-orange-600 shrink-0" />
              <span>
                <span className="block font-medium">E-posta gönderin</span>
                <span className="block text-sm text-slate-600">{email}</span>
              </span>
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 h-11 md:h-12 pl-3.5 pr-4 md:pl-4 md:pr-5 rounded-full bg-navy-900 hover:bg-navy-800 text-white text-base font-semibold shadow-xl transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
        Yardım
      </button>
    </div>
  );
}
