import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giriş yap | ŞantiyeGO',
  description: 'ŞantiyeGO hesabınıza giriş yapın.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
