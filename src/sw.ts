import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// Workbox precache (auto-injected by vite-plugin-pwa)
cleanupOutdatedCaches();
precacheAndRoute((self as any).__WB_MANIFEST);

const swSelf = self as any;

// ─── Push Notifications ───────────────────────────────────────────────────────
swSelf.addEventListener('push', (event: any) => {
  if (!event.data) return;

  let data: any;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'MeteoAlerta', body: event.data.text() };
  }

  const options: any = {
    body: data.body || 'Nuevo aviso meteorológico de AEMET.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'aemet-alert',
    renotify: data.renotify ?? true,
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    swSelf.registration.showNotification(data.title || 'MeteoAlerta', options)
  );
});

swSelf.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    swSelf.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if (client.url.includes(swSelf.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(url);
            }
            return client.focus();
          }
        }
        if (swSelf.clients.openWindow) {
          return swSelf.clients.openWindow(url);
        }
      })
  );
});
