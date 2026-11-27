'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  FileText,
  Loader2,
  MessageSquare,
  Package,
  Recycle,
  Star,
} from 'lucide-react';
import PushNotificationManager from '@/components/pwa/PushNotificationManager';
import { getActiveProfile } from '@/lib/services/auth-service';
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
  onNotificationsChanged,
} from '@/lib/services/notification-service';
import { categoryForType, safeInternalPath } from '@/lib/push/shared';
import { Notification } from '@/types/database';

const PAGE_SIZE = 20;

function iconFor(type: string) {
  if (type === 'circular_inquiry') return Recycle;
  if (type === 'new_review') return Star;
  if (type === 'delivery_marked' || type.startsWith('listing_')) return Package;
  const category = categoryForType(type);
  if (category === 'messages') return MessageSquare;
  if (category === 'quotes') return FileText;
  return CalendarCheck;
}

const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });

function timeAgo(iso: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  // Cihaz saati sunucudan biraz önde olabilir: yakın gelecek de "şimdi" sayılır
  if (abs < 60 || (diffSec > 0 && abs < 300)) return 'şimdi';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return new Date(iso).toLocaleDateString('tr-TR');
}

export default function NotificationsClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const loadedRef = useRef(PAGE_SIZE);

  const reload = useCallback(async (uid: string) => {
    // Realtime tetiklenince şu ana kadar yüklenen kadar kaydı yeniden getir
    const rows = await getUserNotifications(uid, loadedRef.current + 1, 0);
    setHasMore(rows.length > loadedRef.current);
    setItems(rows.slice(0, loadedRef.current));
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    let stopLocal = () => {};
    let cancelled = false;
    (async () => {
      const profile = await getActiveProfile();
      if (cancelled) return;
      if (!profile) {
        router.replace('/giris?redirect=/bildirimler');
        return;
      }
      setUserId(profile.id);
      await reload(profile.id);
      if (cancelled) return;
      setLoading(false);
      unsubscribe = subscribeToNotifications(profile.id, () => reload(profile.id));
      // Zil açılır penceresinde okundu yapılınca bu liste de güncellensin
      stopLocal = onNotificationsChanged(() => reload(profile.id));
    })();
    return () => {
      cancelled = true;
      unsubscribe();
      stopLocal();
    };
  }, [reload, router]);

  const loadMore = async () => {
    if (!userId) return;
    setLoadingMore(true);
    loadedRef.current += PAGE_SIZE;
    await reload(userId);
    setLoadingMore(false);
  };

  const markAll = async () => {
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const open = async (n: Notification) => {
    if (n.is_read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    await markNotificationAsRead(n.id);
  };

  const unreadCount = items.filter((n) => !n.is_read).length;
  const visible = onlyUnread ? items.filter((n) => !n.is_read) : items;

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] py-8 sm:py-10">
      <div className="max-w-3xl mx-auto px-4 space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-navy-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-orange-500" />
              Bildirimler
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} okunmamış bildiriminiz var.` : 'Tüm bildirimleriniz okundu.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 shrink-0"
            >
              <CheckCheck className="w-4 h-4" />
              Tümünü okundu yap
            </button>
          )}
        </div>

        <PushNotificationManager />

        <div className="flex gap-2 text-xs font-bold">
          {[
            { label: 'Tümü', value: false },
            { label: 'Okunmamış', value: true },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setOnlyUnread(tab.value)}
              className={`px-3.5 py-1.5 rounded-full border transition ${
                onlyUnread === tab.value
                  ? 'bg-navy-900 text-white border-navy-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              {onlyUnread ? 'Okunmamış bildiriminiz yok.' : 'Henüz bildiriminiz yok.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((n) => {
                const Icon = iconFor(String(n.type));
                return (
                  <li key={n.id}>
                    <Link
                      href={safeInternalPath(n.link_url)}
                      onClick={() => open(n)}
                      className={`flex items-start gap-3 p-4 hover:bg-slate-50 transition ${
                        !n.is_read ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          !n.is_read ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-sm text-navy-900 ${!n.is_read ? 'font-extrabold' : 'font-semibold'}`}
                          >
                            {n.title}
                          </span>
                          <span className="text-xs text-slate-400 shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" aria-label="Okunmadı" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {hasMore && !loading && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="px-5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Daha eski bildirimleri göster
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
