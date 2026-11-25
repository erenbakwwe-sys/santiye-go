import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Operatör bul | ŞantiyeGO',
  description: 'İş makineniz için operatör bulun.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
