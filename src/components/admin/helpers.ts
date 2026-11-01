import type { AuditEntry, PostalMapping, WeatherAlert } from './types';

/* ══════════════ HELPERS PUROS ══════════════ */

export const parseV = (v: unknown): Date | null => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
    const s = String(v).trim();
    if (/^\d{10,}$/.test(s)) { const d = new Date(Number(s)); return isNaN(d.getTime()) ? null : d; }
    // Formato español dd/MM/yyyy (opcionalmente con hora) → interpretado en UTC para no desplazar el día
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{1,2}))?$/);
    if (dmy) {
        const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), Number(dmy[4] || 0), Number(dmy[5] || 0)));
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

export const fmtDT = (v: unknown): string => {
    const d = parseV(v);
    return d ? d.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
};

export const fmtD = (v: unknown): string => {
    const d = parseV(v);
    return d ? d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

export const rel = (v: unknown): string => {
    const d = parseV(v);
    if (!d) return '—';
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    const fut = s < 0; const a = Math.abs(s);
    const str = a < 60 ? `${a} s` : a < 3600 ? `${Math.round(a / 60)} min` : a < 86400 ? `${Math.round(a / 3600)} h` : `${Math.round(a / 86400)} d`;
    return fut ? `en ${str}` : `hace ${str}`;
};

export const expiresSoon = (v?: string): boolean => {
    const d = parseV(v);
    return !!d && d.getTime() - Date.now() < 3 * 3600 * 1000;
};

export const parseHours = (raw: string, fallback: number[]): number[] => {
    if (!raw) return fallback;
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(Number); } catch { /* ignore */ }
    return fallback;
};

export const parseLevels = (raw: string): string[] => {
    if (!raw) return ['red', 'orange'];
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(String); } catch { /* ignore */ }
    return ['red', 'orange'];
};

export const parseAudit = (raw?: string): AuditEntry[] => {
    if (!raw) return [];
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter(e => e && typeof e.t === 'string' && typeof e.what === 'string'); } catch { /* ignore */ }
    return [];
};

export const dayKey = (v: string): string => {
    const d = parseV(v);
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '—';
};

export const weekStart = (d: Date): Date => {
    const x = new Date(d);
    const dow = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - dow);
    x.setHours(0, 0, 0, 0);
    return x;
};

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/* ══════════════ MAPAS DE ESTILO ══════════════ */

export const SEVERITY: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
    Extreme: { bg: 'rgba(179,38,30,.14)', fg: '#b3261e', label: 'Extrema', icon: 'crisis_alert' },
    Severe: { bg: 'rgba(230,81,0,.14)', fg: '#e65100', label: 'Severa', icon: 'warning' },
    Moderate: { bg: 'rgba(255,160,0,.16)', fg: '#a35d00', label: 'Moderada', icon: 'error_outline' },
    Minor: { bg: 'rgba(2,119,189,.14)', fg: '#0277bd', label: 'Leve', icon: 'info_outline' },
};
export const sev = (s: string) => SEVERITY[s] || { bg: 'rgba(120,120,120,.14)', fg: '#5f6368', label: s || 'Info', icon: 'help' };

// Severidades de la app (yellow/orange/red) → severidad AEMET, para el preview de destinatarios
const APP_TO_AEMET: Record<string, string> = { red: 'Extreme', orange: 'Severe', yellow: 'Moderate', green: 'Minor' };
export const appSeverityToAemet = (s: string): string => APP_TO_AEMET[s] || s;

export const CHANNEL: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
    email: { bg: 'rgba(2,119,189,.13)', fg: '#0277bd', label: 'Email', icon: 'mail' },
    telegram: { bg: 'rgba(0,136,204,.13)', fg: '#0088cc', label: 'Telegram', icon: 'send' },
    push: { bg: 'rgba(94,53,177,.13)', fg: '#5e35b1', label: 'Push', icon: 'notifications_active' },
};
export const ch = (t: string) => CHANNEL[t] || { bg: 'rgba(120,120,120,.14)', fg: '#5f6368', label: t || '—', icon: 'apps' };

/* ══════════════ ERRORES DE EDGE FUNCTIONS (UX) ══════════════ */

/**
 * Convierte el error genérico de `supabase.functions.invoke` ("non-2xx status code")
 * en un mensaje legible, leyendo el body JSON que devuelve la Edge Function
 * ({ success:false, error:'…' }). Detecta además la caducidad de sesión para que
 * el caller pueda cerrar la sesión automáticamente.
 */
export const extractFnError = async (
    response: Response | undefined,
    error: unknown,
): Promise<{ message: string; sessionExpired: boolean }> => {
    // 1) Cuerpo real devuelto por la Edge Function (sin consumir todavía)
    if (response && typeof response.clone === 'function') {
        try {
            const payload = await response.clone().json() as { error?: string; message?: string } | null;
            const msg = String(payload?.error || payload?.message || '').trim();
            if (msg) {
                return { message: msg, sessionExpired: response.status === 401 || /sesi[oó]n/i.test(msg) };
            }
        } catch { /* body no JSON → seguimos con los fallbacks */ }
    }

    // 2) Fallbacks según el tipo de error / estado
    const name = (error as { name?: string } | null)?.name;
    if (name === 'FunctionsFetchError') {
        return { message: 'No se pudo conectar con el servidor. Comprueba tu conexión a internet.', sessionExpired: false };
    }
    if (name === 'FunctionsRelayError') {
        return { message: 'Error del relay de Supabase al llamar a la Edge Function.', sessionExpired: false };
    }
    if (response?.status === 401) {
        return { message: 'Sesión no válida o caducada. Inicia sesión de nuevo.', sessionExpired: true };
    }
    const fallback = (error as Error | null)?.message || 'Error de conexión con el servidor.';
    return { message: fallback, sessionExpired: false };
};

/* ══════════════ NORMALIZACIÓN DE ZONAS (A1 + cobertura) ══════════════ */

/**
 * Normaliza el nombre de una zona AEMET para comparar de forma robusta:
 * minúsculas, sin acentos, sin puntuación extra y con espacios colapsados.
 * Así "Costa - Ampurdán", "costa ampurdan" o "COSTA AMPURDÁN" casan entre sí.
 */
export const normalizeZone = (z: string): string =>
    (z || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

/** Divide el area_desc de una alerta en zonas normalizadas (ignora "España"). */
export const alertZoneKeys = (areaDesc?: string): string[] =>
    (areaDesc || '')
        .split(';')
        .map(normalizeZone)
        .filter(p => p && p !== 'espana');

/**
 * Detecta zonas de la base que AEMET nunca menciona (huérfanas), comparando
 * de forma insensible a acentos y puntuación. Devuelve las zonas de la base
 * que no casan con ninguna alerta activa.
 */
export const orphanZones = (postal: PostalMapping[], alerts: WeatherAlert[]): string[] => {
    const mentioned = new Set<string>();
    for (const a of alerts) for (const k of alertZoneKeys(a.area_desc)) mentioned.add(k);
    const base = new Set<string>();
    for (const p of postal) {
        const k = normalizeZone(p.aemet_zone_name);
        if (k) base.add(k);
    }
    // Mapea clave normalizada → nombre original para el informe
    const keyToName = new Map<string, string>();
    for (const p of postal) {
        const k = normalizeZone(p.aemet_zone_name);
        if (k && !keyToName.has(k)) keyToName.set(k, p.aemet_zone_name);
    }
    return [...base].filter(k => !mentioned.has(k)).map(k => keyToName.get(k) || k).sort();
};
