// v3: yeni logo/ikonlar. v2: eski sürümün önbelleğe aldığı API/Supabase yanıtlarını activate sırasında temizler
const CACHE_NAME = 'santiye-go-static-v3';
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/brand/logo.png',
];

const NOTIFICATION_ICON = '/icon-192.png';
const NOTIFICATION_BADGE = '/badge-96.png';

// Install Event: cache static shell & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event:
// RULE: Never show stale prices, availability, notifications or another user's data!
// - Sayfa gezintileri: ağ öncelikli; yalnızca çevrimdışıyken /offline sayfasına düşer.
// - Yalnızca kendi alan adımızdaki değişmez statik dosyalar (/_next/static, görsel, yazı tipi)
//   önbelleğe alınır (stale-while-revalidate).
// - Diğer her şey (API, Supabase REST, RSC verisi, harita karoları...) hiç yakalanmaz:
//   tarayıcı doğrudan ağdan alır. Böylece eski veri ve hesaplar arası sızıntı olmaz.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        // caches.match bir Promise döner (her zaman "truthy"): sonucu bekleyip sırayla dene
        caches.match(OFFLINE_URL).then((offline) => offline || caches.match('/'))
      )
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    request.destination === 'image' ||
    request.destination === 'font';
  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || fetchPromise;
    })
  );
});

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------

// Yalnızca site içi yola izin ver ("//host", "http:", "javascript:" vb. reddedilir)
function safeUrl(raw) {
  try {
    const target = new URL(typeof raw === 'string' ? raw : '/', self.location.origin);
    return target.origin === self.location.origin ? target.href : self.location.origin + '/bildirimler';
  } catch (e) {
    return self.location.origin + '/bildirimler';
  }
}

// Push Notification Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = String(data.title || 'ŞANTİYE GO').slice(0, 100);
  const options = {
    body: String(data.body || 'Yeni bir bildiriminiz var.').slice(0, 200),
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
    lang: 'tr',
    // Aynı konudaki (ör. aynı konuşma) bildirimler üst üste yığılmaz, yenisi eskisinin yerini alır
    tag: data.tag ? String(data.tag) : undefined,
    renotify: !!data.tag,
    data: { url: safeUrl(data.url) },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = safeUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // Açık bir sekme varsa onu hedef sayfaya götür
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          try {
            if ('navigate' in client && client.url !== target) {
              await client.navigate(target);
            }
          } catch (e) {
            // navigate desteklenmiyorsa/başarısızsa yeni pencere açılır
            return self.clients.openWindow(target);
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Tarayıcı aboneliği yenilediyse (süre dolumu vb.) sunucuya yeni aboneliği bildir
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const oldOptions = event.oldSubscription && event.oldSubscription.options;
      const key = oldOptions && oldOptions.applicationServerKey;
      const sub =
        event.newSubscription ||
        (key ? await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }) : null);
      if (!sub) return;
      await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    })().catch(() => undefined)
  );
});
