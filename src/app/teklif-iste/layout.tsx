import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teklif iste | ŞantiyeGO',
  description: 'İhtiyacınızı bir kez yazın, bölgenizdeki firmalardan fiyat alın.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
