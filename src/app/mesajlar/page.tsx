import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MessagesClient from './MessagesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const hasAuthCookie =
    cookieStore.get('santiyego_auth')?.value === 'true' ||
    cookieStore.getAll().some((c) => c.name.includes('sb-') && c.name.includes('-auth-token'));

  // Sunucu tarafı zorunlu kimlik doğrulaması:
  // Giriş yapmamış kullanıcı mesajlar arayüzüne veya verilerine kesinlikle erişemez
  if (!hasAuthCookie) {
    redirect('/giris?redirect=/mesajlar');
  }

  return <MessagesClient />;
}
