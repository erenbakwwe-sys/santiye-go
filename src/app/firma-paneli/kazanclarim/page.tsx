'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  Building2,
  ArrowLeft,
  ShieldCheck,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToTRY } from '@/lib/services/commission-service';

export default function CompanyEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [companyTransactions, setCompanyTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function loadFinances() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: comp } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (comp) {
            const { data } = await supabase
              .from('payments')
              .select('*')
              .eq('company_id', comp.id)
              .order('created_at', { ascending: false });

            if (data) {
              setCompanyTransactions(data);
            }
          }
        }
      } catch {
        setCompanyTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    loadFinances();
  }, []);

  const totalVolumeCents = companyTransactions.reduce((acc, t) => acc + (t.amount_cents || 0), 0);
  const totalCommissionCents = companyTransactions.reduce((acc, t) => acc + (t.commission_amount_cents || 0), 0);
  const transferredCents = companyTransactions
    .filter((t) => t.status === 'transferred')
    .reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);
  const pendingCents = companyTransactions
    .filter((t) => t.status === 'paid' || t.status === 'pending')
    .reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);
  const totalCappedSavingsCents = companyTransactions.reduce(
    (acc, t) => acc + (t.capped_commission_savings_cents || 0),
    0
  );

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/firma-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Firma Paneline Dön
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              iyzico Pazaryeri Entegrasyonu Aktif
            </span>
          </div>
        </div>

        {/* Top Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-black uppercase">
              Firma Finans
            </span>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Kazançlarım & Hakediş Raporu
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Platform üzerinden gerçekleşen kiralama ve satış ödemelerinizi, kesintileri ve banka transferlerini takip edin.
            </p>
          </div>

          {/* Submerchant IBAN Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-0.5 shrink-0">
            <div className="text-slate-400 font-bold uppercase text-[10px]">
              Kayıtlı Transfer IBAN:
            </div>
            <div className="font-mono font-bold text-navy-900">
              TR33 0006 1005 1112 3456 7890 01
            </div>
            <div className="text-[10px] text-emerald-600 font-bold">
              Ziraat Bankası • Doğrulanmış Hesap
            </div>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase">Toplam İşlem Hacmi</div>
            <div className="text-2xl font-black text-navy-900">
              {formatCentsToTRY(totalVolumeCents)}
            </div>
            <div className="text-[11px] text-slate-400">2 Rezervasyon Ödemesi</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase">Platform Komisyonu</div>
            <div className="text-2xl font-black text-orange-600">
              {formatCentsToTRY(totalCommissionCents)}
            </div>
            <div className="text-[11px] text-slate-400">Ortalama %7.5 (KDV Dahil)</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase">IBAN&apos;a Aktarılan</div>
            <div className="text-2xl font-black text-emerald-600">
              {formatCentsToTRY(transferredCents)}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold">Hesabınıza Geçti</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase">Havuzda Bekleyen</div>
            <div className="text-2xl font-black text-blue-600">
              {formatCentsToTRY(pendingCents)}
            </div>
            <div className="text-[11px] text-slate-400">İş Teslimi Sonrası Aktarılacak</div>
          </div>
        </div>

        {/* Information Alert */}
        <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl text-xs text-orange-950 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">iyzico Güvenli Pazaryeri Hakediş Süreci Hakkında:</div>
            <p className="text-slate-600 leading-relaxed">
              Alıcının yaptığı ödeme güvenli havuz hesabında tutulur. Şantiye sahasında makine teslim edildiğinde rezervasyon tamamlanır ve platform komisyonu ayrıştırılarak kalan net tutar otomatik olarak kayıtlı IBAN numaranıza transfer edilir.
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
          <h2 className="text-base font-extrabold text-navy-900 border-b border-slate-100 pb-3">
            Hakediş Hareketleri ({companyTransactions.length})
          </h2>

          {companyTransactions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-navy-900">Henüz Tamamlanan Bir Finansal Hareket Yok</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Kiralama rezervasyonları tamamlandığında ve hakediş ödemeleri gerçekleştiğinde tüm hesap dökümleriniz burada listelenecektir.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-4">İşlem & Tarih</th>
                  <th className="py-3 px-4">Müteahhit / Alıcı</th>
                  <th className="py-3 px-4">Tahsil Edilen</th>
                  <th className="py-3 px-4">Komisyon (%)</th>
                  <th className="py-3 px-4">Net Hakedişiniz</th>
                  <th className="py-3 px-4">Banka Aktarımı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {companyTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-navy-900">{t.id}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(t.created_at).toLocaleDateString('tr-TR')}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-navy-900">{t.buyer?.full_name}</div>
                      <div className="text-[11px] text-slate-500">{t.buyer?.phone}</div>
                    </td>

                    <td className="py-3 px-4 font-black text-navy-900 text-sm">
                      {formatCentsToTRY(t.amount_cents)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-orange-600">
                        -{formatCentsToTRY(t.commission_amount_cents)}
                      </div>
                      <div className="text-[10px] text-slate-400">%{t.commission_rate_percent}</div>
                      {t.is_commission_capped && (
                        <div className="mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            Tavan Uygulandı
                          </span>
                          {t.capped_commission_savings_cents > 0 && (
                            <div className="text-[10px] text-emerald-600 font-bold">
                              +{formatCentsToTRY(t.capped_commission_savings_cents)} Tasarruf
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-black text-emerald-700 text-sm">
                      {formatCentsToTRY(t.net_company_amount_cents)}
                    </td>

                    <td className="py-3 px-4">
                      {t.status === 'transferred' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> IBAN&apos;a Gönderildi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          <Clock className="w-3.5 h-3.5" /> Havuzda (Teslim Bekleniyor)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
