import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import A2HSPrompt from '@/components/pwa/A2HSPrompt';
import CookieConsent from '@/components/legal/CookieConsent';
import HelpButton from '@/components/help/HelpButton';
import IntroGuide from '@/components/help/IntroGuide';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ŞantiyeGO – İş Makinesi, Malzeme & Şantiye Ekipmanları Platformu',
  description:
    'ŞantiyeGO, Türkiye genelinde iş makinesi kiralama, yapı malzemesi tedariği ve ağır nakliyat hizmetlerini en yakın konumda ve en iyi fiyat teklifleriyle sunan dijital pazaryeridir.',
  openGraph: {
    title: 'ŞantiyeGO – İş Makinesi, Malzeme & Şantiye Ekipmanları Platformu',
    description:
      'ŞantiyeGO, Türkiye genelinde iş makinesi kiralama, yapı malzemesi tedariği ve ağır nakliyat hizmetlerini en yakın konumda ve en iyi fiyat teklifleriyle sunan dijital pazaryeridir.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    // iOS ana ekran simgesi SVG'yi desteklemez; push bildirimleri için uygulamanın ana ekrana eklenmesi gerekir
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F2846',
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
    <html lang="tr" className={`${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-navy-900 font-sans antialiased selection:bg-orange-200 selection:text-navy-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <MobileNav />
        <A2HSPrompt />
        <CookieConsent />
        <HelpButton />
        <IntroGuide />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
