'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Heart, User } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Ana Sayfa', href: '/', icon: Home },
    { label: 'Ara', href: '/ilanlar', icon: Search },
    { label: 'İlan Ver', href: '/firma-paneli/yeni-ilan', icon: PlusCircle, isHighlight: true },
    { label: 'Favoriler', href: '/favorilerim', icon: Heart },
    { label: 'Hesabım', href: '/hesabim', icon: User },
  ];

  return (
    <nav
      aria-label="Alt menü"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-[60px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-xs ${
                item.isHighlight
                  ? 'text-orange-600 font-medium'
                  : isActive
                    ? 'text-navy-900 font-medium'
                    : 'text-slate-500'
              }`}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive || item.isHighlight ? 2 : 1.6} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
