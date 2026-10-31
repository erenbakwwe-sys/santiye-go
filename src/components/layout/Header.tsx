'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  HardHat,
  PlusCircle,
  User,
  Heart,
  Menu,
  X,
  Building2,
  Bell,
  MessageSquare,
  Send,
  CheckCheck,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Notification } from '@/types/database';
import { getActiveProfile, logoutUser } from '@/lib/services/auth-service';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/services/notification-service';

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      try {
        const activeProfile = await getActiveProfile();
        if (activeProfile) {
          setProfile(activeProfile);
          const userNotifs = await getUserNotifications(activeProfile.id);
          setNotifications(userNotifs);
        } else {
          setProfile(null);
          setNotifications([]);
        }
      } catch {
        setProfile(null);
        setNotifications([]);
      }
    }
    checkAuth();
  }, []);

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (profile?.id) {
      await markAllNotificationsAsRead(profile.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    await markNotificationAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setNotifDropdownOpen(false);
  };

  const handleSignOut = async () => {
    await logoutUser();
    setProfile(null);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-navy-900 border-b border-navy-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight">
                <span>ŞANTİYE</span>
                <span className="ml-1 px-1.5 py-0.5 rounded bg-orange-500 text-white text-base sm:text-lg font-extrabold tracking-wider">
                  GO
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-300 font-medium tracking-wide">
                Şantiyenizin akıllı çözüm ortağı
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-slate-200">
            <Link
              href="/ilanlar?category=is-makineleri"
              className="hover:text-orange-500 transition-colors"
            >
              İş Makineleri
            </Link>
            <Link
              href="/ilanlar?category=yapi-malzemeleri"
              className="hover:text-orange-500 transition-colors"
            >
              Yapı Malzemeleri
            </Link>
            <Link
              href="/ilanlar?category=nakliye"
              className="hover:text-orange-500 transition-colors"
            >
              Nakliye
            </Link>
            <Link
              href="/teklif-iste"
              className="hover:text-orange-400 text-orange-400 font-bold transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Teklif İste
            </Link>
          </nav>

          {/* User & Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Messages Button */}
            <Link
              href="/mesajlar"
              className="relative p-2 text-slate-300 hover:text-orange-500 transition-colors rounded-lg hover:bg-navy-800"
              title="Mesajlarım"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />
            </Link>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-slate-300 hover:text-orange-500 transition-colors rounded-lg hover:bg-navy-800"
                title="Bildirimler"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[9px] font-black">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notifDropdownOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-navy-900 z-50 animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-navy-900">
                      Bildirimler ({unreadNotifsCount} Yeni)
                    </span>
                    {unreadNotifsCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Tümünü Okundu Yap
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Bildiriminiz bulunmuyor.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.link_url || '#'}
                          onClick={() => handleNotificationClick(n)}
                          className={`block p-3 hover:bg-slate-50 transition text-xs ${
                            !n.is_read ? 'bg-orange-50/50' : ''
                          }`}
                        >
                          <div className="font-extrabold text-navy-900 flex items-center justify-between">
                            <span>{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(n.created_at).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/favorilerim"
              className="p-2 text-slate-300 hover:text-orange-500 transition-colors rounded-lg hover:bg-navy-800"
              title="Favorilerim"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Role Navigations or Guest Buttons */}
            {profile ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/alici-paneli/taleplerim"
                  className="hidden xl:flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 border border-slate-700 transition"
                >
                  Taleplerim
                </Link>

                {profile?.role === 'admin' || profile?.role === 'super_admin' ? (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition"
                  >
                    <HardHat className="w-4 h-4" />
                    Admin
                  </Link>
                ) : profile?.role === 'company' ? (
                  <Link
                    href="/firma-paneli"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-navy-800 hover:bg-navy-700 text-white border border-slate-700 transition"
                  >
                    <Building2 className="w-4 h-4 text-orange-500" />
                    Firma Paneli
                  </Link>
                ) : (
                  <Link
                    href="/alici-paneli"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-navy-800 hover:bg-navy-700 text-white border border-slate-700 transition"
                  >
                    <User className="w-4 h-4 text-orange-500" />
                    Hesabım
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-navy-800 transition"
                  title="Güvenli Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/giris"
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-200 hover:text-white transition"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-navy-800 hover:bg-navy-700 text-white border border-slate-700 transition"
                >
                  Kayıt Ol
                </Link>
              </div>
            )}

            {/* Post Ad Button */}
            <Link
              href={profile?.role === 'company' ? '/firma-paneli/yeni-ilan' : '/giris?redirect=/firma-paneli/yeni-ilan'}
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>İlan Ver</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/mesajlar"
              className="p-1.5 text-slate-300 hover:text-white"
            >
              <MessageSquare className="w-5 h-5" />
            </Link>
            <Link
              href={profile?.role === 'company' ? '/firma-paneli/yeni-ilan' : '/firma-paneli'}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              İlan Ver
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 focus:outline-none"
              aria-label="Menü"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-950 border-b border-navy-800 px-4 pt-3 pb-5 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href="/teklif-iste"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md bg-orange-500/20 text-orange-400 font-bold"
            >
              ⚡ Çoklu Teklif Talebi Oluştur
            </Link>
            <Link
              href="/alici-paneli/taleplerim"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-navy-800 text-slate-200"
            >
              Teklif Taleplerim & Karşılaştırma
            </Link>
            <Link
              href="/mesajlar"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-navy-800 text-slate-200"
            >
              Mesajlarım
            </Link>
            <Link
              href="/ilanlar?category=is-makineleri"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-navy-800 text-slate-200"
            >
              İş Makineleri
            </Link>
            <Link
              href="/ilanlar?category=yapi-malzemeleri"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-navy-800 text-slate-200"
            >
              Yapı Malzemeleri
            </Link>
            <Link
              href="/ilanlar?category=nakliye"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-navy-800 text-slate-200"
            >
              Nakliye
            </Link>
          </div>

          <div className="pt-3 border-t border-navy-800 flex flex-col gap-2">
            <Link
              href="/firma-paneli"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg bg-navy-800 text-white font-semibold text-xs"
            >
              Firma Paneli (Talepler & Takvim)
            </Link>
            <Link
              href="/alici-paneli"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg bg-navy-800 text-white font-semibold text-xs"
            >
              Alıcı / Müteahhit Paneli
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
