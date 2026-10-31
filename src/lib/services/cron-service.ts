/**
 * ŞANTİYE GO – ZAMANLANMIŞ GÖREVLER MOTORU (CRON SERVICE)
 * Reklam sürelerinin bitişini, onay bekleyen rezervasyonların otomatik iptalini
 * ve üyelik periyotlarını denetler.
 */

import { DEMO_CAMPAIGNS } from './ad-service';
import { DEMO_BOOKINGS } from './booking-service';
import { logError } from '../monitoring/logger';

export interface CronExecutionResult {
  timestamp: string;
  expiredAdsCount: number;
  autoCancelledBookingsCount: number;
  success: boolean;
  notes: string[];
}

export async function runScheduledTasks(): Promise<CronExecutionResult> {
  const now = new Date();
  const notes: string[] = [];
  let expiredAdsCount = 0;
  let autoCancelledBookingsCount = 0;

  try {
    // 1. Reklam Kampanyası Süresi Bitiş Denetimi
    DEMO_CAMPAIGNS.forEach((camp) => {
      if (camp.status === 'active' && camp.expires_at) {
        const expiry = new Date(camp.expires_at);
        if (now > expiry) {
          camp.status = 'expired';
          expiredAdsCount++;
          notes.push(`Kampanya süresi doldu: ${camp.id} (${camp.title})`);
        }
      }
    });

    // 2. Yanıtsız Rezervasyon Otomatik İptali (24 saat kuralı)
    const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;
    DEMO_BOOKINGS.forEach((booking) => {
      if (booking.status === 'pending') {
        const created = new Date(booking.created_at).getTime();
        if (now.getTime() - created > CANCELLATION_WINDOW_MS) {
          booking.status = 'cancelled';
          booking.updated_at = now.toISOString();
          autoCancelledBookingsCount++;
          notes.push(`Onay süresi dolan rezervasyon otomatik iptal edildi: ${booking.id}`);
        }
      }
    });

    return {
      timestamp: now.toISOString(),
      expiredAdsCount,
      autoCancelledBookingsCount,
      success: true,
      notes,
    };
  } catch (err) {
    logError('runScheduledTasks', err);
    return {
      timestamp: now.toISOString(),
      expiredAdsCount,
      autoCancelledBookingsCount,
      success: false,
      notes: ['Zamanlanmış görev çalıştırma hatası'],
    };
  }
}
