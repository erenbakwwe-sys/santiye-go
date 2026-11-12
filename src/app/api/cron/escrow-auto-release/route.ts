import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { cronCheckAutoReleaseEscrow } from '@/lib/services/escrow-service';

export async function GET(req: NextRequest) {
  return handleCronExecution(req);
}

export async function POST(req: NextRequest) {
  return handleCronExecution(req);
}

async function handleCronExecution(req: NextRequest) {
  // CRON_SECRET Doğrulaması (Cron endpoint güvenliği)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const customHeader = req.headers.get('x-cron-secret');

  if (cronSecret) {
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (bearerToken !== cronSecret && customHeader !== cronSecret) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim: Geçersiz veya eksik CRON_SECRET anahtarı.' },
        { status: 401 }
      );
    }
  }

  try {
    // 1. Veritabanı Tabanlı Hız Sınırlaması (Database-backed Rate Limiting)
    try {
      const supabase = createServiceRoleClient();
      const { data: rateCheck, error: rateErr } = await supabase.rpc(
        'execute_rate_limited_escrow_cron',
        { p_min_interval_seconds: 60 }
      );

      if (rateErr) {
        console.warn('execute_rate_limited_escrow_cron error, fallback to direct cron:', rateErr.message);
      } else if (rateCheck?.rate_limited) {
        return NextResponse.json(
          {
            rate_limited: true,
            message: rateCheck.message,
            retry_after_seconds: rateCheck.retry_after_seconds,
          },
          { status: 429 }
        );
      } else if (rateCheck?.success) {
        return NextResponse.json({
          success: true,
          executed_at: rateCheck.executed_at,
          result: rateCheck.cron_result,
        });
      }
    } catch {
      // If service role not configured or table missing, run direct service method
    }

    // 2. Direct fallback execution
    const res = await cronCheckAutoReleaseEscrow();
    return NextResponse.json({
      success: true,
      released_count: res.releasedCount || 0,
    });
  } catch (err: any) {
    // 3. Hata durumunda admin uyarısı oluştur
    try {
      const supabase = createServiceRoleClient();
      await supabase.from('admin_audit_logs').insert({
        action: 'cron_escrow_failure_alert',
        target_type: 'cron',
        target_id: 'auto_release',
        details: {
          error: err.message,
          failed_at: new Date().toISOString(),
        },
      });
    } catch {
      // Silent error handler
    }

    return NextResponse.json(
      { error: err.message || 'Zamanlanmış Escrow görevi yürütülemedi.' },
      { status: 500 }
    );
  }
}
