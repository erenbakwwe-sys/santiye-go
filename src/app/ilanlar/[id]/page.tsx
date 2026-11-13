import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IlanlarDetailPageRedirect({ params }: Props) {
  const { id } = await params;
  // /ilanlar/[id] adresine gelen istekleri canonical /ilan/[id] detay sayfasına yönlendir
  redirect(`/ilan/${id}`);
}
