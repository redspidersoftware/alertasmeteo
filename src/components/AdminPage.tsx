import { useState, useEffect, useMemo, useRef } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

/* ══════════════ TIPOS ══════════════ */

interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    postalCode: string | null;
    language: string | null;
    isVerified: boolean;
    createdAt: string;
    preferredSeverities: string[];
    preferredEventTypes: string[];
}

interface AdminStats { total: number; verified: number; withPostalCode: number }

interface WorkerUser { id: string; email: string; phone?: string; daily_forecast?: boolean }

interface WeatherAlert {
    id: string;
    aemet_id?: string;
    event: string;
    severity: string;
    area_desc: string;
    headline?: string;
    description?: string;
    instruction?: string;
    status?: string;
    created_at?: string;
    effective?: string;
    expires?: string;
}

interface NotifLog {
    id: string;
    type: string;
    recipient?: string;
    alert_id?: string | null;
    created_at: string;
    users?: { name?: string; email?: string } | null;
}

interface PostalMapping { postal_code: string; aemet_zone_name: string; province: string }

interface WStats { extreme: number; severe: number; moderate: number; minor: number; total: number }
interface LStats { email: number; telegram: number; push: number; total: number }

type Tab = 'panel' | 'alertas' | 'notificaciones' | 'usuarios' | 'codigos' | 'config' | 'tests';

const TOKEN_KEY = 'meteoalerta-admin-token';
const TOTAL_POSTAL_PAGES = 38;

/* ══════════════ ESTILOS ══════════════ */

const SEVERITY: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
    Extreme: { bg: 'rgba(179,38,30,.14)', fg: '#b3261e', label: 'Extrema', icon: 'crisis_alert' },
    Severe: { bg: 'rgba(230,81,0,.14)', fg: '#e65100', label: 'Severa', icon: 'warning' },
    Moderate: { bg: 'rgba(255,160,0,.16)', fg: '#a35d00', label: 'Moderada', icon: 'error_outline' },
    Minor: { bg: 'rgba(2,119,189,.14)', fg: '#0277bd', label: 'Leve', icon: 'info_outline' },
};
const sev = (s: string) => SEVERITY[s] || { bg: 'rgba(120,120,120,.14)', fg: '#5f6368', label: s || 'Info', icon: 'help' };

const CHANNEL: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
    email: { bg: 'rgba(2,119,189,.13)', fg: '#0277bd', label: 'Email', icon: 'mail' },
    telegram: { bg: 'rgba(0,136,204,.13)', fg: '#0088cc', label: 'Telegram', icon: 'send' },
    push: { bg: 'rgba(94,53,177,.13)', fg: '#5e35b1', label: 'Push', icon: 'notifications_active' },
};
const ch = (t: string) => CHANNEL[t] || { bg: 'rgba(120,120,120,.14)', fg: '#5f6368', label: t || '—', icon: 'apps' };

const BTN = 'inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none';

/* ══════════════ HELPERS ══════════════ */

const parseV = (v: unknown): Date | null => {
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

const fmtDT = (v: unknown): string => {
    const d = parseV(v);
    return d ? d.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
};

const fmtD = (v: unknown): string => {
    const d = parseV(v);
    return d ? d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

const rel = (v: unknown): string => {
    const d = parseV(v);
    if (!d) return '—';
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    const fut = s < 0; const a = Math.abs(s);
    const str = a < 60 ? `${a} s` : a < 3600 ? `${Math.round(a / 60)} min` : a < 86400 ? `${Math.round(a / 3600)} h` : `${Math.round(a / 86400)} d`;
    return fut ? `en ${str}` : `hace ${str}`;
};

const expiresSoon = (v?: string): boolean => {
    const d = parseV(v);
    return !!d && d.getTime() - Date.now() < 3 * 3600 * 1000;
};

const parseHours = (raw: string, fallback: number[]): number[] => {
    if (!raw) return fallback;
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(Number); } catch { /* ignore */ }
    return fallback;
};
const parseLevels = (raw: string): string[] => {
    if (!raw) return ['red', 'orange'];
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(String); } catch { /* ignore */ }
    return ['red', 'orange'];
};

/* ══════════════ COMPONENTES REUTILIZABLES ══════════════ */

const StatCard = ({ icon, color, label, value, hint }: { icon: string; color: string; label: string; value: ReactNode; hint?: string }) => (
    <div className="bg-white rounded-2xl border border-[#c2c6d4]/30 shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#727784]">{label}</p>
                <p className="text-3xl font-extrabold text-[#181c20] mt-1.5 leading-none">{value}</p>
                {hint && <p className="text-[11px] text-[#727784] mt-1.5 truncate">{hint}</p>}
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>{icon}</span>
            </div>
        </div>
    </div>
);

const Card = ({ icon, title, sub, action, children, pad = true }: { icon: string; title: string; sub?: string; action?: ReactNode; children: ReactNode; pad?: boolean }) => (
    <section className="bg-white rounded-2xl border border-[#c2c6d4]/30 shadow-sm overflow-hidden">
        <header className="px-5 py-4 border-b border-[#c2c6d4]/30 flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-[#d7e2ff] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#003f87]" style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="font-extrabold text-sm text-[#181c20] leading-tight">{title}</h2>
                {sub && <p className="text-[11px] text-[#727784] leading-tight mt-0.5">{sub}</p>}
            </div>
            {action}
        </header>
        <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
);

const Loading = ({ text = 'Cargando...' }: { text?: string }) => (
    <div className="py-12 text-center">
        <div className="w-7 h-7 border-2 border-[#003f87]/25 border-t-[#003f87] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-[#727784]">{text}</p>
    </div>
);

const Empty = ({ icon, title, sub }: { icon: string; title: string; sub?: string }) => (
    <div className="py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#f1f4f9] flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[#727784]" style={{ fontSize: 28 }}>{icon}</span>
        </div>
        <p className="text-sm font-bold text-[#424752]">{title}</p>
        {sub && <p className="text-xs text-[#727784] mt-1">{sub}</p>}
    </div>
);

const SearchBox = ({ value, onChange, placeholder, icon = 'search' }: { value: string; onChange: (v: string) => void; placeholder: string; icon?: string }) => (
    <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727784]" style={{ fontSize: 19 }}>{icon}</span>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/15 transition-all" />
    </div>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
        <label className="text-[11px] font-bold text-[#424752] block mb-1.5">{label}</label>
        {children}
    </div>
);

const inputCls = 'w-full h-11 px-3 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/15 transition-all';

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[#c2c6d4]/30 bg-[#f7f9ff]">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="leading-none">
            <p className="text-lg font-extrabold text-[#181c20]">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#727784] mt-0.5">{label}</p>
        </div>
    </div>
);

/* ══════════════ PÁGINA ADMIN ══════════════ */

export const AdminPage = () => {
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const [tab, setTab] = useState<Tab>('panel');
    const loaded = useRef<Set<string>>(new Set());
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
    const [clock, setClock] = useState('--:--:--');

    // Panel
    const [panelLoading, setPanelLoading] = useState(false);

    // Usuarios
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Alertas
    const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
    const [wStats, setWStats] = useState<WStats>({ extreme: 0, severe: 0, moderate: 0, minor: 0, total: 0 });
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [wForm, setWForm] = useState({ severity: '', area: '', active: 'true', limit: '100' });
    const [openAlert, setOpenAlert] = useState<string | null>(null);

    // Logs
    const [logs, setLogs] = useState<NotifLog[]>([]);
    const [lStats, setLStats] = useState<LStats>({ email: 0, telegram: 0, push: 0, total: 0 });
    const [logsLoading, setLogsLoading] = useState(false);
    const [lForm, setLForm] = useState({ type: '', from: '', to: '', limit: '100' });

    // Códigos postales
    const [postal, setPostal] = useState<PostalMapping[]>([]);
    const [postalProgress, setPostalProgress] = useState({ done: 0, loading: false });
    const [postalSearch, setPostalSearch] = useState('');
    const [postalModal, setPostalModal] = useState<{ cp: string; zone: string; prov: string; isNew: boolean } | null>(null);
    const [postalSaving, setPostalSaving] = useState(false);

    // Config
    const [cfg, setCfg] = useState<Record<string, string>>({});
    const [cfgLoading, setCfgLoading] = useState(false);

    // Tests
    const [testResult, setTestResult] = useState<Record<string, { loading: boolean; ok?: boolean; msg: string }>>({});
    const [workerAlerts, setWorkerAlerts] = useState<WeatherAlert[]>([]);
    const [workerUsers, setWorkerUsers] = useState<WorkerUser[]>([]);
    const [nationalPrediction, setNationalPrediction] = useState<string>('Cargando...');

    const notify = (type: 'ok' | 'err', msg: string) => {
        setToast({ type, msg });
        window.setTimeout(() => setToast(null), 3800);
    };

    useEffect(() => {
        if (token) { loaded.current.clear(); goto('panel', true); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        const tick = () => setClock(new Intl.DateTimeFormat('es-ES', {
            timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        }).format(new Date()));
        tick();
        const iv = window.setInterval(tick, 1000);
        return () => window.clearInterval(iv);
    }, []);

    const invoke = async (fn: string, body: Record<string, unknown>) => {
        const { data, error } = await supabase.functions.invoke(fn, { body: { ...body, token } });
        if (data && data.success === false) {
            if (String(data.error || '').includes('Sesión')) logout();
            throw new Error(data.error || 'Error en la API');
        }
        if (error) throw error;
        return data;
    };
    const callApi = (body: Record<string, unknown>) => invoke('admin-api', body);
    const callWorker = (body: Record<string, unknown>) => invoke('admin-worker', body);

    /* ── PANEL ── */
    const loadPanel = async (force = false) => {
        if (loaded.current.has('panel') && !force) return;
        setPanelLoading(true);
        try {
            const [a, l, u, c] = await Promise.allSettled([
                callWorker({ action: 'get-weather-alerts', params: { active: 'true', limit: '50' } }),
                callWorker({ action: 'get-logs', params: { limit: '8' } }),
                callApi({ action: 'list' }),
                callWorker({ action: 'get-config' }),
            ]);
            if (a.status === 'fulfilled') { setAlerts(a.value.alerts || []); setWStats(a.value.stats || wStats); }
            if (l.status === 'fulfilled') { setLogs(l.value.logs || []); setLStats(l.value.stats || lStats); }
            if (u.status === 'fulfilled') { setUsers(u.value.users || []); setStats(u.value.stats || null); }
            if (c.status === 'fulfilled') setCfg(c.value.config || {});
            loaded.current.add('panel');
            loaded.current.add('usuarios');
            loaded.current.add('config');
        } finally { setPanelLoading(false); }
    };

    /* ── USUARIOS ── */
    const loadUsers = async (force = false) => {
        if (loaded.current.has('usuarios') && !force) return;
        setUsersLoading(true); setUsersError(null);
        try {
            const data = await callApi({ action: 'list' });
            setUsers(data.users || []); setStats(data.stats || null);
            loaded.current.add('usuarios');
        } catch (err) { setUsersError(err instanceof Error ? err.message : 'Error cargando usuarios'); }
        finally { setUsersLoading(false); }
    };

    const handleDeleteUser = async (u: AdminUser) => {
        if (!confirm(`¿Eliminar definitivamente a ${u.email}?\n\nEsta acción no se puede deshacer.`)) return;
        try {
            await callApi({ action: 'delete', userId: u.id, targetEmail: u.email });
            setUsers(prev => prev.filter(x => x.id !== u.id));
            if (stats) setStats({ ...stats, total: stats.total - 1 });
            notify('ok', `${u.email} eliminado`);
        } catch (err) { notify('err', err instanceof Error ? err.message : 'Error al eliminar'); }
    };

    /* ── ALERTAS ── */
    const loadWeather = async (force = false, form = wForm) => {
        if (loaded.current.has('alertas') && !force) return;
        setAlertsLoading(true);
        try {
            const params: Record<string, string> = { limit: form.limit || '100' };
            if (form.severity) params.severity = form.severity;
            if (form.area) params.area = form.area;
            if (form.active) params.active = form.active;
            const data = await callWorker({ action: 'get-weather-alerts', params });
            setAlerts(data.alerts || []);
            setWStats(data.stats || { extreme: 0, severe: 0, moderate: 0, minor: 0, total: 0 });
            loaded.current.add('alertas');
        } catch (err) { notify('err', err instanceof Error ? err.message : 'Error cargando alertas'); }
        finally { setAlertsLoading(false); }
    };

    /* ── LOGS ── */
    const loadLogs = async (force = false, form = lForm) => {
        if (loaded.current.has('logs') && !force) return;
        setLogsLoading(true);
        try {
            const params: Record<string, string> = { limit: form.limit || '100' };
            if (form.type) params.type = form.type;
            if (form.from) params.from = `${form.from}T00:00:00Z`;
            if (form.to) params.to = `${form.to}T23:59:59Z`;
            const data = await callWorker({ action: 'get-logs', params });
            setLogs(data.logs || []);
            setLStats(data.stats || { email: 0, telegram: 0, push: 0, total: 0 });
            loaded.current.add('logs');
        } catch (err) { notify('err', err instanceof Error ? err.message : 'Error cargando notificaciones'); }
        finally { setLogsLoading(false); }
    };

    /* ── CÓDIGOS POSTALES ── */
    const loadPostalCodes = async (force = false) => {
        if (loaded.current.has('postal') && !force) return;
        setPostalProgress({ done: 0, loading: true });
        const all: PostalMapping[] = [];
        let next = 0; let done = 0;
        const run = async () => {
            while (next < TOTAL_POSTAL_PAGES) {
                const page = next++;
                try {
                    const data = await callWorker({ action: 'get-postal-codes', params: { page: String(page) } });
                    all.push(...(data.mappings || []));
                } catch { /* skip page */ }
                done++;
                setPostalProgress({ done, loading: done < TOTAL_POSTAL_PAGES });
            }
        };
        await Promise.all(Array.from({ length: 6 }, run));
        all.sort((a, b) => (a.postal_code || '').localeCompare(b.postal_code || ''));
        setPostal(all);
        loaded.current.add('postal');
        setPostalProgress({ done: TOTAL_POSTAL_PAGES, loading: false });
    };

    const savePostal = async () => {
        if (!postalModal) return;
        const cp = postalModal.cp.trim();
        const zone = postalModal.zone.trim();
        const prov = postalModal.prov.trim();
        if (!cp || !zone || !prov) { notify('err', 'Rellena código postal, zona y provincia'); return; }
        setPostalSaving(true);
        try {
            await callWorker({
                action: 'save-postal-code',
                params: { postal_code: cp, aemet_zone_name: zone, province: prov, old_postal_code: postalModal.cp },
            });
            setPostal(prev => {
                const withoutOld = postalModal.isNew ? prev : prev.filter(p => p.postal_code !== postalModal.cp);
                const next = [...withoutOld.filter(p => p.postal_code !== cp), { postal_code: cp, aemet_zone_name: zone, province: prov }];
                next.sort((a, b) => a.postal_code.localeCompare(b.postal_code));
                return next;
            });
            setPostalModal(null);
            notify('ok', `Código ${cp} guardado`);
        } catch (err) { notify('err', err instanceof Error ? err.message : 'Error al guardar'); }
        finally { setPostalSaving(false); }
    };

    const deletePostal = async (cp: string) => {
        if (!confirm(`¿Eliminar el código postal ${cp}?`)) return;
        try {
            await callWorker({ action: 'delete-postal-code', params: { postal_code: cp } });
            setPostal(prev => prev.filter(p => p.postal_code !== cp));
            notify('ok', `Código ${cp} eliminado`);
        } catch (err) { notify('err', err instanceof Error ? err.message : 'Error al eliminar'); }
    };

    const uniqueZones = useMemo(() => Array.from(new Set(postal.map(p => p.aemet_zone_name).filter(Boolean))).sort(), [postal]);
    const uniqueProvinces = useMemo(() => Array.from(new Set(postal.map(p => p.province).filter(Boolean))).sort(), [postal]);

    const postalFiltered = useMemo(() => {
        const q = postalSearch.trim().toLowerCase();
        if (!q) return postal;
        return postal.filter(p =>
            (p.postal_code || '').includes(q) ||
            (p.aemet_zone_name || '').toLowerCase().includes(q) ||
            (p.province || '').toLowerCase().includes(q));
    }, [postal, postalSearch]);

    /* ── CONFIG ── */
    const loadConfig = async (force = false) => {
        if (loaded.current.has('config') && !force) return;
        setCfgLoading(true);
        try {
            const data = await callWorker({ action: 'get-config' });
            setCfg(data.config || {});
            loaded.current.add('config');
        } catch (err) { notify('err', err instanceof Error ? err.message : 'Error cargando configuración'); }
        finally { setCfgLoading(false); }
    };

    const saveConfigValues = async (entries: [string, string][], okMsg = '¡Guardado!') => {
        try {
            for (const [k, v] of entries) {
                await callWorker({ action: 'save-config', key: k, value: v });
                setCfg(prev => ({ ...prev, [k]: v }));
            }
            notify('ok', okMsg);
        } catch (err) { notify('err', err instanceof Error ? err.message : 'Error al guardar'); }
    };

    /* ── TESTS ── */
    const loadWorkerData = async (force = false) => {
        if (loaded.current.has('tests') && !force) return;
        const [alertsRes, usersRes, predRes] = await Promise.allSettled([
            callWorker({ action: 'get-weather-alerts', params: { active: 'true', limit: '100' } }),
            callWorker({ action: 'get-users' }),
            callWorker({ action: 'run-test', path: '/test-national-prediction' }),
        ]);
        if (alertsRes.status === 'fulfilled') setWorkerAlerts(alertsRes.value.alerts || []);
        if (usersRes.status === 'fulfilled') setWorkerUsers(usersRes.value.users || []);
        setNationalPrediction(predRes.status === 'fulfilled'
            ? (predRes.value.data?.text || predRes.value.text || 'Sin datos')
            : 'Error cargando la predicción nacional');
        loaded.current.add('tests');
    };

    const runTest = async (id: string, path: string, params?: Record<string, string>, showImage = false) => {
        setTestResult(prev => ({ ...prev, [id]: { loading: true, msg: 'Ejecutando...' } }));
        try {
            const data = await callWorker({ action: 'run-test', path, params });
            if (showImage && data.data?.url) {
                setTestResult(prev => ({ ...prev, [id]: { loading: false, ok: true, msg: data.data.url } }));
            } else {
                const pretty = data.data ? JSON.stringify(data.data, null, 2) : (data.text || 'OK');
                setTestResult(prev => ({ ...prev, [id]: { loading: false, ok: data.success, msg: pretty } }));
            }
        } catch (err) {
            setTestResult(prev => ({ ...prev, [id]: { loading: false, ok: false, msg: err instanceof Error ? err.message : 'Error' } }));
        }
    };

    const runTwitterIntent = async () => {
        setTestResult(prev => ({ ...prev, twitter: { loading: true, msg: 'Preparando...' } }));
        try {
            const data = await callWorker({ action: 'run-test', path: '/test-twitter' });
            const text = data.data?.text;
            if (text) {
                window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
                setTestResult(prev => ({ ...prev, twitter: { loading: false, ok: true, msg: 'Ventana de publicación abierta.' } }));
            } else {
                setTestResult(prev => ({ ...prev, twitter: { loading: false, ok: false, msg: data.text || 'Error al generar el texto' } }));
            }
        } catch (err) {
            setTestResult(prev => ({ ...prev, twitter: { loading: false, ok: false, msg: err instanceof Error ? err.message : 'Error' } }));
        }
    };

    const logout = () => {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUsers([]); setStats(null);
        setUsername(''); setPassword('');
        setTab('panel');
    };

    const goto = (t: Tab, force = false) => {
        setTab(t);
        if (!token) return;
        if (t === 'panel') loadPanel(force);
        else if (t === 'usuarios') loadUsers(force);
        else if (t === 'alertas') loadWeather(force);
        else if (t === 'notificaciones') loadLogs(force);
        else if (t === 'codigos') loadPostalCodes(force);
        else if (t === 'config') loadConfig(force);
        else if (t === 'tests') loadWorkerData(force);
    };

    const refreshCurrent = () => { goto(tab, true); notify('ok', 'Actualizando...'); };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoginLoading(true); setLoginError(null);
        try {
            const { data, error } = await supabase.functions.invoke('admin-auth', { body: { username, password } });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Error de autenticación');
            sessionStorage.setItem(TOKEN_KEY, data.token);
            setToken(data.token);
        } catch (err) { setLoginError(err instanceof Error ? err.message : 'Error de autenticación'); }
        finally { setLoginLoading(false); }
    };

    /* ── FILTROS ── */
    const filteredUsers = users.filter(u =>
        !search ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.postalCode || '').includes(search)
    );

    /* ══════════ LOGIN ══════════ */
    if (!token) {
        return (
            <div className="min-h-screen bg-[#f7f9ff] flex items-center justify-center p-5 font-['Hanken_Grotesk',sans-serif]">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }} className="w-full max-w-[420px] flex flex-col gap-6">
                    <header className="flex flex-col items-center text-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#003f87] to-[#0056b3] rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: 34 }}>admin_panel_settings</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-[#003f87] tracking-tight">Panel de Administración</h1>
                        <p className="text-sm text-[#424752]">Acceso restringido · MeteoAlerta España</p>
                    </header>

                    <section className="bg-white rounded-3xl shadow-xl border border-[#ebeef3] p-6">
                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            {loginError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
                                    <p className="text-xs text-red-700">{loginError}</p>
                                </div>
                            )}
                            <Field label="Usuario">
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">person</span>
                                    <input id="admin-user" type="text" required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)}
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none transition-all focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/20" placeholder="Tu usuario" />
                                </div>
                            </Field>
                            <Field label="Contraseña">
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">lock</span>
                                    <input id="admin-pass" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none transition-all focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/20" placeholder="••••••••" />
                                </div>
                            </Field>
                            <button type="submit" disabled={loginLoading}
                                className={`${BTN} h-12 w-full mt-1 bg-gradient-to-r from-[#003f87] to-[#0056b3] text-white text-sm shadow-md hover:brightness-110`}>
                                {loginLoading
                                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>Entrar al panel</>}
                            </button>
                        </form>
                    </section>
                    <div className="text-center"><a href="/" className="text-sm text-[#003f87] font-bold hover:underline">← Volver a la app</a></div>
                </motion.div>
            </div>
        );
    }

    /* ══════════ PANELES DE PESTAÑAS ══════════ */

    const renderPanel = () => {
        const activeAlerts = alerts.slice(0, 6);
        return (
            <div className="space-y-5">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard icon="warning" color="linear-gradient(135deg,#f97316,#ea580c)" label="Alertas activas" value={wStats.total || alerts.length} hint="AEMET en tiempo real" />
                    <StatCard icon="group" color="linear-gradient(135deg,#003f87,#0056b3)" label="Usuarios" value={stats?.total ?? '—'} hint={stats ? `${stats.verified} verificados` : 'cargando'} />
                    <StatCard icon="notifications" color="linear-gradient(135deg,#0891b2,#06b6d4)" label="Notificaciones" value={lStats.total} hint={`${lStats.telegram} telegram · ${lStats.email} email · ${lStats.push} push`} />
                    <StatCard icon="wb_twilight" color="linear-gradient(135deg,#16a34a,#22c55e)" label="Previsión diaria" value={cfg.daily_forecast_time || '—'} hint={`Último: ${cfg.last_daily_sent_id || 'ninguno'}`} />
                </div>

                <div className="grid lg:grid-cols-5 gap-5">
                    <div className="lg:col-span-3 space-y-5">
                        <Card icon="warning" title="Alertas activas" sub="Pulsa una fila para ver el detalle completo"
                            action={<button onClick={() => goto('alertas')} className={`${BTN} px-3 py-2 bg-[#f1f4f9] text-[#424752] hover:bg-[#e5e8ee]`}>Ver todas</button>}>
                            {panelLoading ? <Loading /> : activeAlerts.length === 0 ? (
                                <Empty icon="weather_sunny" title="Sin alertas activas" sub="Todo tranquilo por ahora" />
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {activeAlerts.map(a => {
                                        const s = sev(a.severity);
                                        return (
                                            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#c2c6d4]/30 bg-[#f7f9ff] hover:border-[#003f87]/40 transition-colors">
                                                <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 19, color: s.fg }}>{s.icon}</span>
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-[#181c20] truncate">{a.event}</p>
                                                    <p className="text-[11px] text-[#727784] truncate">{a.area_desc || 'España'}</p>
                                                </div>
                                                <span className="text-[10px] font-extrabold px-2 py-1 rounded-full flex-shrink-0" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        <Card icon="monitor_heart" title="Estado del sistema" sub="Última actividad de cada servicio automatizado">
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                {[
                                    { icon: 'cloud_sync', label: 'AEMET', value: rel(cfg.last_alerts_check_time), hint: fmtDT(cfg.last_alerts_check_time), color: '#f97316' },
                                    { icon: 'send', label: 'Telegram', value: rel(cfg.last_telegram_report_time), hint: fmtDT(cfg.last_telegram_report_time), color: '#0088cc' },
                                    { icon: 'summarize', label: 'Resumen diario', value: rel(cfg.last_daily_summary_date), hint: fmtDT(cfg.last_daily_summary_date), color: '#7c3aed' },
                                    {
                                        icon: 'alternate_email', label: 'Twitter / X', color: '#475569',
                                        value: `${parseHours(cfg.twitter_forecast_hours, [8, 10, 20]).join('h · ')}h`,
                                        hint: 'Publicación automática',
                                    },
                                ].map(sv => (
                                    <div key={sv.label} className="p-3.5 rounded-xl bg-[#f7f9ff] border border-[#c2c6d4]/30 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: `${sv.color}20` }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 16, color: sv.color }}>{sv.icon}</span>
                                            </span>
                                            <p className="text-xs font-extrabold text-[#181c20] truncate">{sv.label}</p>
                                        </div>
                                        <p className="text-[11px] text-[#424752] font-semibold break-words">{sv.value}</p>
                                        <p className="text-[10px] text-[#727784] mt-0.5 break-words">{sv.hint}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card icon="notifications" title="Actividad reciente" sub="Últimas notificaciones enviadas"
                            action={<button onClick={() => goto('notificaciones')} className={`${BTN} px-3 py-2 bg-[#f1f4f9] text-[#424752] hover:bg-[#e5e8ee]`}>Historial</button>}>
                            {panelLoading ? <Loading /> : logs.length === 0 ? (
                                <Empty icon="notifications_off" title="Sin notificaciones" />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {logs.map(l => {
                                        const c = ch(l.type);
                                        return (
                                            <div key={l.id} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#f7f9ff] transition-colors">
                                                <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: c.bg }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: c.fg }}>{c.icon}</span>
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-[#181c20] truncate">{l.users?.email || l.recipient || '—'}</p>
                                                    <p className="text-[10px] text-[#727784] truncate">{l.alert_id || c.label}</p>
                                                </div>
                                                <span className="text-[10px] text-[#727784] flex-shrink-0">{rel(l.created_at)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        );
    };

    const renderAlertas = () => (
        <div className="space-y-5">
            <Card icon="filter_alt" title="Filtros" sub="Busca por zona o tipo de fenómeno (búsqueda parcial)">
                <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
                    <Field label="Severidad">
                        <select value={wForm.severity} onChange={e => setWForm(f => ({ ...f, severity: e.target.value }))} className={inputCls}>
                            <option value="">Todas</option><option value="Extreme">Extrema</option><option value="Severe">Severa</option>
                            <option value="Moderate">Moderada</option><option value="Minor">Leve</option>
                        </select>
                    </Field>
                    <Field label="Estado">
                        <select value={wForm.active} onChange={e => setWForm(f => ({ ...f, active: e.target.value }))} className={inputCls}>
                            <option value="true">Activas</option><option value="false">Archivadas</option>
                        </select>
                    </Field>
                    <Field label="Zona">
                        <input type="text" value={wForm.area} onChange={e => setWForm(f => ({ ...f, area: e.target.value }))}
                            placeholder="Ej: costa, A Mariña..." className={inputCls} />
                    </Field>
                    <Field label="Máx. resultados">
                        <input type="number" min={1} max={500} value={wForm.limit} onChange={e => setWForm(f => ({ ...f, limit: e.target.value }))} className={inputCls} />
                    </Field>
                    <button onClick={() => loadWeather(true, wForm)} disabled={alertsLoading}
                        className={`${BTN} h-11 px-5 bg-[#003f87] text-white shadow hover:brightness-110`}>
                        {alertsLoading ? 'Buscando...' : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>Buscar</>}
                    </button>
                </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatChip label="Extremas" value={wStats.extreme} color="#b3261e" />
                <StatChip label="Severas" value={wStats.severe} color="#e65100" />
                <StatChip label="Moderadas" value={wStats.moderate} color="#f59e0b" />
                <StatChip label="Leves" value={wStats.minor} color="#0277bd" />
                <StatChip label="Total" value={wStats.total} color="#5f6368" />
            </div>

            <Card icon="warning" title="Alertas meteorológicas" sub={`${alerts.length} resultados · pulsa una fila para desplegar`} pad={false}>
                {alertsLoading ? <Loading text="Consultando el servicio AEMET..." /> : alerts.length === 0 ? (
                    <Empty icon="weather_sunny" title="Sin resultados" sub="Prueba a cambiar los filtros de búsqueda" />
                ) : (
                    <div className="divide-y divide-[#c2c6d4]/20">
                        {alerts.map(a => {
                            const s = sev(a.severity);
                            const open = openAlert === a.id;
                            return (
                                <div key={a.id}>
                                    <button onClick={() => setOpenAlert(open ? null : a.id)}
                                        className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-[#f7f9ff] transition-colors">
                                        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 19, color: s.fg }}>{s.icon}</span>
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-[#181c20]">{a.event}</p>
                                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                                            </div>
                                            <p className="text-[11px] text-[#727784] truncate">{a.area_desc || 'España'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 hidden sm:block">
                                            <p className={`text-[11px] font-bold ${expiresSoon(a.expires) ? 'text-[#e65100]' : 'text-[#727784]'}`}>{expiresSoon(a.expires) ? '⚡ ' : ''}Expira {fmtDT(a.expires)}</p>
                                            <p className="text-[10px] text-[#727784]">Recibida {rel(a.created_at)}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-[#727784] transition-transform" style={{ fontSize: 20, transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {open && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: .22 }} className="overflow-hidden bg-[#f7f9ff]">
                                                <div className="px-5 py-4 grid md:grid-cols-2 gap-4 border-t border-[#c2c6d4]/30">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#727784] mb-1">Descripción</p>
                                                        <p className="text-xs text-[#424752] leading-relaxed">{a.description || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#727784] mb-1">Instrucciones</p>
                                                        <p className="text-xs text-[#424752] leading-relaxed">{a.instruction || '—'}</p>
                                                    </div>
                                                    <div className="md:col-span-2 flex flex-wrap gap-4 text-[11px] text-[#727784]">
                                                        <span><strong className="text-[#424752]">Efectiva:</strong> {fmtDT(a.effective)}</span>
                                                        <span><strong className="text-[#424752]">Expira:</strong> {fmtDT(a.expires)}</span>
                                                        <span className="font-mono"><strong className="font-sans text-[#424752]">ID:</strong> {a.aemet_id || a.id}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );

    const renderLogs = () => (
        <div className="space-y-5">
            <Card icon="filter_alt" title="Filtros" sub="Filtra el historial de notificaciones enviadas">
                <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
                    <Field label="Canal">
                        <select value={lForm.type} onChange={e => setLForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                            <option value="">Todos</option><option value="email">Email</option>
                            <option value="telegram">Telegram</option><option value="push">Push</option>
                        </select>
                    </Field>
                    <Field label="Desde">
                        <input type="date" value={lForm.from} onChange={e => setLForm(f => ({ ...f, from: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Hasta">
                        <input type="date" value={lForm.to} onChange={e => setLForm(f => ({ ...f, to: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Máx. resultados">
                        <input type="number" min={1} max={500} value={lForm.limit} onChange={e => setLForm(f => ({ ...f, limit: e.target.value }))} className={inputCls} />
                    </Field>
                    <button onClick={() => loadLogs(true, lForm)} disabled={logsLoading}
                        className={`${BTN} h-11 px-5 bg-[#003f87] text-white shadow hover:brightness-110`}>
                        {logsLoading ? 'Buscando...' : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>Buscar</>}
                    </button>
                </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatChip label="Email" value={lStats.email} color="#0277bd" />
                <StatChip label="Telegram" value={lStats.telegram} color="#0088cc" />
                <StatChip label="Push" value={lStats.push} color="#5e35b1" />
                <StatChip label="Total" value={lStats.total} color="#5f6368" />
            </div>

            <Card icon="notifications" title="Historial de notificaciones" sub={`${logs.length} registros mostrados`} pad={false}>
                {logsLoading ? <Loading text="Cargando notificaciones..." /> : logs.length === 0 ? (
                    <Empty icon="notifications_off" title="Sin registros" sub="No hay notificaciones con ese filtro" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f1f4f9] text-[10px] uppercase tracking-wider text-[#727784]">
                                    <th className="text-left px-5 py-3 font-bold">Fecha y hora</th>
                                    <th className="text-left px-5 py-3 font-bold">Canal</th>
                                    <th className="text-left px-5 py-3 font-bold">Destinatario</th>
                                    <th className="text-left px-5 py-3 font-bold hidden md:table-cell">Asunto / Alerta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l, i) => {
                                    const c = ch(l.type);
                                    return (
                                        <tr key={l.id} className={`border-t border-[#c2c6d4]/20 hover:bg-[#f7f9ff] transition-colors ${i % 2 === 1 ? 'bg-[#f7f9ff]/60' : ''}`}>
                                            <td className="px-5 py-3 text-xs text-[#424752] whitespace-nowrap">{fmtDT(l.created_at)}</td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.fg }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{c.icon}</span>{c.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="font-bold text-[#181c20] text-xs truncate max-w-[180px]">{l.users?.email || l.recipient || '—'}</p>
                                                {l.users?.name && <p className="text-[10px] text-[#727784]">{l.users.name}</p>}
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell text-[11px] text-[#727784] font-mono truncate max-w-[260px]">{l.alert_id || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="px-5 py-3 text-[11px] text-[#727784] border-t border-[#c2c6d4]/20">{logs.length} registros · {lStats.total} en total</p>
                    </div>
                )}
            </Card>
        </div>
    );

    const renderUsuarios = () => (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon="group" color="linear-gradient(135deg,#003f87,#0056b3)" label="Usuarios totales" value={stats?.total ?? '—'} />
                <StatCard icon="verified_user" color="linear-gradient(135deg,#16a34a,#22c55e)" label="Verificados" value={stats?.verified ?? '—'} />
                <StatCard icon="markunread_mailbox" color="linear-gradient(135deg,#f97316,#ea580c)" label="Con código postal" value={stats?.withPostalCode ?? '—'} />
            </div>

            <Card icon="person_search" title="Usuarios registrados" sub="Busca por nombre, email o código postal" pad={false}
                action={<button onClick={() => loadUsers(true)} className={`${BTN} px-3 py-2 bg-[#f1f4f9] text-[#424752] hover:bg-[#e5e8ee]`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>Recargar</button>}>
                <div className="p-4 border-b border-[#c2c6d4]/30">
                    <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nombre, email o código postal..." />
                </div>
                {usersError && (
                    <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 17 }}>error</span>
                        <p className="text-xs text-red-700">{usersError}</p>
                    </div>
                )}
                {usersLoading ? <Loading text="Cargando usuarios..." /> : filteredUsers.length === 0 ? (
                    <Empty icon="group_off" title="No se encontraron usuarios" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f1f4f9] text-[10px] uppercase tracking-wider text-[#727784]">
                                    <th className="text-left px-5 py-3 font-bold">Usuario</th>
                                    <th className="text-left px-5 py-3 font-bold hidden md:table-cell">Código Postal</th>
                                    <th className="text-left px-5 py-3 font-bold hidden lg:table-cell">Alertas</th>
                                    <th className="text-left px-5 py-3 font-bold hidden lg:table-cell">Alta</th>
                                    <th className="text-right px-5 py-3 font-bold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u, i) => (
                                    <tr key={u.id} className={`border-t border-[#c2c6d4]/20 hover:bg-[#f7f9ff] transition-colors ${i % 2 === 1 ? 'bg-[#f7f9ff]/60' : ''}`}>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-[#d7e2ff] flex items-center justify-center text-[#003f87] font-bold text-xs flex-shrink-0">
                                                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold truncate max-w-[180px]">{u.name || '—'}</p>
                                                    <p className="text-[11px] text-[#727784] truncate max-w-[180px]">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 hidden md:table-cell"><span className="font-mono font-bold text-[#424752]">{u.postalCode || '—'}</span></td>
                                        <td className="px-5 py-3 hidden lg:table-cell"><span className="text-[10px] font-bold bg-[#ebeef3] text-[#424752] px-2 py-1 rounded-full">{u.preferredSeverities.length} niveles</span></td>
                                        <td className="px-5 py-3 hidden lg:table-cell text-xs text-[#727784]">{fmtD(u.createdAt)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => handleDeleteUser(u)}
                                                className={`${BTN} px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#ba1a1a] ml-auto`}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span><span className="hidden sm:inline">Eliminar</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="px-5 py-3 text-[11px] text-[#727784] border-t border-[#c2c6d4]/20">{filteredUsers.length} de {users.length} usuarios</p>
                    </div>
                )}
            </Card>
        </div>
    );

    const renderCodigos = () => (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon="pin_drop" color="linear-gradient(135deg,#003f87,#0056b3)" label="Códigos postales" value={postal.length || '—'}
                    hint={postalProgress.loading ? `Cargando ${postalProgress.done}/${TOTAL_POSTAL_PAGES}` : 'base de datos AEMET'} />
                <StatCard icon="map" color="linear-gradient(135deg,#0891b2,#06b6d4)" label="Zonas AEMET" value={uniqueZones.length || '—'} hint="provincias y zonas costeras" />
                <StatCard icon="location_city" color="linear-gradient(135deg,#f97316,#ea580c)" label="Provincias" value={uniqueProvinces.length || '—'} />
            </div>

            {postalProgress.loading && (
                <div className="bg-white rounded-2xl border border-[#c2c6d4]/30 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-bold text-[#424752] flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-[#003f87]/30 border-t-[#003f87] rounded-full animate-spin inline-block" />
                            Descargando la base de datos completa…
                        </p>
                        <p className="text-xs font-extrabold text-[#003f87]">{postalProgress.done}/{TOTAL_POSTAL_PAGES}</p>
                    </div>
                    <div className="h-2 rounded-full bg-[#ebeef3] overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#003f87] to-[#0056b3] transition-all duration-300"
                            style={{ width: `${(postalProgress.done / TOTAL_POSTAL_PAGES) * 100}%` }} />
                    </div>
                </div>
            )}

            <Card icon="markunread_mailbox" title="Mapeo Código Postal → Zona AEMET" sub="Determina qué zona meteorológica recibe cada usuario" pad={false}
                action={
                    <div className="flex gap-2">
                        <button onClick={() => loadPostalCodes(true)} disabled={postalProgress.loading}
                            className={`${BTN} px-3 py-2 bg-[#f1f4f9] text-[#424752] hover:bg-[#e5e8ee]`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>Recargar
                        </button>
                        <button onClick={() => setPostalModal({ cp: '', zone: '', prov: '', isNew: true })}
                            className={`${BTN} px-3.5 py-2 bg-[#003f87] text-white shadow hover:brightness-110`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>Nuevo
                        </button>
                    </div>
                }>
                <div className="p-4 border-b border-[#c2c6d4]/30">
                    <SearchBox value={postalSearch} onChange={setPostalSearch} placeholder="Buscar código postal, zona o provincia..." />
                </div>

                {postal.length === 0 && !postalProgress.loading ? (
                    <Empty icon="inbox" title="No hay códigos cargados" sub="Pulsa Recargar para descargar la base" />
                ) : postalFiltered.length === 0 ? (
                    <Empty icon="search_off" title="Sin resultados" sub={`No hay códigos que coincidan con "${postalSearch}"`} />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#f1f4f9] text-[10px] uppercase tracking-wider text-[#727784]">
                                        <th className="text-left px-5 py-3 font-bold">Código Postal</th>
                                        <th className="text-left px-5 py-3 font-bold">Zona AEMET</th>
                                        <th className="text-left px-5 py-3 font-bold hidden sm:table-cell">Provincia</th>
                                        <th className="text-right px-5 py-3 font-bold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {postalFiltered.slice(0, 300).map((p, i) => (
                                        <tr key={p.postal_code} className={`border-t border-[#c2c6d4]/20 hover:bg-[#f7f9ff] transition-colors ${i % 2 === 1 ? 'bg-[#f7f9ff]/60' : ''}`}>
                                            <td className="px-5 py-2.5"><span className="font-mono font-extrabold text-[#181c20]">{p.postal_code}</span></td>
                                            <td className="px-5 py-2.5 text-[#424752]">{p.aemet_zone_name}</td>
                                            <td className="px-5 py-2.5 text-[#727784] hidden sm:table-cell">{p.province}</td>
                                            <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                                <button onClick={() => setPostalModal({ cp: p.postal_code, zone: p.aemet_zone_name, prov: p.province, isNew: false })}
                                                    className={`${BTN} px-2.5 py-1.5 bg-[#f1f4f9] hover:bg-[#e5e8ee] text-[#424752] mr-1.5`}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                                                </button>
                                                <button onClick={() => deletePostal(p.postal_code)}
                                                    className={`${BTN} px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#ba1a1a]`}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="px-5 py-3 text-[11px] text-[#727784] border-t border-[#c2c6d4]/20">
                            Mostrando {Math.min(300, postalFiltered.length)} de {postalFiltered.length} coincidencias · {postal.length} en total
                        </p>
                    </>
                )}
            </Card>
        </div>
    );

    const renderConfig = () => (
        <Card icon="tune" title="Parámetros del Sistema" sub="Configuración del servicio de notificaciones (Cloudflare Worker)">
            {cfgLoading ? <Loading text="Cargando configuración..." /> : (
                <div className="space-y-7">
                    <ConfigBlock title="Previsión Diaria" icon="wb_twilight">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                            <div className="flex-1">
                                <Field label="Hora de envío (HH:mm)">
                                    <input type="time" value={cfg.daily_forecast_time || ''} onChange={e => setCfg(p => ({ ...p, daily_forecast_time: e.target.value }))} className={inputCls} />
                                </Field>
                            </div>
                            <button onClick={() => saveConfigValues([['daily_forecast_time', cfg.daily_forecast_time || '']])}
                                className={`${BTN} h-11 px-5 bg-[#003f87] text-white shadow hover:brightness-110`}>Guardar</button>
                        </div>
                        <p className="text-[11px] text-[#727784] mt-2.5 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.last_daily_sent_id ? '#22c55e' : '#9ca3af' }} />
                            Último envío: <strong className="text-[#181c20]">{cfg.last_daily_sent_id || 'Ninguno'}</strong>
                            {cfg.last_daily_sent_date && <span className="text-[#727784]">· registrado {cfg.last_daily_sent_date}</span>}
                        </p>
                    </ConfigBlock>

                    <ConfigBlock title="Resumen Telegram" icon="send">
                        <p className="text-xs text-[#727784] mb-3">Horas (0-23, separadas por coma) y niveles de alerta que se envían al canal.</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Horas (ej: 9, 17)">
                                <input type="text" defaultValue={parseHours(cfg.telegram_summary_hours, [9, 17]).join(', ')} id="tg-hours" placeholder="9, 17" className={inputCls} />
                            </Field>
                            <Field label="Niveles de alerta">
                                <div className="flex gap-4 h-11 items-center">
                                    {(['red', 'orange', 'yellow'] as const).map(lvl => (
                                        <label key={lvl} className="flex items-center gap-1.5 text-sm font-semibold capitalize cursor-pointer">
                                            <input type="checkbox" value={lvl} defaultChecked={parseLevels(cfg.telegram_summary_levels).includes(lvl)} data-tg-level
                                                className="rounded border-[#727784] text-[#003f87] focus:ring-[#003f87] h-4 w-4" />
                                            {lvl === 'red' ? 'Rojo' : lvl === 'orange' ? 'Naranja' : 'Amarillo'}
                                        </label>
                                    ))}
                                </div>
                            </Field>
                        </div>
                        <button onClick={() => {
                            const hours = (document.getElementById('tg-hours') as HTMLInputElement)?.value || '';
                            const hoursArr = hours.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                            const levels = Array.from(document.querySelectorAll<HTMLInputElement>('[data-tg-level]')).filter(c => c.checked).map(c => c.value);
                            saveConfigValues([['telegram_summary_hours', JSON.stringify(hoursArr)], ['telegram_summary_levels', JSON.stringify(levels)]], 'Configuración de Telegram guardada');
                        }} className={`${BTN} mt-4 h-11 px-5 bg-[#0088cc] text-white shadow hover:brightness-110`}>Guardar Config. Telegram</button>
                    </ConfigBlock>

                    <ConfigBlock title="Autoposting Twitter/X" icon="alternate_email">
                        <p className="text-xs text-[#727784] mb-3">Horas (0-23, separadas por coma) en las que se publica la previsión nacional automáticamente.</p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                            <div className="flex-1">
                                <Field label="Horas de envío (ej: 8, 20)">
                                    <input type="text" defaultValue={parseHours(cfg.twitter_forecast_hours, [8, 20]).join(', ')} id="tw-hours" placeholder="8, 20" className={inputCls} />
                                </Field>
                            </div>
                            <button onClick={() => {
                                const v = (document.getElementById('tw-hours') as HTMLInputElement)?.value || '';
                                const arr = v.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 23);
                                saveConfigValues([['twitter_forecast_hours', JSON.stringify(arr)]], 'Configuración de Twitter guardada');
                            }} className={`${BTN} h-11 px-5 bg-[#475569] text-white shadow hover:brightness-110`}>Guardar Twitter</button>
                        </div>
                    </ConfigBlock>

                    <ConfigBlock title="Frecuencia y Rendimiento AEMET" icon="network_check">
                        <p className="text-xs text-[#727784] mb-3">Ajusta la frecuencia de descarga de alertas para evitar bloqueos por límite de peticiones (429).</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Intervalo de comprobación (minutos)">
                                <input type="number" min={1} max={60} defaultValue={cfg.aemet_check_interval_minutes || '15'} id="aemet-interval" className={inputCls} />
                            </Field>
                            <Field label="Retraso tras error/429 (segundos)">
                                <input type="number" min={1} max={10} defaultValue={cfg.aemet_retry_delay_seconds || '2'} id="aemet-retry" className={inputCls} />
                            </Field>
                        </div>
                        <button onClick={() => {
                            const i = (document.getElementById('aemet-interval') as HTMLInputElement)?.value || '15';
                            const r = (document.getElementById('aemet-retry') as HTMLInputElement)?.value || '2';
                            saveConfigValues([['aemet_check_interval_minutes', i], ['aemet_retry_delay_seconds', r]], 'Ajustes de AEMET guardados');
                        }} className={`${BTN} mt-4 h-11 px-5 bg-[#f97316] text-white shadow hover:brightness-110`}>Guardar Ajustes AEMET</button>
                    </ConfigBlock>
                </div>
            )}
        </Card>
    );

    const renderTests = () => (
        <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 18 }}>info</span>
                <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Atención:</strong> algunos tests envían correos, mensajes de Telegram o notificaciones push reales a los usuarios. Úsalos solo cuando necesites verificar el sistema.
                </p>
            </div>

            <TestSection icon="cloud_sync" title="Procesamiento de Alertas AEMET" sub="Descarga y procesamiento manual desde la API de AEMET">
                <TestCard badge="AEMET" badgeClass="bg-orange-100 text-orange-700" title="Ejecutar Cron"
                    desc="Descarga y procesa manualmente las alertas activas. Equivale al cron automático."
                    btnClass="bg-[#f97316]" label="Ejecutar Proceso"
                    onClick={() => runTest('cron', '/test-cron')} result={testResult.cron} />
                <TestCard badge="AEMET" badgeClass="bg-orange-100 text-orange-700" title="Generar Mapa"
                    desc="Genera el mapa estático de la Península con las alertas activas en tiempo real."
                    btnClass="bg-[#f97316]" label="Ver Mapa"
                    onClick={() => runTest('image', '/test-image', {}, true)} result={testResult.image} isImage />
                <TestCard badge="AEMET" badgeClass="bg-orange-100 text-orange-700" title="Consultar Alerta"
                    desc="Inspecciona los datos completos de una alerta concreta almacenada en base de datos."
                    btnClass="bg-[#f97316]" label="Consultar Datos"
                    selectLabel="Seleccionar Alerta" selectId="test-info-id"
                    options={workerAlerts.map(a => ({ value: a.aemet_id || a.id, label: `[${(a.severity || 'INFO').toUpperCase()}] ${a.event} (${a.area_desc || 'España'})` }))}
                    onClick={() => runTest('info', '/test-info', { id: (document.getElementById('test-info-id') as HTMLSelectElement)?.value || '' })}
                    result={testResult.info} />
            </TestSection>

            <TestSection icon="mail" title="Notificaciones por Email" sub="Pruebas de envío de alertas e informes por correo">
                <TestCard badge="EMAIL" badgeClass="bg-sky-100 text-sky-700" title="Enviar Alerta"
                    desc="Simula el envío de una alerta específica por email a un usuario registrado."
                    btnClass="bg-[#0ea5e9]" label="Enviar Email"
                    selectLabel="Seleccionar Alerta" selectId="test-email-id"
                    options={workerAlerts.map(a => ({ value: a.aemet_id || a.id, label: `[${(a.severity || 'INFO').toUpperCase()}] ${a.event}` }))}
                    select2Label="Destinatario" select2Id="test-email-to"
                    options2={workerUsers.filter(u => u.email).map(u => ({ value: u.email, label: u.email }))}
                    onClick={() => runTest('email', '/test-email', {
                        id: (document.getElementById('test-email-id') as HTMLSelectElement)?.value || '',
                        email: (document.getElementById('test-email-to') as HTMLSelectElement)?.value || '',
                    })} result={testResult.email} />
                <TestCard badge="EMAIL" badgeClass="bg-sky-100 text-sky-700" title="Mapa por Email"
                    desc="Genera el mapa de alertas y lo envía por correo al destinatario seleccionado."
                    btnClass="bg-[#0ea5e9]" label="Enviar Mapa x Email"
                    selectLabel="Destinatario" selectId="test-map-to"
                    options={workerUsers.filter(u => u.email).map(u => ({ value: u.email, label: u.email }))}
                    onClick={() => runTest('map', '/test-map', { email: (document.getElementById('test-map-to') as HTMLSelectElement)?.value || '' })}
                    result={testResult.map} />
                <TestCard badge="EMAIL" badgeClass="bg-sky-100 text-sky-700" title="Informe Diario"
                    desc="Envía el resumen de actividad diaria del sistema al administrador."
                    btnClass="bg-[#0ea5e9]" label="Enviar Informe"
                    onClick={() => runTest('summary', '/test-summary')} result={testResult.summary} />
            </TestSection>

            <TestSection icon="send" title="Telegram y Twitter / X" sub="Pruebas de envío de previsiones y resúmenes">
                <TestCard badge="TELEGRAM" badgeClass="bg-cyan-100 text-cyan-700" title="Previsión Diaria"
                    desc="Fuerza el envío de la previsión meteorológica a todos los suscritos por Telegram."
                    btnClass="bg-[#06b6d4]" label="Forzar Envío"
                    onClick={() => runTest('tgdaily', '/test-daily-forecast-telegram')} result={testResult.tgdaily} />
                <TestCard badge="TELEGRAM" badgeClass="bg-cyan-100 text-cyan-700" title="Resumen de Alertas"
                    desc="Fuerza el envío del resumen de alertas activas usando la configuración de horas actual."
                    btnClass="bg-[#06b6d4]" label="Forzar Resumen"
                    onClick={() => runTest('tgsum', '/test-telegram-summary')} result={testResult.tgsum} />
                <TestCard badge="X / TWITTER" badgeClass="bg-slate-200 text-slate-700" title="Publicar en X"
                    desc="Prepara y abre X (Twitter) con la predicción nacional lista para publicar."
                    btnClass="bg-[#475569]" label="Preparar Post en X"
                    onClick={runTwitterIntent} result={testResult.twitter} />
            </TestSection>

            <TestSection icon="notifications_active" title="Notificaciones Push" sub="Envío manual de push a dispositivos registrados">
                <TestCard badge="PUSH" badgeClass="bg-violet-100 text-violet-700" title="Push de Alerta"
                    desc="Envía una alerta existente por Push al navegador o móvil de un usuario."
                    btnClass="bg-[#5e35b1]" label="Enviar Push"
                    selectLabel="Usuario Destino" selectId="test-push-user"
                    options={workerUsers.map(u => ({ value: u.id, label: u.email || u.id }))}
                    select2Label="Seleccionar Alerta" select2Id="test-push-id"
                    options2={workerAlerts.map(a => ({ value: a.aemet_id || a.id, label: `[${(a.severity || 'INFO').toUpperCase()}] ${a.event}` }))}
                    onClick={() => runTest('push', '/test-push-notification', {
                        userId: (document.getElementById('test-push-user') as HTMLSelectElement)?.value || '',
                        alertId: (document.getElementById('test-push-id') as HTMLSelectElement)?.value || '',
                    })} result={testResult.push} />
            </TestSection>

            <TestSection icon="wb_sunny" title="Predicción Nacional AEMET — Hoy" sub="Texto de predicción nacional obtenido de la API en tiempo real">
                <div className="p-5 text-sm leading-relaxed text-[#424752] whitespace-pre-wrap max-h-[350px] overflow-y-auto font-mono bg-[#f7f9ff] rounded-xl border border-[#c2c6d4]/30">
                    {nationalPrediction}
                </div>
                <button onClick={() => { setNationalPrediction('Cargando...'); loaded.current.delete('tests'); loadWorkerData(true); }}
                    className={`${BTN} mt-3 h-10 px-4 bg-white border border-[#c2c6d4] text-[#424752] hover:bg-[#f1f4f9]`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>Actualizar predicción
                </button>
            </TestSection>
        </div>
    );

    /* ══════════ NAVEGACIÓN ══════════ */
    const TABS: [Tab, string, string][] = [
        ['panel', 'space_dashboard', 'Panel'],
        ['alertas', 'warning', 'Alertas'],
        ['notificaciones', 'notifications', 'Notificaciones'],
        ['usuarios', 'group', 'Usuarios'],
        ['codigos', 'pin_drop', 'Códigos Postales'],
        ['config', 'tune', 'Configuración'],
        ['tests', 'science', 'Tests'],
    ];

    return (
        <div className="min-h-screen bg-[#f7f9ff] font-['Hanken_Grotesk',sans-serif] text-[#181c20]">
            {/* Header */}
            <header className="bg-gradient-to-r from-[#003f87] to-[#0056b3] text-white px-4 sm:px-7 py-3.5 flex justify-between items-center shadow-md sticky top-0 z-30">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur">
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>admin_panel_settings</span>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-extrabold leading-tight truncate">Panel de Administración</h1>
                        <p className="text-[11px] text-white/70 leading-tight">MeteoAlerta España · <span className="font-mono">{clock}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={refreshCurrent} title="Actualizar datos de la pestaña actual"
                        className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span><span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button onClick={logout}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/25 text-white/90 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span><span className="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="sticky top-[68px] z-20 bg-[#f7f9ff]/95 backdrop-blur border-b border-[#c2c6d4]/30">
                <div className="max-w-7xl mx-auto px-3 sm:px-7">
                    <div className="flex gap-1.5 py-2.5 overflow-x-auto">
                        {TABS.map(([id, icon, label]) => (
                            <button key={id} onClick={() => goto(id)}
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${tab === id
                                    ? 'bg-[#003f87] text-white shadow-md shadow-[#003f87]/25'
                                    : 'text-[#727784] hover:bg-white hover:text-[#003f87] border border-transparent hover:border-[#c2c6d4]/40'}`}>
                                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{icon}</span>
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -14, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -14, scale: .96 }}
                        className="fixed top-20 right-4 z-50 max-w-[320px]">
                        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${toast.type === 'ok'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-700'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{toast.type === 'ok' ? 'check_circle' : 'error'}</span>
                            <span>{toast.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contenido */}
            <main className="max-w-7xl mx-auto p-4 sm:p-7">
                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: .2 }}>
                        {tab === 'panel' && renderPanel()}
                        {tab === 'alertas' && renderAlertas()}
                        {tab === 'notificaciones' && renderLogs()}
                        {tab === 'usuarios' && renderUsuarios()}
                        {tab === 'codigos' && renderCodigos()}
                        {tab === 'config' && renderConfig()}
                        {tab === 'tests' && renderTests()}
                    </motion.div>
                </AnimatePresence>

                <div className="text-center mt-8">
                    <a href="/" className="text-sm text-[#003f87] font-bold hover:underline">← Volver a la app</a>
                </div>
            </main>

            {/* Modal código postal */}
            <AnimatePresence>
                {postalModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={e => { if (e.target === e.currentTarget) setPostalModal(null); }}>
                        <motion.div initial={{ scale: .94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .94, y: 14 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                            <div className="px-6 py-5 bg-gradient-to-r from-[#003f87] to-[#0056b3] text-white flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{postalModal.isNew ? 'add_circle' : 'edit'}</span>
                                    <h3 className="font-extrabold">{postalModal.isNew ? 'Nuevo código postal' : `Editar ${postalModal.cp}`}</h3>
                                </div>
                                <button onClick={() => setPostalModal(null)} className="hover:bg-white/20 rounded-lg p-1 transition-colors">
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                                </button>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <Field label="Código postal">
                                    <input type="text" maxLength={5} value={postalModal.cp} onChange={e => setPostalModal(m => m && { ...m, cp: e.target.value })}
                                        placeholder="Ej: 28001" className={`${inputCls} font-mono`} />
                                </Field>
                                <Field label="Zona AEMET">
                                    <input type="text" list="aemet-zones" value={postalModal.zone}
                                        onChange={e => setPostalModal(m => m && { ...m, zone: e.target.value })}
                                        placeholder="Ej: Madrid" className={inputCls} />
                                    <datalist id="aemet-zones">{uniqueZones.map(z => <option key={z} value={z} />)}</datalist>
                                </Field>
                                <Field label="Provincia">
                                    <input type="text" list="aemet-prov" value={postalModal.prov}
                                        onChange={e => setPostalModal(m => m && { ...m, prov: e.target.value })}
                                        placeholder="Ej: Madrid" className={inputCls} />
                                    <datalist id="aemet-prov">{uniqueProvinces.map(z => <option key={z} value={z} />)}</datalist>
                                </Field>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setPostalModal(null)}
                                        className={`${BTN} flex-1 h-11 bg-[#f1f4f9] text-[#424752] hover:bg-[#e5e8ee]`}>Cancelar</button>
                                    <button onClick={savePostal} disabled={postalSaving}
                                        className={`${BTN} flex-1 h-11 bg-gradient-to-r from-[#003f87] to-[#0056b3] text-white shadow hover:brightness-110`}>
                                        {postalSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ══════════════ SUBCOMPONENTES ══════════════ */

const ConfigBlock = ({ title, icon, children }: { title: string; icon: string; children: ReactNode }) => (
    <div className="border-t border-[#c2c6d4]/30 pt-6 first:border-0 first:pt-0">
        <h3 className="font-extrabold text-[#181c20] mb-3.5 flex items-center gap-2 text-[15px]">
            <span className="material-symbols-outlined text-[#003f87]" style={{ fontSize: 20 }}>{icon}</span>
            {title}
        </h3>
        {children}
    </div>
);

const TestSection = ({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: ReactNode }) => (
    <div className="bg-white rounded-2xl border border-[#c2c6d4]/30 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-[#f1f4f9] to-white border-b border-[#c2c6d4]/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#d7e2ff] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#003f87]" style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div>
                <p className="font-extrabold text-sm text-[#181c20] leading-tight">{title}</p>
                <p className="text-[11px] text-[#727784] leading-tight mt-0.5">{sub}</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#c2c6d4]/20">
            {children}
        </div>
    </div>
);

interface TestResult { loading: boolean; ok?: boolean; msg: string }

interface TestCardProps {
    badge: string;
    badgeClass: string;
    title: string;
    desc: string;
    btnClass: string;
    label: string;
    onClick: () => void;
    result?: TestResult;
    selectLabel?: string;
    selectId?: string;
    options?: { value: string; label: string }[];
    select2Label?: string;
    select2Id?: string;
    options2?: { value: string; label: string }[];
    isImage?: boolean;
}

const TestCard = ({ badge, badgeClass, title, desc, btnClass, label, onClick, result, selectLabel, selectId, options, select2Label, select2Id, options2, isImage }: TestCardProps) => (
    <div className="p-5 hover:bg-[#f7f9ff]/50 transition-colors">
        <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${badgeClass}`}>{badge}</span>
            <span className="font-extrabold text-sm text-[#181c20]">{title}</span>
        </div>
        <p className="text-xs text-[#727784] leading-relaxed mb-3">{desc}</p>

        {selectLabel && selectId && (
            <div className="mb-2">
                <label className="text-[11px] font-bold text-[#424752] block mb-1">{selectLabel}</label>
                <select id={selectId} className="w-full h-10 px-2 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-xs outline-none focus:border-[#003f87] transition-all">
                    {(options?.length ? options : [{ value: '', label: 'No hay datos disponibles' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
        )}
        {select2Label && select2Id && (
            <div className="mb-3">
                <label className="text-[11px] font-bold text-[#424752] block mb-1">{select2Label}</label>
                <select id={select2Id} className="w-full h-10 px-2 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-xs outline-none focus:border-[#003f87] transition-all">
                    {(options2?.length ? options2 : [{ value: '', label: 'No hay datos disponibles' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
        )}

        <button onClick={onClick} disabled={result?.loading}
            className={`w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50 active:scale-[.98] ${btnClass}`}>
            {result?.loading ? <span className="inline-flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Ejecutando...</span> : label}
        </button>

        {result && !result.loading && (
            <div className={`mt-3 p-2.5 rounded-xl text-[11px] border break-all ${result.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {isImage && result.ok ? (
                    <img src={result.msg} alt="Mapa de alertas" className="w-full rounded-lg" />
                ) : (
                    <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-[10px]">{result.msg}</pre>
                )}
            </div>
        )}
    </div>
);
