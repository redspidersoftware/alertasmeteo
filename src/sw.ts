import { cleanupOutdatedCaches, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';

// Tipos locales: el tsconfig usa lib DOM (la app es una SPA) y ServiceWorkerGlobalScope
// solo existe en la lib "webworker", así que declaramos exactamente lo que usamos.
interface PushPayload {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    renotify?: boolean;
    data?: { url?: string };
}

interface PushEventLike {
    data: { json(): unknown; text(): string } | null;
    waitUntil(promise: Promise<unknown>): void;
}

interface NotificationClickEventLike {
    action: string;
    notification: { close(): void; data: unknown };
    waitUntil(promise: Promise<unknown>): void;
}

interface ServiceWorkerScopeLike {
    addEventListener(type: 'push', listener: (event: PushEventLike) => void): void;
    addEventListener(type: 'notificationclick', listener: (event: NotificationClickEventLike) => void): void;
    registration: { showNotification(title: string, options?: NotificationOptions & { renotify?: boolean; vibrate?: number[] }): Promise<void> };
    clients: {
        matchAll(options: { type: 'window'; includeUncontrolled: boolean }): Promise<Array<{
            url: string;
            navigate(url: string): Promise<unknown>;
            focus(): Promise<unknown>;
        }>>;
        openWindow(url: string): Promise<unknown>;
    };
    location: { origin: string };
}

const swSelf = self as unknown as ServiceWorkerScopeLike;

// Workbox precache (auto-inyectado por vite-plugin-pwa)
cleanupOutdatedCaches();
const precacheManifest = (self as unknown as { __WB_MANIFEST: PrecacheEntry[] }).__WB_MANIFEST;
precacheAndRoute(precacheManifest);

// ─── Push Notifications ───────────────────────────────────────────────────────
swSelf.addEventListener('push', (event) => {
    if (!event.data) return;

    let data: PushPayload;
    try {
        const parsed: unknown = event.data.json();
        data = parsed && typeof parsed === 'object' ? (parsed as PushPayload) : {};
    } catch {
        data = { title: 'MeteoAlerta', body: event.data.text() };
    }

    event.waitUntil(
        swSelf.registration.showNotification(data.title || 'MeteoAlerta', {
            body: data.body || 'Nuevo aviso meteorológico de AEMET.',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: data.badge || '/icons/icon-72x72.png',
            tag: data.tag || 'aemet-alert',
            renotify: data.renotify ?? true,
            data: data.data ?? { url: '/' },
            vibrate: [200, 100, 200],
        })
    );
});

swSelf.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'close') return;

    const payload = event.notification.data as { url?: string } | undefined;
    const url = payload?.url || '/';

    event.waitUntil(
        swSelf.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(swSelf.location.origin)) {
                        void client.navigate(url);
                        return client.focus();
                    }
                }
                return swSelf.clients.openWindow(url);
            })
    );
});
