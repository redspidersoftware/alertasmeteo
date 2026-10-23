import { useState, useEffect, useCallback } from 'react';

const WORKER_BASE_URL = 'https://aemet-supabase-service.alertasmeteo.workers.dev';

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

interface UsePushNotificationsReturn {
    status: PushStatus;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(userId: string | null): UsePushNotificationsReturn {
    const [status, setStatus] = useState<PushStatus>('loading');

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setStatus('unsupported');
            return;
        }
        if (Notification.permission === 'denied') {
            setStatus('denied');
            return;
        }
        // Check if already subscribed
        const timeout = setTimeout(() => {
            setStatus(prev => prev === 'loading' ? 'unsubscribed' : prev);
        }, 2000);

        navigator.serviceWorker.ready.then(async (reg) => {
            clearTimeout(timeout);
            const existing = await reg.pushManager.getSubscription();
            setStatus(existing ? 'subscribed' : 'unsubscribed');
        }).catch(() => {
            clearTimeout(timeout);
            setStatus('unsubscribed');
        });
    }, []);

    const subscribe = useCallback(async () => {
        if (!userId) {
            console.warn('[Push] No user id, cannot subscribe.');
            return;
        }
        try {
            setStatus('loading');

            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setStatus(permission === 'denied' ? 'denied' : 'unsubscribed');
                return;
            }

            // Get VAPID public key from server
            const keyRes = await fetch(`${WORKER_BASE_URL}/api/push-public-key`);
            if (!keyRes.ok) throw new Error('Error al obtener la clave pública del servidor');
            const { publicKey } = await keyRes.json();

            // Subscribe via PushManager
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
            });

            const keys = subscription.toJSON().keys;

            // Save subscription to backend
            const saveRes = await fetch(`${WORKER_BASE_URL}/api/push-subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subscription.endpoint,
                    p256dh: keys?.p256dh,
                    auth: keys?.auth,
                    user_id: userId
                })
            });

            if (!saveRes.ok) throw new Error('No se pudo guardar la suscripción en el servidor');

            setStatus('subscribed');
            console.log('[Push] Successfully subscribed to push notifications.');
        } catch (e) {
            console.error('[Push] Error subscribing:', e instanceof Error ? e.message : e);
            setStatus('unsubscribed');
        }
    }, [userId]);

    const unsubscribe = useCallback(async () => {
        try {
            setStatus('loading');
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.getSubscription();

            if (subscription) {
                // Remove from server first
                await fetch(`${WORKER_BASE_URL}/api/push-unsubscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });
                // Then unsubscribe locally
                await subscription.unsubscribe();
            }

            setStatus('unsubscribed');
            console.log('[Push] Successfully unsubscribed from push notifications.');
        } catch (e) {
            console.error('[Push] Error unsubscribing:', e instanceof Error ? e.message : e);
            setStatus('unsubscribed');
        }
    }, []);

    return { status, subscribe, unsubscribe };
}
