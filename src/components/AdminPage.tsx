import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

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

interface AdminStats {
    total: number;
    verified: number;
    withPostalCode: number;
}

interface WorkerAlert {
    id: string;
    aemet_id?: string;
    event: string;
    severity: string;
    area_desc: string;
    created_at: string;
}

interface WorkerUser {
    id: string;
    email: string;
    phone?: string;
    daily_forecast?: boolean;
}

type Tab = 'usuarios' | 'config' | 'tests';

const TOKEN_KEY = 'meteoalerta-admin-token';

export const AdminPage = () => {
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const [tab, setTab] = useState<Tab>('usuarios');

    // Users state
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Config state
    const [cfg, setCfg] = useState<Record<string, string>>({});
    const [cfgLoading, setCfgLoading] = useState(false);
    const [cfgResult, setCfgResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Tests state
    const [testResult, setTestResult] = useState<Record<string, { loading: boolean; ok?: boolean; msg: string }>>({});
    const [workerAlerts, setWorkerAlerts] = useState<WorkerAlert[]>([]);
    const [workerUsers, setWorkerUsers] = useState<WorkerUser[]>([]);
    const [nationalPrediction, setNationalPrediction] = useState<string>('Cargando...');
    const [clock, setClock] = useState('--:--:--');

    useEffect(() => {
        if (token) {
            loadUsers();
            loadConfig();
            loadWorkerData();
        }
    }, [token]);

    // Server clock (Spain)
    useEffect(() => {
        const tick = () => setClock(new Intl.DateTimeFormat('es-ES', {
            timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(new Date()));
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, []);

    const invoke = async (fn: string, body: Record<string, unknown>) => {
        const { data, error } = await supabase.functions.invoke(fn, { body: { ...body, token } });
        if (error) throw error;
        if (!data?.success) {
            if (data?.error?.includes('Sesión')) logout();
            throw new Error(data?.error || 'Error en la API');
        }
        return data;
    };

    const callApi = (body: Record<string, unknown>) => invoke('admin-api', body);
    const callWorker = (body: Record<string, unknown>) => invoke('admin-worker', body);

    /* ── USERS ── */
    const loadUsers = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const data = await callApi({ action: 'list' });
            setUsers(data.users || []);
            setStats(data.stats || null);
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'Error cargando usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (u: AdminUser) => {
        if (!confirm(`¿Eliminar definitivamente a ${u.email}? Esta acción no se puede deshacer.`)) return;
        try {
            await callApi({ action: 'delete', userId: u.id, targetEmail: u.email });
            setUsers(prev => prev.filter(x => x.id !== u.id));
            if (stats) setStats({ ...stats, total: stats.total - 1 });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error al eliminar');
        }
    };

    /* ── CONFIG ── */
    const loadConfig = async () => {
        setCfgLoading(true);
        try {
            const data = await callWorker({ action: 'get-config' });
            setCfg(data.config || {});
        } catch (err) {
            setCfgResult({ type: 'error', msg: err instanceof Error ? err.message : 'Error cargando configuración' });
        } finally {
            setCfgLoading(false);
        }
    };

    const saveConfigValues = async (entries: [string, string][], okMsg = '¡Guardado!') => {
        setCfgResult({ type: 'success', msg: 'Guardando...' });
        try {
            for (const [k, v] of entries) {
                await callWorker({ action: 'save-config', key: k, value: v });
                setCfg(prev => ({ ...prev, [k]: v }));
            }
            setCfgResult({ type: 'success', msg: okMsg });
        } catch (err) {
            setCfgResult({ type: 'error', msg: err instanceof Error ? err.message : 'Error al guardar' });
        }
        setTimeout(() => setCfgResult(null), 4000);
    };

    const parseHours = (raw: string, fallback: number[]): number[] => {
        if (!raw) return fallback;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(Number);
        } catch { /* ignore */ }
        return fallback;
    };

    const parseLevels = (raw: string): string[] => {
        if (!raw) return ['red', 'orange'];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch { /* ignore */ }
        return ['red', 'orange'];
    };

    const hoursToInput = (raw: string, fallback: number[]) => parseHours(raw, fallback).join(', ');

    /* ── TESTS ── */
    const loadWorkerData = async () => {
        try {
            const [alertsRes, usersRes, predRes] = await Promise.allSettled([
                callWorker({ action: 'get-alerts' }),
                callWorker({ action: 'get-users' }),
                callWorker({ action: 'run-test', path: '/test-national-prediction' }),
            ]);
            if (alertsRes.status === 'fulfilled') setWorkerAlerts(alertsRes.value.alerts || []);
            if (usersRes.status === 'fulfilled') setWorkerUsers(usersRes.value.users || []);
            if (predRes.status === 'fulfilled') {
                const d = predRes.value;
                setNationalPrediction(d.data?.text || d.text || 'Sin datos');
            } else {
                setNationalPrediction('Error cargando la predicción nacional');
            }
        } catch {
            setNationalPrediction('Error de red cargando datos del servicio');
        }
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
        setUsers([]);
        setStats(null);
        setUsername('');
        setPassword('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError(null);
        try {
            const { data, error } = await supabase.functions.invoke('admin-auth', {
                body: { username, password }
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Error de autenticación');
            sessionStorage.setItem(TOKEN_KEY, data.token);
            setToken(data.token);
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Error de autenticación');
        } finally {
            setLoginLoading(false);
        }
    };

    const filtered = users.filter(u =>
        !search ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.postalCode || '').includes(search)
    );

    /* ── LOGIN ── */
    if (!token) {
        return (
            <div className="min-h-screen bg-[#f7f9ff] flex items-center justify-center p-5 font-['Hanken_Grotesk',sans-serif]">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px] flex flex-col gap-6">
                    <header className="flex flex-col items-center text-center gap-3">
                        <div className="w-16 h-16 bg-[#003f87] rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: 34 }}>admin_panel_settings</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-[#003f87] tracking-tight">Panel de Administración</h1>
                        <p className="text-sm text-[#424752]">Acceso restringido al administrador</p>
                    </header>

                    <section className="bg-white rounded-2xl shadow-lg border border-[#ebeef3] p-6">
                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            {loginError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
                                    <p className="text-xs text-red-700">{loginError}</p>
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-[#181c20] ml-1" htmlFor="admin-user">Usuario</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">person</span>
                                    <input id="admin-user" type="text" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none transition-all focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/20" placeholder="Tu usuario" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-[#181c20] ml-1" htmlFor="admin-pass">Contraseña</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">lock</span>
                                    <input id="admin-pass" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none transition-all focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/20" placeholder="••••••••" />
                                </div>
                            </div>
                            <button type="submit" disabled={loginLoading}
                                className="h-12 w-full mt-2 rounded-xl bg-[#003f87] text-white font-bold text-sm shadow-md hover:bg-[#0056b3] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                                {loginLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (<><span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>Entrar</>)}
                            </button>
                        </form>
                    </section>
                    <div className="text-center"><a href="/" className="text-sm text-[#003f87] font-bold hover:underline">← Volver a la app</a></div>
                </motion.div>
            </div>
        );
    }

    /* ── DASHBOARD ── */
    return (
        <div className="min-h-screen bg-[#f7f9ff] font-['Hanken_Grotesk',sans-serif] text-[#181c20]">
            <header className="bg-[#003f87] text-white px-4 sm:px-8 py-4 flex justify-between items-center shadow-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>admin_panel_settings</span>
                    <div>
                        <h1 className="text-lg font-extrabold leading-tight">Panel de Administración</h1>
                        <p className="text-[11px] text-[#acc7ff]">MeteoAlerta España · Hora España <span className="font-mono">{clock}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { loadUsers(); loadConfig(); loadWorkerData(); }} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span><span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button onClick={logout} className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-[#ffdad6] px-3 py-2 rounded-lg text-xs font-bold transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span><span className="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-5">
                <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-[#c2c6d4]/30 shadow-sm">
                    {([['usuarios', 'group', 'Usuarios'], ['config', 'tune', 'Configuración'], ['tests', 'science', 'Tests']] as [Tab, string, string][]).map(([id, icon, label]) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === id ? 'bg-[#003f87] text-white shadow' : 'text-[#727784] hover:bg-[#f1f4f9]'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-4 sm:p-8">
                {apiError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
                        <p className="text-xs text-red-700">{apiError}</p>
                    </div>
                )}

                {/* ════ TAB: USUARIOS ════ */}
                {tab === 'usuarios' && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-xl p-5 border border-[#c2c6d4]/30 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-[#727784] tracking-wider">Usuarios totales</p>
                                <p className="text-3xl font-extrabold text-[#003f87] mt-1">{stats?.total ?? '—'}</p>
                            </div>
                            <div className="bg-white rounded-xl p-5 border border-[#c2c6d4]/30 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-[#727784] tracking-wider">Verificados</p>
                                <p className="text-3xl font-extrabold text-[#22c55e] mt-1">{stats?.verified ?? '—'}</p>
                            </div>
                            <div className="bg-white rounded-xl p-5 border border-[#c2c6d4]/30 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-[#727784] tracking-wider">Con código postal</p>
                                <p className="text-3xl font-extrabold text-[#f97316] mt-1">{stats?.withPostalCode ?? '—'}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-[#c2c6d4]/30 shadow-sm p-4 mb-4">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784]" style={{ fontSize: 20 }}>search</span>
                                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por nombre, email o código postal..."
                                    className="w-full h-11 pl-12 pr-4 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87] transition-all" />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-[#c2c6d4]/30 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#c2c6d4]/30 flex justify-between items-center">
                                <h2 className="font-bold text-[#003f87]">Usuarios registrados</h2>
                                <span className="text-xs font-bold text-[#727784]">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
                            </div>
                            {loading ? (
                                <div className="p-10 text-center">
                                    <div className="w-6 h-6 border-2 border-[#003f87]/30 border-t-[#003f87] rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-[#727784]">Cargando usuarios...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="p-10 text-center text-[#727784]">
                                    <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                                    <p className="text-sm font-semibold">No se encontraron usuarios</p>
                                </div>
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
                                            {filtered.map((u, i) => (
                                                <tr key={u.id} className={`border-t border-[#c2c6d4]/20 ${i % 2 === 1 ? 'bg-[#f7f9ff]/50' : ''}`}>
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
                                                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-[#727784]">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-ES') : '—'}</td>
                                                    <td className="px-5 py-3 text-right">
                                                        <button onClick={() => handleDelete(u)}
                                                            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-[#ba1a1a] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ml-auto">
                                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span><span className="hidden sm:inline">Eliminar</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ════ TAB: CONFIGURACIÓN ════ */}
                {tab === 'config' && (
                    <div className="bg-white rounded-xl border border-[#c2c6d4]/30 shadow-sm p-6">
                        <h2 className="font-bold text-[#003f87] text-lg mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined">tune</span> Parámetros del Sistema
                        </h2>
                        <p className="text-xs text-[#727784] mb-5">Configuración del servicio de notificaciones (Cloudflare Worker).</p>

                        {cfgLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-2 border-[#003f87]/30 border-t-[#003f87] rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-[#727784]">Cargando configuración...</p>
                            </div>
                        ) : (
                            <div className="space-y-7">
                                {cfgResult && (
                                    <div className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 ${cfgResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cfgResult.type === 'success' ? 'check_circle' : 'error'}</span>
                                        {cfgResult.msg}
                                    </div>
                                )}

                                {/* Previsión diaria */}
                                <ConfigBlock title="Previsión Diaria" icon="wb_twilight">
                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold text-[#424752] block mb-1">Hora de envío (HH:mm)</label>
                                            <input type="time" value={cfg.daily_forecast_time || ''} onChange={e => setCfg(p => ({ ...p, daily_forecast_time: e.target.value }))} className="w-full h-11 px-3 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87]" />
                                        </div>
                                        <button onClick={() => saveConfigValues([['daily_forecast_time', cfg.daily_forecast_time || '']])}
                                            className="h-11 px-5 rounded-lg bg-[#003f87] text-white text-sm font-bold hover:bg-[#0056b3] transition-all">Guardar</button>
                                    </div>
                                    <p className="text-[11px] text-[#727784] mt-2 flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.last_daily_sent_id ? '#22c55e' : '#9ca3af' }} />
                                        Último envío: <strong className="text-[#181c20]">{cfg.last_daily_sent_id || 'Ninguno'}</strong>
                                    </p>
                                </ConfigBlock>

                                {/* Telegram */}
                                <ConfigBlock title="Resumen Telegram" icon="send">
                                    <p className="text-xs text-[#727784] mb-3">Horas (0-23, separadas por coma) y niveles de alerta a enviar.</p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-[#424752] block mb-1">Horas (ej: 9, 17)</label>
                                            <input type="text" defaultValue={hoursToInput(cfg.telegram_summary_hours, [9, 17])} id="tg-hours" placeholder="9, 17"
                                                className="w-full h-11 px-3 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87]" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-[#424752] block mb-1">Niveles de alerta</label>
                                            <div className="flex gap-4 h-11 items-center">
                                                {(['red', 'orange', 'yellow'] as const).map(lvl => (
                                                    <label key={lvl} className="flex items-center gap-1.5 text-sm font-semibold capitalize cursor-pointer">
                                                        <input type="checkbox" value={lvl} defaultChecked={parseLevels(cfg.telegram_summary_levels).includes(lvl)} data-tg-level
                                                            className="rounded border-[#727784] text-[#003f87] focus:ring-[#003f87] h-4 w-4" />
                                                        {lvl === 'red' ? 'Rojo' : lvl === 'orange' ? 'Naranja' : 'Amarillo'}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        const hours = (document.getElementById('tg-hours') as HTMLInputElement)?.value || '';
                                        const hoursArr = hours.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                                        const levels = Array.from(document.querySelectorAll<HTMLInputElement>('[data-tg-level]')).filter(c => c.checked).map(c => c.value);
                                        saveConfigValues([['telegram_summary_hours', JSON.stringify(hoursArr)], ['telegram_summary_levels', JSON.stringify(levels)]], 'Configuración de Telegram guardada!');
                                    }} className="mt-4 h-11 px-5 rounded-lg bg-[#0088cc] text-white text-sm font-bold hover:brightness-110 transition-all">Guardar Config. Telegram</button>
                                </ConfigBlock>

                                {/* Twitter */}
                                <ConfigBlock title="Autoposting Twitter/X" icon="alternate_email">
                                    <p className="text-xs text-[#727784] mb-3">Horas (0-23, separadas por coma) en las que publicar la previsión nacional automáticamente.</p>
                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold text-[#424752] block mb-1">Horas de envío (ej: 8, 20)</label>
                                            <input type="text" defaultValue={hoursToInput(cfg.twitter_forecast_hours, [8, 20])} id="tw-hours" placeholder="8, 20"
                                                className="w-full h-11 px-3 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87]" />
                                        </div>
                                        <button onClick={() => {
                                            const v = (document.getElementById('tw-hours') as HTMLInputElement)?.value || '';
                                            const arr = v.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 23);
                                            saveConfigValues([['twitter_forecast_hours', JSON.stringify(arr)]], 'Configuración de Twitter guardada!');
                                        }} className="h-11 px-5 rounded-lg bg-[#1DA1F2] text-white text-sm font-bold hover:brightness-110 transition-all">Guardar Twitter</button>
                                    </div>
                                </ConfigBlock>

                                {/* AEMET */}
                                <ConfigBlock title="Frecuencia y Rendimiento AEMET" icon="network_check">
                                    <p className="text-xs text-[#727784] mb-3">Ajusta la frecuencia de descarga de alertas para evitar bloqueos por límite de peticiones (429).</p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-[#424752] block mb-1">Intervalo de comprobación (minutos)</label>
                                            <input type="number" min={1} max={60} defaultValue={cfg.aemet_check_interval_minutes || '15'} id="aemet-interval"
                                                className="w-full h-11 px-3 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87]" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-[#424752] block mb-1">Retraso tras error/429 (segundos)</label>
                                            <input type="number" min={1} max={10} defaultValue={cfg.aemet_retry_delay_seconds || '2'} id="aemet-retry"
                                                className="w-full h-11 px-3 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87]" />
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        const i = (document.getElementById('aemet-interval') as HTMLInputElement)?.value || '15';
                                        const r = (document.getElementById('aemet-retry') as HTMLInputElement)?.value || '2';
                                        saveConfigValues([['aemet_check_interval_minutes', i], ['aemet_retry_delay_seconds', r]], 'Ajustes de AEMET guardados!');
                                    }} className="mt-4 h-11 px-5 rounded-lg bg-[#f97316] text-white text-sm font-bold hover:brightness-110 transition-all">Guardar Ajustes AEMET</button>
                                </ConfigBlock>
                            </div>
                        )}
                    </div>
                )}

                {/* ════ TAB: TESTS ════ */}
                {tab === 'tests' && (
                    <div className="space-y-5">
                        <TestSection icon="cloud_sync" title="Procesamiento de Alertas AEMET" sub="Descarga y procesamiento manual de alertas desde la API de AEMET">
                            <TestCard badge="AEMET" badgeClass="bg-orange-100 text-orange-700" title="Ejecutar Cron"
                                desc="Descarga y procesa manualmente las alertas activas desde la API de AEMET. Equivale al cron automático."
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

                        <TestSection icon="mail" title="Notificaciones por Email" sub="Pruebas de envío de alertas e informes por correo electrónico">
                            <TestCard badge="EMAIL" badgeClass="bg-sky-100 text-sky-700" title="Enviar Alerta"
                                desc="Simula el envío de una alerta específica por email a un usuario registrado."
                                btnClass="bg-[#0ea5e9]" label="Enviar Email"
                                selectLabel="Seleccionar Alerta" selectId="test-email-id"
                                options={workerAlerts.map(a => ({ value: a.aemet_id || a.id, label: `[${(a.severity || 'INFO').toUpperCase()}] ${a.event}` }))}
                                select2Label="Destinatario" select2Id="test-email-to"
                                options2={workerUsers.filter(u => u.email).map(u => ({ value: u.email, label: u.email }))}
                                onClick={() => runTest('email', '/test-email', {
                                    id: (document.getElementById('test-email-id') as HTMLSelectElement)?.value || '',
                                    email: (document.getElementById('test-email-to') as HTMLSelectElement)?.value || ''
                                })} result={testResult.email} />

                            <TestCard badge="EMAIL" badgeClass="bg-sky-100 text-sky-700" title="Mapa por Email"
                                desc="Genera el mapa de alertas y lo envía por correo electrónico al destinatario seleccionado."
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

                        <TestSection icon="send" title="Notificaciones Telegram y X" sub="Pruebas de envío de previsiones y resúmenes por Telegram y Twitter">
                            <TestCard badge="TELEGRAM" badgeClass="bg-cyan-100 text-cyan-700" title="Previsión Diaria"
                                desc="Fuerza el envío de la previsión meteorológica a todos los usuarios suscritos vía Telegram."
                                btnClass="bg-[#06b6d4]" label="Forzar Envío"
                                onClick={() => runTest('tgdaily', '/test-daily-forecast-telegram')} result={testResult.tgdaily} />

                            <TestCard badge="TELEGRAM" badgeClass="bg-cyan-100 text-cyan-700" title="Resumen de Alertas"
                                desc="Fuerza el envío del resumen de alertas activas a Telegram usando la configuración de horas actual."
                                btnClass="bg-[#06b6d4]" label="Forzar Resumen"
                                onClick={() => runTest('tgsum', '/test-telegram-summary')} result={testResult.tgsum} />

                            <TestCard badge="X / TWITTER" badgeClass="bg-slate-200 text-slate-700" title="Publicar en X"
                                desc="Prepara y abre X (Twitter) con la predicción nacional lista para publicar."
                                btnClass="bg-[#475569]" label="Preparar Post en X"
                                onClick={runTwitterIntent} result={testResult.twitter} />
                        </TestSection>

                        <TestSection icon="notifications_active" title="Notificaciones Push" sub="Envío manual de notificaciones web push a dispositivos registrados">
                            <TestCard badge="PUSH" badgeClass="bg-cyan-100 text-cyan-700" title="Push de Alerta"
                                desc="Envía una alerta existente por Push al navegador o móvil de un usuario registrado."
                                btnClass="bg-[#06b6d4]" label="Enviar Push"
                                selectLabel="Usuario Destino" selectId="test-push-user"
                                options={workerUsers.map(u => ({ value: u.id, label: u.email || u.id }))}
                                select2Label="Seleccionar Alerta" select2Id="test-push-id"
                                options2={workerAlerts.map(a => ({ value: a.aemet_id || a.id, label: `[${(a.severity || 'INFO').toUpperCase()}] ${a.event}` }))}
                                onClick={() => runTest('push', '/test-push-notification', {
                                    userId: (document.getElementById('test-push-user') as HTMLSelectElement)?.value || '',
                                    alertId: (document.getElementById('test-push-id') as HTMLSelectElement)?.value || ''
                                })} result={testResult.push} />
                        </TestSection>

                        <TestSection icon="wb_sunny" title="Predicción Nacional AEMET - Hoy" sub="Texto de predicción nacional obtenido de la API de AEMET en tiempo real">
                            <div className="p-5 text-sm leading-relaxed text-[#424752] whitespace-pre-wrap max-h-[350px] overflow-y-auto font-mono bg-[#f7f9ff] rounded-lg border border-[#c2c6d4]/30">
                                {nationalPrediction}
                            </div>
                            <button onClick={() => { setNationalPrediction('Cargando...'); loadWorkerData(); }}
                                className="mt-3 h-10 px-4 rounded-lg bg-white border border-[#c2c6d4] text-xs font-bold text-[#424752] hover:bg-[#f1f4f9] transition-all">Actualizar predicción</button>
                        </TestSection>
                    </div>
                )}

                <div className="text-center mt-8">
                    <a href="/" className="text-sm text-[#003f87] font-bold hover:underline">← Volver a la app</a>
                </div>
            </main>
        </div>
    );
};

/* ── Helper components ── */

const ConfigBlock = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div className="border-t border-[#c2c6d4]/30 pt-5 first:border-0 first:pt-0">
        <h3 className="font-bold text-[#181c20] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003f87]" style={{ fontSize: 20 }}>{icon}</span>
            {title}
        </h3>
        {children}
    </div>
);

const TestSection = ({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-[#c2c6d4]/30 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-[#f1f4f9] border-b border-[#c2c6d4]/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#003f87]" style={{ fontSize: 24 }}>{icon}</span>
            <div>
                <p className="font-bold text-sm text-[#181c20]">{title}</p>
                <p className="text-[11px] text-[#727784]">{sub}</p>
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
    <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${badgeClass}`}>{badge}</span>
            <span className="font-bold text-sm text-[#181c20]">{title}</span>
        </div>
        <p className="text-xs text-[#727784] leading-relaxed mb-3">{desc}</p>

        {selectLabel && selectId && (
            <div className="mb-2">
                <label className="text-[11px] font-semibold text-[#424752] block mb-1">{selectLabel}</label>
                <select id={selectId} className="w-full h-10 px-2 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-xs outline-none focus:border-[#003f87]">
                    {(options?.length ? options : [{ value: '', label: 'No hay datos disponibles' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
        )}
        {select2Label && select2Id && (
            <div className="mb-3">
                <label className="text-[11px] font-semibold text-[#424752] block mb-1">{select2Label}</label>
                <select id={select2Id} className="w-full h-10 px-2 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-xs outline-none focus:border-[#003f87]">
                    {(options2?.length ? options2 : [{ value: '', label: 'No hay datos disponibles' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
        )}

        <button onClick={onClick} disabled={result?.loading}
            className={`w-full py-2.5 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-50 ${btnClass}`}>
            {result?.loading ? 'Ejecutando...' : label}
        </button>

        {result && !result.loading && (
            <div className={`mt-3 p-2.5 rounded-lg text-[11px] border break-all ${result.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {isImage && result.ok ? (
                    <img src={result.msg} alt="Mapa de alertas" className="w-full rounded-md" />
                ) : (
                    <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-[10px]">{result.msg}</pre>
                )}
            </div>
        )}
    </div>
);
