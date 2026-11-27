import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keşif listesi yükle | ŞantiyeGO',
  description: 'Excel veya PDF keşif listenizi yükleyin, kalemler için teklif alın.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
