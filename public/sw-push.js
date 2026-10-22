// Custom service worker additions for push notifications
// This file is merged with the auto-generated Workbox service worker by vite-plugin-pwa

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'MeteoAlerta', body: event.data.text() };
  }

  const options = {
    body: data.body || 'Nuevo aviso meteorológico.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'aemet-alert',
    renotify: data.renotify ?? true,
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Ver mapa' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MeteoAlerta', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
