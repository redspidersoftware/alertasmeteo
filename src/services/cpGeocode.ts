/* Geocodificación de códigos postales españoles vía Nominatim (OpenStreetMap).
   Cachea resultados (incl. fallos) en localStorage para no repetir consultas. */

export interface CpCoords { lat: number; lng: number }

const CACHE_KEY = 'meteoalerta-cp-coords';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DELAY_MS = 1100;

let cache: Record<string, CpCoords | null> | null = null;

const loadCache = (): Record<string, CpCoords | null> => {
    if (cache) return cache;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        cache = raw ? (JSON.parse(raw) as Record<string, CpCoords | null>) : {};
    } catch { cache = {}; }
    return cache;
};

const saveCache = () => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* cuota llena */ }
};

const sleep = (ms: number) => new Promise<void>(r => window.setTimeout(r, ms));

const geocodeOne = async (cp: string): Promise<CpCoords | null> => {
    const url = `${NOMINATIM_URL}?postalcode=${encodeURIComponent(cp)}&countrycodes=es&format=jsonv2&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as { lat?: string; lon?: string };
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng };
};

export const geocodePostalCodes = async (
    cps: string[],
    onProgress?: (done: number, total: number) => void,
    signal?: { cancelled: boolean },
): Promise<Record<string, CpCoords>> => {
    const store = loadCache();
    const result: Record<string, CpCoords> = {};
    const pending: string[] = [];
    const unique = Array.from(new Set(cps.filter(Boolean)));

    for (const cp of unique) {
        const hit = store[cp];
        if (hit) result[cp] = hit;
        else if (store[cp] === undefined) pending.push(cp);
    }

    let done = unique.length - pending.length;
    onProgress?.(done, unique.length);

    for (let i = 0; i < pending.length; i++) {
        if (signal?.cancelled) break;
        if (i > 0) await sleep(DELAY_MS);
        const cp = pending[i];
        try {
            const coords = await geocodeOne(cp);
            if (coords) { result[cp] = coords; store[cp] = coords; }
            else { store[cp] = null; }
        } catch { /* sin cache para reintentar en la próxima carga */ }
        saveCache();
        done++;
        onProgress?.(done, unique.length);
    }

    return result;
};
