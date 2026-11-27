'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Plus,
  User,
  Heart,
  Menu,
  X,
  Building2,
  Bell,
  MessageSquare,
  CheckCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { createClient } from '@/lib/supabase/client';
import { Profile, Notification } from '@/types/database';
import { getActiveProfile, logoutUser } from '@/lib/services/auth-service';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  onNotificationsChanged,
} from '@/lib/services/notification-service';
import { disablePush } from '@/lib/push/client';
import { safeInternalPath } from '@/lib/push/shared';
import { getConversations } from '@/lib/services/message-service';

export default function Header() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      try {
        const activeProfile = await getActiveProfile();
        if (activeProfile) {
          setProfile(activeProfile);
          const userNotifs = await getUserNotifications(activeProfile.id, 15);
          setNotifications(userNotifs);
          const initialUnread = await getUnreadNotificationCount(activeProfile.id);
          if (initialUnread !== null) setUnreadCount(initialUnread);

          // Okunmamış mesaj sayısını getir
          try {
            const convs = await getConversations(activeProfile.id);
            const totalUnread = convs.reduce((acc, c) => acc + (c.unread_count || 0), 0);
            setUnreadMessagesCount(totalUnread);
          } catch {}
        } else {
          setProfile(null);
          setNotifications([]);
          setUnreadCount(0);
          setUnreadMessagesCount(0);
        }
      } catch {
        setProfile(null);
        setNotifications([]);
        setUnreadCount(0);
        setUnreadMessagesCount(0);
      }
    }
    checkAuth();
  }, []);

  // Bildirim + mesaj sayaçlarını yenile
  useEffect(() => {
    if (!profile?.id) return;
    const userId = profile.id;
    let cancelled = false;

    // Üç kaynak birbirinden bağımsız: konuşmalar uç noktası hata verse bile bildirimler güncellenir
    const refresh = async () => {
      const [convs, notifs, unread] = await Promise.allSettled([
        getConversations(userId),
        getUserNotifications(userId, 15),
        getUnreadNotificationCount(userId),
      ]);
      if (cancelled) return;
      if (convs.status === 'fulfilled') {
        setUnreadMessagesCount(convs.value.reduce((acc, c) => acc + (c.unread_count || 0), 0));
      }
      if (notifs.status === 'fulfilled') setNotifications(notifs.value);
      if (unread.status === 'fulfilled' && unread.value !== null) setUnreadCount(unread.value);
    };

    // Canlı: yeni bildirim / okundu değişikliği anında yansır
    const unsubscribe = subscribeToNotifications(userId, refresh);
    // Aynı sekmede (örn. /bildirimler sayfasında) okundu yapılınca zil de hemen güncellensin
    const stopLocal = onNotificationsChanged(refresh);
    // Yedek: realtime kopsa bile 60 sn'de bir yenile; sekmeye dönünce hemen yenile
    const interval = setInterval(refresh, 60000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      unsubscribe();
      stopLocal();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [profile?.id]);

  const unreadNotifsCount = profile ? unreadCount : 0;

  const handleNotifClick = () => {
    if (!profile) {
      router.push('/giris?redirect=/bildirimler');
      return;
    }
    setNotifDropdownOpen(!notifDropdownOpen);
  };

  const handleMarkAllRead = async () => {
    if (profile?.id) {
      await markAllNotificationsAsRead(profile.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    await markNotificationAsRead(notif.id);
    if (!notif.is_read) setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setNotifDropdownOpen(false);
  };

  const handleSignOut = async () => {
    // Oturum kapanmadan önce bu cihazın push aboneliğini kaldır (en fazla 2,5 sn beklenir)
    await Promise.race([disablePush(), new Promise((resolve) => setTimeout(resolve, 2500))]);
    await logoutUser();
    setProfile(null);
    window.location.href = '/';
  };

  const iconBtn =
    'relative p-2 rounded-md text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition-colors';
  const badge =
    'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-semibold leading-4 text-center';

  const primaryNav = [
    { href: '/ilanlar?category=is-makineleri', label: 'İş Makineleri' },
    { href: '/ilanlar?category=yapi-malzemeleri', label: 'Yapı Malzemeleri' },
    { href: '/ilanlar?category=nakliye', label: 'Nakliye' },
    { href: '/ilanlar', label: 'Tüm İlanlar' },
  ];

  const secondaryNav = [
    { href: '/teklif-iste', label: 'Teklif İste' },
    { href: '/kesif-yukle', label: 'Keşif Listesi Yükle' },
    { href: '/hesaplayici', label: 'Metraj Hesaplayıcı' },
    { href: '/santiyeden-santiyeye', label: 'Şantiyeden Şantiyeye' },
    { href: '/operatorler', label: 'Operatör Bul' },
  ];

  const panelHref =
    profile?.role === 'admin' || profile?.role === 'super_admin'
      ? '/admin'
      : profile?.role === 'company'
        ? '/firma-paneli'
        : '/alici-paneli';
  const panelLabel =
    profile?.role === 'admin' || profile?.role === 'super_admin'
      ? 'Yönetim'
      : profile?.role === 'company'
        ? 'Firma Paneli'
        : 'Hesabım';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      {/* Hizmet çubuğu */}
      <div className="hidden md:block bg-navy-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between text-xs">
          <nav className="flex items-center gap-5">
            {secondaryNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            {profile?.role !== 'company' && (
              <Link href="/kayit?role=company" className="hover:text-white transition-colors">
                Firmanızı ekleyin
              </Link>
            )}
            <Link href="/odeme-guvencesi" className="hover:text-white transition-colors">
              Nasıl çalışır?
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[72px] gap-6">
          <div className="flex items-center gap-8 min-w-0">
            <Logo height={46} />
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-700">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-md hover:bg-slate-100 hover:text-navy-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Masaüstü eylemler */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href={profile ? '/mesajlar' : '/giris?redirect=/mesajlar'}
              className={iconBtn}
              title="Mesajlar"
              aria-label="Mesajlar"
            >
              <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
              {unreadMessagesCount > 0 && <span className={badge}>{unreadMessagesCount}</span>}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={handleNotifClick}
                className={iconBtn}
                title="Bildirimler"
                aria-label="Bildirimler"
              >
                <Bell className="w-5 h-5" strokeWidth={1.75} />
                {unreadNotifsCount > 0 && (
                  <span className={badge}>{unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}</span>
                )}
              </button>

              {profile && notifDropdownOpen && (
                <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-md shadow-xl border border-slate-200 overflow-hidden text-navy-900 z-50">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Bildirimler
                      {unreadNotifsCount > 0 && (
                        <span className="ml-1.5 text-slate-500 font-normal">({unreadNotifsCount} yeni)</span>
                      )}
                    </span>
                    {unreadNotifsCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Tümünü okundu say
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">Henüz bildiriminiz yok.</div>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={safeInternalPath(n.link_url)}
                          onClick={() => handleNotificationClick(n)}
                          className={`block px-4 py-3 hover:bg-slate-50 transition-colors text-sm ${
                            !n.is_read ? 'bg-orange-50/60' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-medium text-navy-900">{n.title}</span>
                            <span className="text-xs text-slate-400 shrink-0 tabular">
                              {new Date(n.created_at).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5 line-clamp-2 leading-relaxed text-[13px]">{n.body}</p>
                        </Link>
                      ))
                    )}
                  </div>
                  <Link
                    href="/bildirimler"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="block px-4 py-2.5 text-center text-sm font-medium text-navy-900 hover:bg-slate-50 border-t border-slate-200"
                  >
                    Tüm bildirimler
                  </Link>
                </div>
              )}
            </div>

            <Link
              href={profile ? '/favorilerim' : '/giris?redirect=/favorilerim'}
              className={iconBtn}
              title="Favoriler"
              aria-label="Favoriler"
            >
              <Heart className="w-5 h-5" strokeWidth={1.75} />
            </Link>

            <div className="w-px h-6 bg-slate-200 mx-2" />

            {profile ? (
              <div className="flex items-center gap-1">
                <Link
                  href={panelHref}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-navy-900 hover:bg-slate-100 transition-colors"
                >
                  {profile.role === 'company' ? (
                    <Building2 className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                  ) : (
                    <User className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                  )}
                  {panelLabel}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={iconBtn}
                  title="Çıkış yap"
                  aria-label="Çıkış yap"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm font-medium">
                <Link href="/giris" className="px-3 py-2 rounded-md text-navy-900 hover:bg-slate-100 transition-colors">
                  Giriş yap
                </Link>
                <Link href="/kayit" className="px-3 py-2 rounded-md text-navy-900 hover:bg-slate-100 transition-colors">
                  Üye ol
                </Link>
              </div>
            )}

            <Link
              href={profile?.role === 'company' ? '/firma-paneli/yeni-ilan' : '/giris?redirect=/firma-paneli/yeni-ilan'}
              className="ml-2 btn-primary"
            >
              <Plus className="w-4 h-4" strokeWidth={2.25} />
              İlan Ver
            </Link>
          </div>

          {/* Mobil */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href={profile ? '/mesajlar' : '/giris?redirect=/mesajlar'}
              className={iconBtn}
              aria-label="Mesajlar"
            >
              <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={iconBtn}
              aria-label="Menü"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white max-h-[calc(100vh-64px)] overflow-y-auto">
          <nav className="px-4 py-2 divide-y divide-slate-100 text-[15px]">
            {[...primaryNav, ...secondaryNav].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-3 text-navy-900"
              >
                {item.label}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
            <Link
              href={profile ? '/alici-paneli/taleplerim' : '/giris?redirect=/alici-paneli/taleplerim'}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-3 text-navy-900"
            >
              Teklif taleplerim
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </nav>
          <div className="px-4 pb-5 pt-2 grid grid-cols-2 gap-2">
            {profile ? (
              <>
                <Link href={panelHref} onClick={() => setMobileMenuOpen(false)} className="btn-secondary">
                  {panelLabel}
                </Link>
                <button type="button" onClick={handleSignOut} className="btn-secondary">
                  Çıkış yap
                </button>
              </>
            ) : (
              <>
                <Link href="/giris" onClick={() => setMobileMenuOpen(false)} className="btn-secondary">
                  Giriş yap
                </Link>
                <Link href="/kayit" onClick={() => setMobileMenuOpen(false)} className="btn-dark">
                  Üye ol
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
