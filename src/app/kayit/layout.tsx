import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Üye ol | ŞantiyeGO',
  description: 'Alıcı ya da firma hesabı açın.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
