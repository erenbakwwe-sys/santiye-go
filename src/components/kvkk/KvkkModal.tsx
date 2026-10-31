'use client';

import { X, ShieldCheck } from 'lucide-react';

interface KvkkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KvkkModal({ isOpen, onClose }: KvkkModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-navy-900 text-lg">
                KVKK Aydınlatma Metni
              </h3>
              <p className="text-xs text-slate-500">
                6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            <strong>ŞANTİYE GO</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca veri sorumlusu sıfatıyla, platformumuza kayıt olan ve hizmetlerimizden faydalanan kullanıcılarımızın kişisel verilerini güvence altına almaktayız.
          </p>
          <h4 className="font-bold text-navy-900 text-sm">1. İşlenen Kişisel Veriler</h4>
          <p>
            Ad-soyad, telefon numarası, e-posta adresi, firma unvanı, vergi dairesi/numarası, il/ilçe lokasyon bilgisi ve ilanlara ilişkin koordinat verileri.
          </p>
          <h4 className="font-bold text-navy-900 text-sm">2. Veri İşleme Amaçları</h4>
          <p>
            İş makineleri, yapı malzemeleri ve nakliye hizmetlerinin konum bazlı listelenmesi, alıcı ile satıcı firma arasında doğrudan iletişimin sağlanması, platform güvenliğinin temini ve yasal yükümlülüklerin yerine getirilmesi.
          </p>
          <h4 className="font-bold text-navy-900 text-sm">3. Verilerin Aktarılması</h4>
          <p>
            Kişisel verileriniz, açık rızanız olmaksızın üçüncü taraflara ticari amaçlarla devredilmez. Yalnızca yasal zorunluluklar gereği yetkili kamu kurum ve kuruluşlarına aktarılabilir.
          </p>
          <h4 className="font-bold text-navy-900 text-sm">4. Haklarınız</h4>
          <p>
            KVKK 11. maddesi kapsamında dilediğiniz zaman verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini talep etme hakkına sahipsiniz.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-sm hover:bg-orange-500 transition shadow-sm"
          >
            Okudum, Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
