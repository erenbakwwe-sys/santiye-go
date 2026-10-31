'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2, ShieldCheck, Settings } from 'lucide-react';

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [preferences, setPreferences] = useState({
    messages: true,
    quotes: true,
    bookings: true,
    adExpiry: true,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        // Show demo notification
        reg.showNotification('ŞANTİYE GO Bildirimleri Aktif!', {
          body: 'Yeni teklif, rezervasyon ve mesaj bildirimlerini anında alacaksınız.',
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
        });
      }
    } catch (e) {
      console.error('Push notification permission error', e);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            {permission === 'granted' ? (
              <BellRing className="w-5 h-5 text-orange-500" />
            ) : (
              <Bell className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-navy-900 text-sm">
              Web Push Bildirimleri
            </h3>
            <p className="text-xs text-slate-500">
              {permission === 'granted'
                ? 'Bildirimler etkin. Yeni teklif ve mesajlardan anında haberdar olursunuz.'
                : 'Makineleriniz kiralandığında veya yeni teklif geldiğinde anlık bildirim alın.'}
            </p>
          </div>
        </div>

        {permission !== 'granted' ? (
          <button
            type="button"
            onClick={requestPermission}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition shadow-md shadow-orange-500/20"
          >
            Bildirimleri Aç
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Tercihleri Düzenle"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSettings && permission === 'granted' && (
        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
          <span className="font-bold text-slate-700 block mb-2">Bildirim Tercihleri:</span>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <span className="text-slate-700">Yeni Mesajlar</span>
            <input
              type="checkbox"
              checked={preferences.messages}
              onChange={(e) => setPreferences({ ...preferences, messages: e.target.checked })}
              className="accent-orange-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <span className="text-slate-700">Teklif Talepleri & Fiyat Yanıtları</span>
            <input
              type="checkbox"
              checked={preferences.quotes}
              onChange={(e) => setPreferences({ ...preferences, quotes: e.target.checked })}
              className="accent-orange-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <span className="text-slate-700">Rezervasyon Durum Değişiklikleri</span>
            <input
              type="checkbox"
              checked={preferences.bookings}
              onChange={(e) => setPreferences({ ...preferences, bookings: e.target.checked })}
              className="accent-orange-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <span className="text-slate-700">Reklam Kampanyası Süre Sonu Uyarısı (24 Saat Kala)</span>
            <input
              type="checkbox"
              checked={preferences.adExpiry}
              onChange={(e) => setPreferences({ ...preferences, adExpiry: e.target.checked })}
              className="accent-orange-500 w-4 h-4"
            />
          </label>
        </div>
      )}
    </div>
  );
}
