import { Notification } from '@/types/database';

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    user_id: 'buyer-demo-001',
    type: 'new_quote',
    title: 'Yeni Teklif Alındı',
    body: 'Anadolu İş Makineleri Parkı 22 Ton Ekskavatör talebinize 245.000 ₺ teklif verdi.',
    link_url: '/alici-paneli/taleplerim',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif-002',
    user_id: 'buyer-demo-001',
    type: 'new_message',
    title: 'Yeni Mesajınız Var',
    body: 'Anadolu İş Makineleri Parkı size bir mesaj gönderdi.',
    link_url: '/mesajlar',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'notif-003',
    user_id: 'buyer-demo-001',
    type: 'booking_approved',
    title: 'Rezervasyon Onaylandı',
    body: 'Kiralama rezervasyon talebiniz firma tarafından kabul edildi.',
    link_url: '/alici-paneli/rezervasyonlar',
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  return DEMO_NOTIFICATIONS;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return DEMO_NOTIFICATIONS.filter((n) => !n.is_read).length;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const notif = DEMO_NOTIFICATIONS.find((n) => n.id === id);
  if (notif) {
    notif.is_read = true;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  DEMO_NOTIFICATIONS.forEach((n) => {
    n.is_read = true;
  });
}
