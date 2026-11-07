import { NextRequest, NextResponse } from 'next/server';
import { getContractById } from '@/lib/services/contract-service';
import { generateContractPdf } from '@/lib/services/pdf-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Admin veya taraf yetkisiyle sözleşmeyi getir
    const res = await getContractById(id, 'system-api-caller', 'admin');

    if (!res.success || !res.contract) {
      return NextResponse.json({ error: 'Sözleşme bulunamadı veya erişim yetkiniz yok.' }, { status: 404 });
    }

    const contract = res.contract;
    const { pdfBuffer, fileName } = await generateContractPdf(contract.data_snapshot);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'PDF üretilemedi.' }, { status: 500 });
  }
}
