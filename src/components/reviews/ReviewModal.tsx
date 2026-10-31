'use client';

import { useState } from 'react';
import { Star, X, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { addReview } from '@/lib/services/review-service';

interface ReviewModalProps {
  companyId: string;
  companyName: string;
  listingId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewModal({
  companyId,
  companyName,
  listingId,
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [qualityRating, setQualityRating] = useState(5);
  const [timingRating, setTimingRating] = useState(5);
  const [commRating, setCommRating] = useState(5);
  const [comment, setComment] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMessage('Lütfen deneyiminizle ilgili bir yorum yazınız.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await addReview({
      company_id: companyId,
      listing_id: listingId,
      buyer_id: 'buyer-demo-001',
      rating_quality: qualityRating,
      rating_timing: timingRating,
      rating_communication: commRating,
      comment: comment.trim(),
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Değerlendirme kaydedilemedi.');
    }
  };

  const renderStarSelector = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? 'fill-amber-400 text-amber-500'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 font-bold text-xs text-navy-900 w-4">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Doğrulanmış Müşteri Değerlendirmesi
            </div>
            <h3 className="font-extrabold text-navy-900 text-base">{companyName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Değerlendirmeniz yayınlandı! Şantiye GO topluluğuna katkınız için teşekkür ederiz.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sub-ratings */}
          <div className="space-y-1">
            {renderStarSelector('Makine / Malzeme Kalitesi', qualityRating, setQualityRating)}
            {renderStarSelector('Zamanlama & Teslimat', timingRating, setTimingRating)}
            {renderStarSelector('İletişim & Şantiye Desteği', commRating, setCommRating)}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Şantiye Deneyiminiz & Yorumunuz *
            </label>
            <textarea
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Makinenin performansı, operatörün tecrübesi veya firmanın teslimat hızı hakkında tarafsız görüşleriniz..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed border border-slate-100">
            Puanınız Bayesian ağırlıklı algoritmayla hesaplanacak ve diğer müteahhitler için şeffaf bir referans oluşturacaktır.
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'YORUMU YAYINLA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
