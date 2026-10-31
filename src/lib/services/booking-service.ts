import { createClient } from '@/lib/supabase/client';
import { Booking, Listing } from '@/types/database';
import { DEMO_LISTINGS } from '@/lib/mock-data';
import { checkDateRangeAvailable, setBatchAvailability } from './calendar-service';

export interface BookingWithDetails extends Booking {
  listing?: Listing;
  buyer_name?: string;
  company_name?: string;
}

// In-Memory store for offline/demo operation
export const DEMO_BOOKINGS: BookingWithDetails[] = [
  {
    id: 'book-0000-0000-0000-000000000001',
    listing_id: '10000000-0000-0000-0000-000000000001',
    buyer_id: 'buyer-demo-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    start_date: '2026-11-01',
    end_date: '2026-11-03',
    quantity: 1,
    daily_price_applied: 12000,
    total_price: 36000,
    currency: 'TRY',
    status: 'approved',
    operator_included: true,
    fuel_included: false,
    transport_included: true,
    site_address: 'Tuzla Tepeören Şantiyesi No: 4',
    expires_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: true,
    listing: DEMO_LISTINGS[0],
    buyer_name: 'Ahmet Yılmaz (Müteahhit)',
    company_name: '[DEMO] Anadolu İş Makineleri Parkı',
  },
  {
    id: 'book-0000-0000-0000-000000000002',
    listing_id: '10000000-0000-0000-0000-000000000003',
    buyer_id: 'buyer-demo-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    start_date: '2026-11-20',
    end_date: '2026-11-24',
    quantity: 1,
    daily_price_applied: 8500,
    total_price: 34000,
    currency: 'TRY',
    status: 'pending',
    operator_included: true,
    fuel_included: false,
    transport_included: false,
    site_address: 'Kadıköy Fikirtepe Kentsel Dönüşüm Şantiyesi',
    expires_at: new Date(Date.now() + 3600000 * 36).toISOString(), // 36 hours remaining
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: true,
    listing: DEMO_LISTINGS[2],
    buyer_name: 'Ahmet Yılmaz (Müteahhit)',
    company_name: '[DEMO] Anadolu İş Makineleri Parkı',
  },
];

export async function createBookingRequest(data: {
  listing_id: string;
  buyer_id?: string;
  company_id: string;
  start_date: string;
  end_date: string;
  quantity?: number;
  daily_price_applied: number;
  total_price: number;
  operator_included: boolean;
  fuel_included: boolean;
  transport_included: boolean;
  site_address: string;
  notes?: string;
}): Promise<{ success: boolean; booking?: BookingWithDetails; error?: string }> {
  // 1. Conflict Check
  const conflict = await checkDateRangeAvailable(
    data.listing_id,
    data.start_date,
    data.end_date,
    data.quantity || 1
  );

  if (!conflict.available) {
    return {
      success: false,
      error: `Seçilen tarihler arasında (${conflict.conflictDate}) makine müsait değildir. Lütfen takvimdeki müsait günleri seçiniz.`,
    };
  }

  const newBooking: BookingWithDetails = {
    id: `book-${Date.now()}`,
    listing_id: data.listing_id,
    buyer_id: data.buyer_id || 'buyer-demo-001',
    company_id: data.company_id,
    start_date: data.start_date,
    end_date: data.end_date,
    quantity: data.quantity || 1,
    daily_price_applied: data.daily_price_applied,
    total_price: data.total_price,
    currency: 'TRY',
    status: 'pending',
    operator_included: data.operator_included,
    fuel_included: data.fuel_included,
    transport_included: data.transport_included,
    site_address: data.site_address,
    notes: data.notes || null,
    expires_at: new Date(Date.now() + 48 * 3600000).toISOString(), // 48 hours auto-expiration
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: true,
    listing: DEMO_LISTINGS.find((l) => l.id === data.listing_id),
    buyer_name: 'Ahmet Yılmaz (Müteahhit)',
    company_name: '[DEMO] Anadolu İş Makineleri Parkı',
  };

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data: dbData, error } = await supabase
        .from('bookings')
        .insert({
          ...newBooking,
          listing: undefined,
          buyer_name: undefined,
          company_name: undefined,
        })
        .select()
        .single();

      if (!error && dbData) {
        return { success: true, booking: dbData as any };
      }
    }
  } catch {
    // fallback
  }

  DEMO_BOOKINGS.unshift(newBooking);
  return { success: true, booking: newBooking };
}

export async function getBuyerBookings(buyerId: string): Promise<BookingWithDetails[]> {
  checkAutoExpiration();
  return DEMO_BOOKINGS.filter((b) => b.buyer_id === buyerId);
}

export async function getCompanyBookings(companyId: string): Promise<BookingWithDetails[]> {
  checkAutoExpiration();
  return DEMO_BOOKINGS.filter((b) => b.company_id === companyId);
}

export async function approveBooking(bookingId: string): Promise<{ success: boolean }> {
  const booking = DEMO_BOOKINGS.find((b) => b.id === bookingId);
  if (booking) {
    booking.status = 'approved';
    booking.updated_at = new Date().toISOString();

    // Automatically fill the availability calendar for the booked dates
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const dates: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    await setBatchAvailability(
      booking.listing_id,
      dates,
      'booked',
      `Rezervasyon: ${booking.buyer_name}`
    );
  }
  return { success: true };
}

export async function rejectBooking(bookingId: string): Promise<{ success: boolean }> {
  const booking = DEMO_BOOKINGS.find((b) => b.id === bookingId);
  if (booking) {
    booking.status = 'rejected';
    booking.updated_at = new Date().toISOString();
  }
  return { success: true };
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean }> {
  const booking = DEMO_BOOKINGS.find((b) => b.id === bookingId);
  if (booking) {
    booking.status = 'cancelled';
    booking.updated_at = new Date().toISOString();
  }
  return { success: true };
}

function checkAutoExpiration(): void {
  const now = new Date();
  DEMO_BOOKINGS.forEach((b) => {
    if (b.status === 'pending' && new Date(b.expires_at) < now) {
      b.status = 'expired';
    }
  });
}
