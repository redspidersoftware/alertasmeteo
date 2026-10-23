import type { WeatherAlert } from '../types';

const STORAGE_KEY = 'meteoalerta-alerts-cache';

export interface AlertsCache {
    alerts: WeatherAlert[];
    savedAt: number;
}

/** Guarda la última respuesta válida para poder mostrarla sin conexión. */
export function saveAlertsCache(alerts: WeatherAlert[]): void {
    try {
        const payload: AlertsCache = { alerts, savedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage lleno o bloqueado (modo privado): no es crítico
    }
}

/** Devuelve la caché si existe y es válida; null en caso contrario. */
export function loadAlertsCache(): AlertsCache | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<AlertsCache>;
        if (!Array.isArray(parsed.alerts) || typeof parsed.savedAt !== 'number') return null;
        return { alerts: parsed.alerts as WeatherAlert[], savedAt: parsed.savedAt };
    } catch {
        return null;
    }
}
