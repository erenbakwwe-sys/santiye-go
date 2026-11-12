import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import A2HSPrompt from '@/components/pwa/A2HSPrompt';
import CookieConsent from '@/components/legal/CookieConsent';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Şantiye GO – İş Makinesi, Malzeme & Şantiye Ekipmanları Platformu',
  description:
    'Şantiye GO, Türkiye genelinde iş makinesi kiralama, yapı malzemesi tedariği ve ağır nakliyat hizmetlerini en yakın konumda ve en iyi fiyat teklifleriyle sunan dijital pazaryeridir.',
  openGraph: {
    title: 'Şantiye GO – İş Makinesi, Malzeme & Şantiye Ekipmanları Platformu',
    description:
      'Şantiye GO, Türkiye genelinde iş makinesi kiralama, yapı malzemesi tedariği ve ağır nakliyat hizmetlerini en yakın konumda ve en iyi fiyat teklifleriyle sunan dijital pazaryeridir.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B192C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-navy-900 font-sans antialiased selection:bg-orange-500 selection:text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <MobileNav />
        <A2HSPrompt />
        <CookieConsent />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
