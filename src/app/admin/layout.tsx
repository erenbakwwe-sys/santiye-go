'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Layers,
  FolderTree,
  ShieldAlert,
  CreditCard,
  Settings,
  HardHat,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Menu,
  X,
  FileSpreadsheet,
  Sparkles,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveProfile } from '@/lib/services/auth-service';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [twoFactorActive, setTwoFactorActive] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const profile = await getActiveProfile();

        if (!profile) {
          router.push('/giris?redirect=/admin');
          return;
        }

        if (profile.role !== 'admin' && profile.role !== 'super_admin') {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }

    verifyAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-300">Yönetici Yetkileri Doğrulanıyor...</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-navy-900">403 Yetkisiz Erişim</h2>
          <p className="text-xs text-slate-500">
            Bu bölüme yalnızca süper yönetici ve yetkili moderatör hesapları erişebilir.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-navy-900 text-white font-bold text-xs"
            >
              <span>Ana Sayfaya Dön</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Gösterge Paneli', href: '/admin', icon: LayoutDashboard },
    { label: 'Firma Doğrulama', href: '/admin/firmalar', icon: Building2 },
    { label: 'İlan Moderasyonu', href: '/admin/ilanlar', icon: Layers },
    { label: 'Reklam & Vitrin', href: '/admin/reklamlar', icon: Sparkles },
    { label: 'Bölgesel Analiz', href: '/admin/analiz', icon: BarChart3 },
    { label: 'Kategori Yönetimi', href: '/admin/kategoriler', icon: FolderTree },
    { label: 'Şikayet Masası', href: '/admin/sikayetler', icon: ShieldAlert },
    { label: 'Ödemeler & Raporlar', href: '/admin/odemeler', icon: CreditCard },
    { label: 'Sistem Ayarları', href: '/admin/ayarlar', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-navy-950 text-white p-4 flex items-center justify-between border-b border-navy-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white">
            <HardHat className="w-5 h-5" />
          </div>
          <span className="font-black text-sm tracking-wide">ŞANTİYE GO ADMİN</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-64 bg-navy-950 text-white shrink-0 flex flex-col justify-between border-r border-navy-800 transition-all ${
          sidebarOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-navy-800/80">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-base tracking-tight flex items-center gap-1.5">
                  <span>ŞANTİYE</span>
                  <span className="text-orange-400">GO</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-600/30 text-orange-400 border border-orange-500/40 font-bold">
                    ADMİN
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Platform Yönetim Masası</div>
              </div>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Admin Status & 2FA */}
        <div className="p-4 border-t border-navy-900 bg-navy-950/60 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              2FA Koruması:
            </span>
            <span className="font-bold text-emerald-400">Aktif</span>
          </div>

          <div className="p-2.5 rounded-xl bg-navy-900 border border-navy-800 text-xs">
            <div className="font-extrabold text-white">Süper Admin</div>
            <div className="text-[10px] text-slate-400">admin@santiyego.com</div>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-slate-700 hover:bg-navy-900 text-slate-300 hover:text-white text-xs font-bold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Siteye Geri Dön</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">{children}</div>
      </main>
    </div>
  );
}
