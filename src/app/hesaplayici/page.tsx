'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calculator,
  ArrowLeft,
  ChevronRight,
  Layers,
  HardHat,
  Wrench,
  Home,
  ArrowRight,
  CheckCircle2,
  Info,
  Zap,
} from 'lucide-react';
import {
  calculateBeton,
  calculateDemir,
  calculateDuvar,
  calculateIskeleMant,
  betonToQuoteDescription,
  demirToQuoteDescription,
  duvarToQuoteDescription,
  iskeleToQuoteDescription,
  type BetonSinifi,
  type DuvarMalzeme,
} from '@/lib/utils/constructionCalculators';

// ─── Ortak yardımcı bileşenler ───────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-700 mb-1.5">{children}</label>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder = '',
  unit,
}: {
  value: number | string;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 pr-14 bg-white"
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-0.5 border ${
        highlight
          ? 'bg-orange-500 border-orange-500 text-white'
          : 'bg-white border-slate-200 text-navy-900'
      }`}
    >
      <span className={`text-[11px] font-bold ${highlight ? 'text-orange-100' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`text-2xl font-black leading-tight ${highlight ? 'text-white' : 'text-navy-900'}`}>
        {value}
      </span>
      {sub && (
        <span className={`text-[11px] mt-0.5 ${highlight ? 'text-orange-100' : 'text-slate-400'}`}>
          {sub}
        </span>
      )}
    </div>
  );
}

function QuoteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-5 flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-navy-900 hover:bg-navy-800 text-white font-black text-sm shadow-lg transition group"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="text-sm font-black leading-tight">1 Tıkla Teklif İste</div>
          <div className="text-[11px] text-slate-300 font-normal mt-0.5">
            Hesaplanan miktarı forma otomatik aktar, bölgendeki tedarikçilerden teklif al
          </div>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-orange-400 shrink-0 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

// ─── SEKME 1: Hazır Beton ────────────────────────────────────

function BetonTab({ onQuote }: { onQuote: (title: string, desc: string, qty: number, categorySlug?: string) => void }) {
  const [alan, setAlan] = useState<number>(0);
  const [kalinlik, setKalinlik] = useState<number>(20);
  const [sinif, setSinif] = useState<BetonSinifi>('C30');

  const result = alan > 0 && kalinlik > 0
    ? calculateBeton({ alan, kalinlik, sinif })
    : null;

  const handleQuote = () => {
    if (!result) return;
    const title = `${result.toplamM3} m³ ${sinif} Hazır Beton Talebi`;
    const desc = betonToQuoteDescription(result, { alan, kalinlik, sinif });
    onQuote(title, desc, result.toplamM3, 'hazir-beton');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Döküm Alanı (m²) *</FieldLabel>
          <NumberInput value={alan || ''} onChange={setAlan} min={0} step={0.5} placeholder="Örn: 150" unit="m²" />
        </div>
        <div>
          <FieldLabel>Plak/Döşeme Kalınlığı (cm) *</FieldLabel>
          <NumberInput value={kalinlik || ''} onChange={setKalinlik} min={1} step={1} placeholder="Örn: 20" unit="cm" />
        </div>
        <div>
          <FieldLabel>Beton Sınıfı</FieldLabel>
          <select
            value={sinif}
            onChange={(e) => setSinif(e.target.value as BetonSinifi)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="C25">C25 – Normal Mukavemet</option>
            <option value="C30">C30 – Standart (Önerilen)</option>
            <option value="C35">C35 – Yüksek Mukavemet</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <span>Fire payı %5 olarak hesaplanmaktadır. 1 transmikser = 9 m³ kabul edilmiştir.</span>
      </div>

      {result && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Net Hacim" value={`${result.netM3} m³`} />
            <ResultCard label="Fire Payı (%5)" value={`${result.firePay} m³`} />
            <ResultCard label="Toplam Beton" value={`${result.toplamM3} m³`} highlight />
            <ResultCard
              label="Transmikser"
              value={`${result.mikserSayisi} sefer`}
              sub="1 sefer = 9 m³"
            />
          </div>
          <QuoteButton onClick={handleQuote} />
        </div>
      )}
    </div>
  );
}

// ─── SEKME 2: Demir Tonajı ───────────────────────────────────

function DemirTab({ onQuote }: { onQuote: (title: string, desc: string, qty: number, categorySlug?: string) => void }) {
  const [alan, setAlan] = useState<number>(0);
  const [katSayisi, setKatSayisi] = useState<number>(1);

  const result = alan > 0 && katSayisi > 0
    ? calculateDemir({ alan, katSayisi })
    : null;

  const handleQuote = () => {
    if (!result) return;
    const title = `${result.tahminiTonaj} Ton Nervürlü İnşaat Demiri Talebi`;
    const desc = demirToQuoteDescription(result, { alan, katSayisi });
    onQuote(title, desc, result.tahminiTonaj, 'demir-donati');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Toplam İnşaat Alanı (m²) *</FieldLabel>
          <NumberInput value={alan || ''} onChange={setAlan} min={0} step={1} placeholder="Örn: 500" unit="m²" />
        </div>
        <div>
          <FieldLabel>Kat Sayısı *</FieldLabel>
          <NumberInput value={katSayisi || ''} onChange={setKatSayisi} min={1} step={1} placeholder="Örn: 5" unit="kat" />
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <span>
          Hesaplama katsayısı: <strong>30 kg/m²/kat</strong> (TS 500 uyumlu, orta yoğunluk konut).
          Bodrum kat veya yüksek yük yapılarda mühendis onayı alınız.
        </span>
      </div>

      {result && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ResultCard label="Toplam Alan" value={`${alan * katSayisi} m²`} sub={`${alan} m² × ${katSayisi} kat`} />
            <ResultCard label="Hesap Katsayısı" value="30 kg/m²" sub="Orta Yoğunluk" />
            <ResultCard label="Tahmini Tonaj" value={`${result.tahminiTonaj} ton`} highlight />
          </div>
          <QuoteButton onClick={handleQuote} />
        </div>
      )}
    </div>
  );
}

// ─── SEKME 3: Duvar Malzemesi ────────────────────────────────

function DuvarTab({ onQuote }: { onQuote: (title: string, desc: string, qty: number, categorySlug?: string) => void }) {
  const [duvarAlani, setDuvarAlani] = useState<number>(0);
  const [boslukAlani, setBoslukAlani] = useState<number>(0);
  const [malzeme, setMalzeme] = useState<DuvarMalzeme>('tugla');

  const result = duvarAlani > 0
    ? calculateDuvar({ duvarAlani, boslukAlani, malzeme })
    : null;

  const handleQuote = () => {
    if (!result) return;
    const title = `${result.adet.toLocaleString('tr-TR')} Adet ${result.malzemeAdi} Talebi`;
    const desc = duvarToQuoteDescription(result, { duvarAlani, boslukAlani, malzeme });
    onQuote(title, desc, result.adet, malzeme === 'gazbeton' ? 'gazbeton' : 'tugla-bims');
  };

  const malzemeLabels: Record<DuvarMalzeme, string> = {
    tugla: 'Delikli Tuğla (19×19×8.5 cm)',
    bims: 'Bims Blok (40×20×20 cm)',
    gazbeton: 'Gazbeton / AAC (60×20×25 cm)',
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Toplam Duvar Alanı (m²) *</FieldLabel>
          <NumberInput value={duvarAlani || ''} onChange={setDuvarAlani} min={0} step={0.5} placeholder="Örn: 300" unit="m²" />
        </div>
        <div>
          <FieldLabel>Kapı/Pencere Boşlukları (m²)</FieldLabel>
          <NumberInput value={boslukAlani || ''} onChange={setBoslukAlani} min={0} step={0.5} placeholder="Örn: 40" unit="m²" />
        </div>
        <div>
          <FieldLabel>Malzeme Türü</FieldLabel>
          <select
            value={malzeme}
            onChange={(e) => setMalzeme(e.target.value as DuvarMalzeme)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            {(Object.keys(malzemeLabels) as DuvarMalzeme[]).map((k) => (
              <option key={k} value={k}>{malzemeLabels[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {result && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Net Duvar Alanı" value={`${result.netAlan} m²`} />
            <ResultCard label="Malzeme" value={result.birimBoyut} sub={result.malzemeAdi.split('(')[0].trim()} />
            <ResultCard label="Gereken Adet" value={result.adet.toLocaleString('tr-TR')} highlight />
            <ResultCard
              label="Harç/Yapıştırıcı"
              value={`${result.harcTorba} torba`}
              sub="~25 kg torba"
            />
          </div>
          <QuoteButton onClick={handleQuote} />
        </div>
      )}
    </div>
  );
}

// ─── SEKME 4: İskele & Mantolama ─────────────────────────────

function IskeleMantTab({ onQuote }: { onQuote: (title: string, desc: string, qty: number, categorySlug?: string) => void }) {
  const [cepheAlani, setCepheAlani] = useState<number>(0);

  const result = cepheAlani > 0
    ? calculateIskeleMant({ cepheAlani })
    : null;

  const handleQuote = () => {
    if (!result) return;
    const title = `${cepheAlani} m² Dış Cephe İskele & Mantolama Talebi`;
    const desc = iskeleToQuoteDescription(result, { cepheAlani });
    onQuote(title, desc, cepheAlani, 'cephe-iskelesi');
  };

  return (
    <div className="space-y-5">
      <div className="max-w-xs">
        <FieldLabel>Brüt Cephe Alanı (m²) *</FieldLabel>
        <NumberInput
          value={cepheAlani || ''}
          onChange={setCepheAlani}
          min={0}
          step={1}
          placeholder="Örn: 800"
          unit="m²"
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <span>
          İskele alanına %10 güvenlik payı eklenmiştir. Yalıtım: 60×100 cm, 6&apos;lı paket ≈ 3.6 m².
          Dış cephe boyası 15 kg kova, 2 kat üzerinden hesaplanmıştır.
        </span>
      </div>

      {result && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="İskele Alanı" value={`${result.iskeleMkare} m²`} highlight />
            <ResultCard
              label="Yalıtım Paketi"
              value={`${result.yalitimPaket} paket`}
              sub="60×100 cm, 6&apos;lı"
            />
            <ResultCard label="Dış Cephe Boya" value={`${result.boyaKova} kova`} sub="15 kg, 2 kat" />
            <ResultCard label="Fiber File" value={`${result.mantolameKmetre} rulo`} sub="~25 m² / rulo" />
          </div>
          <QuoteButton onClick={handleQuote} />
        </div>
      )}
    </div>
  );
}

// ─── Ana Sayfa Bileşeni ───────────────────────────────────────

type TabId = 'beton' | 'demir' | 'duvar' | 'iskele';

const TABS: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'beton',
    label: 'Hazır Beton',
    icon: <Layers className="w-4 h-4" />,
    desc: 'Alan + Kalınlık → m³ + Transmikser',
  },
  {
    id: 'demir',
    label: 'İnşaat Demiri',
    icon: <Wrench className="w-4 h-4" />,
    desc: 'İnşaat Alanı + Kat → Tonaj',
  },
  {
    id: 'duvar',
    label: 'Duvar Malzemesi',
    icon: <Home className="w-4 h-4" />,
    desc: 'Alan + Malzeme → Adet + Harç',
  },
  {
    id: 'iskele',
    label: 'İskele & Mantolama',
    icon: <HardHat className="w-4 h-4" />,
    desc: 'Cephe → İskele + Yalıtım + Boya',
  },
];

export default function HesaplayiciPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('beton');
  const [toastMsg, setToastMsg] = useState('');

  const handleQuote = useCallback(
    (title: string, description: string, qty: number, categorySlug?: string) => {
      // URLSearchParams değerleri zaten kodlar; ayrıca encodeURIComponent çağrılmaz (çift kodlama olmaz).
      const params = new URLSearchParams({
        from_calc: '1',
        title,
        description,
        qty: String(Math.max(1, Math.ceil(Number.isFinite(qty) ? qty : 1))),
      });
      if (categorySlug) params.set('cat', categorySlug);
      setToastMsg('Hesaplama formu dolduruluyor…');
      setTimeout(() => {
        router.push(`/teklif-iste?${params.toString()}`);
      }, 300);
    },
    [router]
  );

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-navy-900 transition font-semibold flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Ana Sayfa
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-bold text-navy-900">Metraj Hesaplayıcı</span>
        </div>

        {/* Hero Banner */}
        <div className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-[11px] font-black border border-orange-500/30">
                Ücretsiz Metraj Aracı
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Saha Metraj & Malzeme Hesaplayıcı
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-2xl">
              Alan ve kat bilgilerini gir, anlık metraj al. Hesaplamayı tek tıkla{' '}
              <span className="text-orange-400 font-bold">bölgenizdeki tedarikçilere teklif talebine</span> dönüştür.
            </p>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-sm text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {toastMsg}
          </div>
        )}

        {/* Tab Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition ${
                activeTab === tab.id
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 font-black text-sm ${
                  activeTab === tab.id ? 'text-orange-600' : 'text-navy-900'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-orange-500' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                {tab.label}
              </div>
              <span className="text-[11px] text-slate-400 leading-tight">{tab.desc}</span>
              {activeTab === tab.id && (
                <span className="w-full h-0.5 rounded-full bg-orange-500 mt-1" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-extrabold text-navy-900 mb-5 flex items-center gap-2">
            <span className="text-orange-500">
              {TABS.find((t) => t.id === activeTab)?.icon}
            </span>
            {TABS.find((t) => t.id === activeTab)?.label} Hesabı
          </h2>

          {activeTab === 'beton' && <BetonTab onQuote={handleQuote} />}
          {activeTab === 'demir' && <DemirTab onQuote={handleQuote} />}
          {activeTab === 'duvar' && <DuvarTab onQuote={handleQuote} />}
          {activeTab === 'iskele' && <IskeleMantTab onQuote={handleQuote} />}
        </div>

        {/* Bottom CTA */}
        <div className="mt-6 p-5 bg-orange-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <p className="text-sm font-black text-navy-900">İhtiyacınız hesaplayıcıda yok mu?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Çok kalemli veya özel işler için doğrudan teklif talebi formunu kullanabilirsiniz.
            </p>
          </div>
          <Link
            href="/teklif-iste"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm transition shadow-md whitespace-nowrap"
          >
            Teklif İste
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
