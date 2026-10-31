import { createClient } from '@/lib/supabase/client';
import { AvailabilityCalendar } from '@/types/database';

export interface CalendarDayStatus {
  date: string; // YYYY-MM-DD
  status: 'available' | 'booked' | 'maintenance';
  stock_booked: number;
  stock_total: number;
  notes?: string;
}

// In-memory demo availability calendar store
export const DEMO_CALENDAR_ENTRIES: Record<string, CalendarDayStatus[]> = {
  // CAT 320D Excavator
  '10000000-0000-0000-0000-000000000001': [
    { date: '2026-11-01', status: 'booked', stock_booked: 1, stock_total: 1, notes: 'Önceden kiralanmış' },
    { date: '2026-11-02', status: 'booked', stock_booked: 1, stock_total: 1, notes: 'Önceden kiralanmış' },
    { date: '2026-11-03', status: 'booked', stock_booked: 1, stock_total: 1, notes: 'Önceden kiralanmış' },
    { date: '2026-11-04', status: 'maintenance', stock_booked: 1, stock_total: 1, notes: 'Periyodik 1000 saat bakımı' },
    { date: '2026-11-15', status: 'booked', stock_booked: 1, stock_total: 1 },
    { date: '2026-11-16', status: 'booked', stock_booked: 1, stock_total: 1 },
    { date: '2026-11-17', status: 'booked', stock_booked: 1, stock_total: 1 },
  ],
};

export async function getListingAvailability(
  listingId: string,
  year: number,
  month: number // 1-12
): Promise<CalendarDayStatus[]> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('availability_calendar')
        .select('*')
        .eq('listing_id', listingId)
        .gte('date', startDate)
        .lt('date', endDate);

      if (!error && data) {
        return data as any;
      }
    }
  } catch {
    // fallback
  }

  return DEMO_CALENDAR_ENTRIES[listingId] || [];
}

export async function setBatchAvailability(
  listingId: string,
  dates: string[],
  status: 'available' | 'booked' | 'maintenance',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const rows = dates.map((date) => ({
        listing_id: listingId,
        date,
        status,
        notes: notes || null,
        stock_booked: status === 'available' ? 0 : 1,
      }));

      const { error } = await supabase
        .from('availability_calendar')
        .upsert(rows, { onConflict: 'listing_id,date' });

      if (!error) return { success: true };
    }
  } catch {
    // fallback
  }

  // Update in-memory demo store
  if (!DEMO_CALENDAR_ENTRIES[listingId]) {
    DEMO_CALENDAR_ENTRIES[listingId] = [];
  }

  dates.forEach((d) => {
    const existingIdx = DEMO_CALENDAR_ENTRIES[listingId].findIndex((entry) => entry.date === d);
    const updatedEntry: CalendarDayStatus = {
      date: d,
      status,
      stock_booked: status === 'available' ? 0 : 1,
      stock_total: 1,
      notes,
    };

    if (existingIdx >= 0) {
      DEMO_CALENDAR_ENTRIES[listingId][existingIdx] = updatedEntry;
    } else {
      DEMO_CALENDAR_ENTRIES[listingId].push(updatedEntry);
    }
  });

  return { success: true };
}

export async function checkDateRangeAvailable(
  listingId: string,
  startDateStr: string,
  endDateStr: string,
  requestedQuantity: number = 1
): Promise<{ available: boolean; conflictDate?: string }> {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const entries = DEMO_CALENDAR_ENTRIES[listingId] || [];

  const curr = new Date(start);
  while (curr <= end) {
    const dateFormatted = curr.toISOString().split('T')[0];
    const match = entries.find((e) => e.date === dateFormatted);
    if (match && (match.status === 'booked' || match.status === 'maintenance')) {
      return { available: false, conflictDate: dateFormatted };
    }
    curr.setDate(curr.getDate() + 1);
  }

  return { available: true };
}
