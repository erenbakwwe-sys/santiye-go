'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Check,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import {
  MEMBERSHIP_PLANS,
  getCompanySubscription,
  upgradeCompanyPlan,
  checkCompanyLimits,
} from '@/lib/services/membership-service';
import { MembershipPlan, CompanySubscription } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function CompanyMembershipPage() {
  const [companyId, setCompanyId] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<MembershipPlan>(MEMBERSHIP_PLANS[0]);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [limits, setLimits] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [upgrading, setUpgrading] = useState(false);
  const [notice, setNotice] = useState('');

  const supabase = createClient();

  const loadData = async (activeCompId?: string) => {
    const targetId = activeCompId || companyId;
    if (!targetId) return;

    const [{ subscription: s, plan: p }, l] = await Promise.all([
      getCompanySubscription(targetId),
      checkCompanyLimits(targetId),
    ]);
    setSubscription(s);
    setCurrentPlan(p);
    setLimits(l);
  };

  useEffect(() => {
    async function initUserCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: comp } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (comp?.id) {
          setCompanyId(comp.id);
          loadData(comp.id);
          return;
        }
      }
      // Demo veya bulunamayan durum
      loadData('default-company');
    }
    initUserCompany();
  }, []);

  const handleUpgrade = async (planId: 'pro' | 'premium') => {
    if (!companyId) return;
    setUpgrading(true);
    await upgradeCompanyPlan(companyId, planId, billingCycle);
    setUpgrading(false);
    setNotice(
      `Tebrikler! ${planId === 'premium' ? 'Premium Tedarikçi' : 'Profesyonel'} paketine başarıyla geçtiniz.`
    );
    loadData(companyId);
    setTimeout(() => setNotice(''), 4000);
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('tr-TR') + ' ₺';
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/firma-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Firma Paneline Dön
          </Link>
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
            Firma Üyelik & Avantajlar
          </span>
        </div>

        {/* Current Plan Overview Header */}
        <div className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[11px] font-black uppercase tracking-wider">
                Mevcut Üyeliğiniz
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-300 font-semibold">
                Yenilenme: {subscription ? new Date(subscription.current_period_end).toLocaleDateString('tr-TR') : '-'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>{currentPlan.name}</span>
              {currentPlan.has_premium_badge && (
                <ShieldCheck className="w-6 h-6 text-orange-400" />
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              İlan limitlerinizi yönetin, daha fazla şantiyeye teklif verin ve indirimli komisyon oranlarından yararlanın.
            </p>
          </div>

          {/* Quota Progress Meter */}
          {limits && (
            <div className="bg-navy-950/80 p-5 rounded-2xl border border-navy-800 text-xs w-full md:w-72 space-y-3 shrink-0">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-300">Aktif İlan Kullanımı:</span>
                <span className="text-orange-400">
                  {limits.activeListingsCount} / {limits.listingLimit}
                </span>
              </div>
              <div className="w-full bg-navy-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (limits.activeListingsCount / limits.listingLimit) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-400">
                Fotoğraf Limiti: <strong>{currentPlan.photo_limit} adet / ilan</strong>
              </div>
            </div>
          )}
        </div>

        {notice && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl flex items-center gap-3 text-xs sm:text-sm shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{notice}</span>
          </div>
        )}

        {/* Billing Cycle Switcher */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span
            className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-navy-900' : 'text-slate-400'}`}
          >
            Aylık Ödeme
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-14 h-7 rounded-full bg-navy-900 p-1 relative transition"
          >
            <div
              className={`w-5 h-5 rounded-full bg-orange-500 transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span
            className={`text-xs font-bold flex items-center gap-1.5 ${
              billingCycle === 'yearly' ? 'text-navy-900' : 'text-slate-400'
            }`}
          >
            <span>Yıllık Ödeme</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              2 Ay Bedava!
            </span>
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isCurrent = currentPlan.id === plan.id;
            const price =
              billingCycle === 'yearly' ? plan.price_yearly_cents : plan.price_monthly_cents;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-2 border-orange-500 ring-2 ring-orange-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
                      {plan.id === 'premium' ? 'Tavsiye Edilen' : 'Plan'}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-black">
                        AKTİF PAKETİNİZ
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-navy-900">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-navy-900">
                        {formatPrice(price)}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        /{billingCycle === 'yearly' ? 'yıl' : 'ay'}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>{plan.listing_limit === 999 ? 'Sınırsız' : plan.listing_limit}</strong> Aktif İlan Hakkı
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>İlan başı <strong>{plan.photo_limit} Fotoğraf</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Aylık <strong>{plan.monthly_quote_limit === 9999 ? 'Sınırsız' : plan.monthly_quote_limit}</strong> Teklif Verme
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Komisyon İndirimi: <strong>%{plan.commission_discount_percent} Ek İndirim</strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {plan.has_premium_badge ? 'Öncelikli Rozet & Doğrulanmış Firma' : 'Standart Tedarikçi Rozeti'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-default"
                    >
                      Mevcut Planınız
                    </button>
                  ) : plan.id === 'free' ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs"
                    >
                      Ücretsiz Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={upgrading}
                      onClick={() => handleUpgrade(plan.id as 'pro' | 'premium')}
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{upgrading ? 'İşleniyor...' : 'Bu Pakete Yükselt'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Graceful Downgrade Assurance Banner */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-600 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-navy-900">
              Abonelik Süresi Bittiğinde İlanlarıma Ne Olur?
            </div>
            <p className="text-slate-500 leading-relaxed">
              Şantiye GO politikasında ilanlarınız asla silinmez. Üyeliğiniz sona ererse hesabınız otomatik olarak Ücretsiz Başlangıç paketine geçer. Limit üzerindeki eski ilanlarınız pasife alınır ve dilediğiniz an paketinizi yenileyerek tek tıkla tekrar yayına alabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
