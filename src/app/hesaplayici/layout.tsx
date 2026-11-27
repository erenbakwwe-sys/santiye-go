import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Metraj hesaplayıcı | ŞantiyeGO',
  description: 'Beton, demir, duvar ve iskele metrajını hesaplayın.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
