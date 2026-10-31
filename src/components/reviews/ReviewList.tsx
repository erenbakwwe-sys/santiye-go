'use client';

import { useState } from 'react';
import {
  Star,
  ShieldCheck,
  MessageCircle,
  CornerDownRight,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  VerifiedReviewWithUser,
  calculateBayesianRating,
  addCompanyReply,
} from '@/lib/services/review-service';

interface ReviewListProps {
  reviews: VerifiedReviewWithUser[];
  companyName: string;
  isCompanyUser?: boolean;
  onRefresh?: () => void;
}

export default function ReviewList({
  reviews,
  companyName,
  isCompanyUser = false,
  onRefresh,
}: ReviewListProps) {
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');

  const stats = calculateBayesianRating(reviews);

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyInputs[reviewId];
    if (!text || !text.trim()) return;

    setSubmittingReply(true);
    setReplyError('');

    const res = await addCompanyReply(reviewId, text.trim());
    setSubmittingReply(false);

    if (res.success) {
      setActiveReplyBox(null);
      if (onRefresh) onRefresh();
    } else {
      setReplyError(res.error || 'Yanıt iletilemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Top Ratings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base sm:text-lg font-black text-navy-900 flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            Doğrulanmış Değerlendirmeler & Yorumlar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Yalnızca platform üzerinden makine kiralayan veya sipariş tamamlayan müteahhitlerin yorumlarıdır.
          </p>
        </div>

        {/* Rating Score Badge */}
        {stats.totalCount > 0 ? (
          <div className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/80 px-4 py-2.5 rounded-xl shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1 font-black text-navy-900 text-lg">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{stats.actualAvg}</span>
                <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {stats.totalCount} Değerlendirme • Bayesian: {stats.bayesianScore}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold shrink-0">
            Henüz değerlendirilmedi
          </div>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
          Bu firma veya ilan için henüz bir müşteri yorumu yapılmamış. Tamamlanan rezervasyon sonrası değerlendirilebilir.
        </div>
      ) : (
        <div className="space-y-5 divide-y divide-slate-100">
          {reviews.map((rev) => (
            <div key={rev.id} className="pt-5 first:pt-0 space-y-3">
              {/* Review Author & Scores */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-navy-900 text-sm">
                      {rev.buyer_name}
                    </span>
                    {rev.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        Doğrulanmış İşlem
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(rev.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Sub-ratings breakdown */}
                <div className="flex items-center gap-3 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <span>
                    Kalite: <strong className="text-navy-900">{rev.rating_quality}</strong>/5
                  </span>
                  <span>•</span>
                  <span>
                    Zamanlama: <strong className="text-navy-900">{rev.rating_timing}</strong>/5
                  </span>
                  <span>•</span>
                  <span>
                    İletişim: <strong className="text-navy-900">{rev.rating_communication}</strong>/5
                  </span>
                </div>
              </div>

              {/* Review text */}
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {rev.comment}
              </p>

              {/* Company Reply Box (if exists) */}
              {rev.company_reply && (
                <div className="ml-4 sm:ml-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-navy-900 text-[11px]">
                    <CornerDownRight className="w-3.5 h-3.5 text-orange-500" />
                    <span>{companyName} Yanıtı</span>
                    {rev.company_reply_at && (
                      <span className="text-slate-400 font-normal">
                        ({new Date(rev.company_reply_at).toLocaleDateString('tr-TR')})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 pl-5 leading-relaxed">{rev.company_reply}</p>
                </div>
              )}

              {/* Company Reply Input (Only one reply allowed, no debate thread) */}
              {isCompanyUser && !rev.company_reply && (
                <div className="pt-1">
                  {activeReplyBox === rev.id ? (
                    <div className="ml-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-navy-900 block">
                        Müşterinize Yanıt Yazın (Tek seferlik yanıt):
                      </span>
                      {replyError && (
                        <div className="text-[11px] text-red-600">{replyError}</div>
                      )}
                      <textarea
                        rows={2}
                        value={replyInputs[rev.id] || ''}
                        onChange={(e) =>
                          setReplyInputs({ ...replyInputs, [rev.id]: e.target.value })
                        }
                        placeholder="Müşterinize nazik bir teşekkür veya açıklama iletin..."
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReplyBox(null)}
                          className="px-3 py-1 rounded text-xs text-slate-500 hover:bg-slate-200 font-semibold"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          disabled={submittingReply}
                          onClick={() => handleReplySubmit(rev.id)}
                          className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                        >
                          {submittingReply ? 'Kaydediliyor...' : 'Yanıtı Yayınla'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveReplyBox(rev.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Değerlendirmeyi Yanıtla
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
