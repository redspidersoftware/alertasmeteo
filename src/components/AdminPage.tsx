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

const TOKEN_KEY = 'meteoalerta-admin-token';

export const AdminPage = () => {
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (token) loadUsers();
    }, [token]);

    const callApi = async (body: Record<string, unknown>) => {
        const { data, error } = await supabase.functions.invoke('admin-api', {
            body: { ...body, token }
        });
        if (error) throw error;
        if (!data?.success) {
            if (data?.error?.includes('Sesión')) {
                logout();
            }
            throw new Error(data?.error || 'Error en la API');
        }
        return data;
    };

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

    const logout = () => {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUsers([]);
        setStats(null);
        setUsername('');
        setPassword('');
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
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[420px] flex flex-col gap-6"
                >
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
                                    <input
                                        id="admin-user"
                                        type="text"
                                        required
                                        autoComplete="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none transition-all focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/20"
                                        placeholder="Tu usuario"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-[#181c20] ml-1" htmlFor="admin-pass">Contraseña</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">lock</span>
                                    <input
                                        id="admin-pass"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none transition-all focus:border-[#003f87] focus:ring-2 focus:ring-[#003f87]/20"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="h-12 w-full mt-2 rounded-xl bg-[#003f87] text-white font-bold text-sm shadow-md hover:bg-[#0056b3] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                            >
                                {loginLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                                        Entrar
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    <div className="text-center">
                        <a href="/" className="text-sm text-[#003f87] font-bold hover:underline">← Volver a la app</a>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ── DASHBOARD ── */
    return (
        <div className="min-h-screen bg-[#f7f9ff] font-['Hanken_Grotesk',sans-serif] text-[#181c20]">
            {/* Header */}
            <header className="bg-[#003f87] text-white px-4 sm:px-8 py-4 flex justify-between items-center shadow-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>admin_panel_settings</span>
                    <div>
                        <h1 className="text-lg font-extrabold leading-tight">Panel de Administración</h1>
                        <p className="text-[11px] text-[#acc7ff]">MeteoAlerta España</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadUsers}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                        title="Recargar"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-[#ffdad6] px-3 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                        <span className="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 sm:p-8">
                {/* Stats */}
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

                {/* Search */}
                <div className="bg-white rounded-xl border border-[#c2c6d4]/30 shadow-sm p-4 mb-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784]" style={{ fontSize: 20 }}>search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, email o código postal..."
                            className="w-full h-11 pl-12 pr-4 rounded-lg border border-[#c2c6d4] bg-[#f7f9ff] text-sm outline-none focus:border-[#003f87] transition-all"
                        />
                    </div>
                </div>

                {/* Error */}
                {apiError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
                        <p className="text-xs text-red-700">{apiError}</p>
                    </div>
                )}

                {/* Users table */}
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
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <span className="font-mono font-bold text-[#424752]">{u.postalCode || '—'}</span>
                                            </td>
                                            <td className="px-5 py-3 hidden lg:table-cell">
                                                <span className="text-[10px] font-bold bg-[#ebeef3] text-[#424752] px-2 py-1 rounded-full">
                                                    {u.preferredSeverities.length} niveles
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 hidden lg:table-cell text-xs text-[#727784]">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-ES') : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => handleDelete(u)}
                                                    className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-[#ba1a1a] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ml-auto"
                                                    title="Eliminar usuario"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                                                    <span className="hidden sm:inline">Eliminar</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="text-center mt-6">
                    <a href="/" className="text-sm text-[#003f87] font-bold hover:underline">← Volver a la app</a>
                </div>
            </main>
        </div>
    );
};
