/* Geocodificación de códigos postales españoles vía Zippopotam.us
   (gratis, sin API key, CORS abierto). Cachea resultados (incl. fallos)
   en localStorage para no repetir consultas. */

export interface CpCoords { lat: number; lng: number }

const CACHE_KEY = 'meteoalerta-cp-coords';
const CONCURRENCY = 5;
const SAVE_EVERY = 20;

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

const geocodeOne = async (cp: string, signal?: AbortSignal): Promise<CpCoords | null> => {
    const res = await fetch(`https://api.zippopotam.us/es/${encodeURIComponent(cp)}`, { signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { places?: { latitude?: string; longitude?: string }[] };
    const place = Array.isArray(data.places) ? data.places[0] : undefined;
    const lat = Number(place?.latitude);
    const lng = Number(place?.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng };
};

export const geocodePostalCodes = async (
    cps: string[],
    onProgress?: (done: number, total: number) => void,
    signal?: AbortSignal,
): Promise<Record<string, CpCoords>> => {
    const store = loadCache();
    const result: Record<string, CpCoords> = {};
    const unique = Array.from(new Set(cps.filter(Boolean)));

    // Los CPs ya geocodificados se sirven del cache; los null se reintentan
    // (puede cambiar de fuente o de dataset).
    const pending: string[] = [];
    for (const cp of unique) {
        const hit = store[cp];
        if (hit) result[cp] = hit;
        else pending.push(cp);
    }

    let done = unique.length - pending.length;
    let sinceSave = 0;
    onProgress?.(done, unique.length);

    let next = 0;
    const worker = async () => {
        while (next < pending.length) {
            if (signal?.aborted) return;
            const cp = pending[next++];
            try {
                const coords = await geocodeOne(cp, signal);
                if (coords) { result[cp] = coords; store[cp] = coords; }
                else { store[cp] = null; }
            } catch {
                if (signal?.aborted) return;
                /* error de red: sin cache para reintentar en la próxima carga */
            }
            done++;
            sinceSave++;
            if (sinceSave >= SAVE_EVERY) { sinceSave = 0; saveCache(); }
            onProgress?.(done, unique.length);
        }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
    saveCache();
    return result;
};
