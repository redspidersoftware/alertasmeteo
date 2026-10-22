import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export const UnsubscribePage = () => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({ email: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // One-click unsubscribe via email link (email + token params)
    const [linkEmail, setLinkEmail] = useState<string | null>(null);
    const [linkToken, setLinkToken] = useState<string | null>(null);
    const [linkError, setLinkError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const e = params.get('email');
        const tok = params.get('token');
        if (e && tok) {
            setLinkEmail(e);
            setLinkToken(tok);
        }
    }, []);

    const handleDirectUnsubscribe = async () => {
        if (!linkEmail || !linkToken) return;
        setLoading(true);
        setLinkError(null);
        try {
            const { data, error: funcError } = await supabase.functions.invoke('direct-unsubscribe', {
                body: { email: linkEmail, token: linkToken }
            });
            if (funcError || !data?.success) {
                setLinkError(data?.error || 'El enlace no es válido o ha caducado.');
            } else {
                setSuccess(true);
            }
        } catch {
            setLinkError('Error al eliminar la cuenta. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Inject fonts and icons dynamically
    useEffect(() => {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        const iconLink = document.createElement('link');
        iconLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
        iconLink.rel = 'stylesheet';
        document.head.appendChild(iconLink);

        return () => {
            document.head.removeChild(fontLink);
            document.head.removeChild(iconLink);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data, error: funcError } = await supabase.functions.invoke('delete-user', {
                body: {
                    email: formData.email,
                    password: formData.phone
                }
            });

            if (funcError || !data?.success) {
                setError(t('unsub.error') || 'Error al eliminar la cuenta');
                console.error(funcError || data?.error);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError(t('unsub.error'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f9ff] flex items-center justify-center p-5 font-['Hanken_Grotesk',sans-serif]">
            <AnimatePresence mode="wait">
                {linkEmail && linkToken && !success ? (
                    /* ── ONE-CLICK UNSUBSCRIBE FROM EMAIL LINK ── */
                    <motion.div
                        key="direct"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-[460px] flex flex-col gap-6"
                    >
                        <header className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center shadow-md border border-red-100">
                                <span className="material-symbols-outlined text-red-600" style={{ fontSize: 32 }}>person_off</span>
                            </div>
                            <h1 className="text-2xl font-extrabold text-[#181c20] tracking-tight">
                                Darse de baja
                            </h1>
                            <p className="text-sm text-[#424752] max-w-[340px]">
                                Vas a eliminar tu cuenta y todos tus datos de forma permanente.
                            </p>
                        </header>

                        <section className="bg-white rounded-2xl shadow-lg border border-[#ebeef3] p-6 sm:p-8 flex flex-col gap-5">
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                                <span className="material-symbols-outlined text-red-500 mt-0.5" style={{ fontSize: 20 }}>warning</span>
                                <p className="text-xs text-red-800 leading-relaxed font-semibold">
                                    Esta acción es <strong>irreversible</strong>. Se eliminarán tu perfil, preferencias, código postal, correo y suscripciones de notificaciones.
                                </p>
                            </div>

                            <div className="bg-[#f7f9ff] border border-[#c2c6d4] rounded-xl p-4 text-center">
                                <p className="text-[10px] font-bold uppercase text-[#727784] tracking-wider mb-1">Cuenta asociada</p>
                                <p className="text-sm font-bold text-[#181c20] break-all">{linkEmail}</p>
                            </div>

                            {linkError && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
                                    <p className="text-xs text-red-700">{linkError}</p>
                                </div>
                            )}

                            <button
                                onClick={handleDirectUnsubscribe}
                                disabled={loading}
                                className="h-12 w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_forever</span>
                                        Eliminar mi cuenta definitivamente
                                    </>
                                )}
                            </button>

                            <a href="/" className="text-center text-sm text-[#003f87] font-bold hover:underline">
                                Cancelar, volver a la app
                            </a>
                        </section>
                    </motion.div>
                ) : !success ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-[460px] flex flex-col gap-6"
                    >
                        <header className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center shadow-md border border-red-100">
                                <span className="material-symbols-outlined text-red-600" style={{ fontSize: 32 }}>person_off</span>
                            </div>
                            <h1 className="text-2xl font-extrabold text-[#181c20] tracking-tight">
                                {t('unsub.title')}
                            </h1>
                            <p className="text-sm text-[#424752] max-w-[320px]">
                                {t('unsub.subtitle')}
                            </p>
                        </header>

                        <section className="bg-white rounded-2xl shadow-lg border border-[#ebeef3] p-6 sm:p-8 flex flex-col gap-5">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                
                                {/* Warning Box */}
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-red-500 mt-0.5" style={{ fontSize: 20 }}>warning</span>
                                    <p className="text-xs text-red-800 leading-relaxed font-semibold">
                                        {t('unsub.warning')}
                                    </p>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
                                        <p className="text-xs text-red-700">{error}</p>
                                    </div>
                                )}

                                {/* Correo electrónico */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#181c20] ml-1">
                                        {t('form.email')}
                                    </label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-red-500 transition-colors">
                                            mail
                                        </span>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            placeholder="tu@email.com"
                                            className="w-full h-12 pl-12 pr-4 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm text-[#181c20] placeholder:text-[#727784] outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                        />
                                    </div>
                                </div>

                                {/* Contraseña */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#181c20] ml-1">
                                        {t('unsub.password')}
                                    </label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-red-500 transition-colors">
                                            lock
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                            placeholder="••••••••"
                                            className="w-full h-12 pl-12 pr-12 rounded-xl border border-[#c2c6d4] bg-[#f7f9ff] text-sm text-[#181c20] placeholder:text-[#727784] outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#727784] hover:text-[#181c20] transition-colors flex items-center"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="h-12 w-full mt-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                                            Eliminando...
                                        </>
                                    ) : (
                                        t('unsub.submit')
                                    )}
                                </button>
                            </form>
                        </section>

                        <div className="text-center">
                            <a
                                href="/"
                                className="text-sm text-[#003f87] font-bold hover:underline flex items-center gap-1 mx-auto w-fit"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                                {t('unsub.back')}
                            </a>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-[460px] flex flex-col gap-6"
                    >
                        <header className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 bg-[#e8f5e9] rounded-3xl flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-[#2e7d32]" style={{ fontSize: 32 }}>check_circle</span>
                            </div>
                            <h1 className="text-2xl font-extrabold text-[#181c20] tracking-tight">
                                {t('unsub.success.title')}
                            </h1>
                            <p className="text-sm text-[#424752] max-w-[320px]">
                                {t('unsub.success.desc')}
                            </p>
                        </header>

                        <section className="bg-white rounded-2xl shadow-lg border border-[#ebeef3] p-6 text-center">
                            <a
                                href="/"
                                className="h-12 w-full rounded-xl bg-gradient-to-r from-[#003f87] to-[#0056b3] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {t('unsub.back')}
                            </a>
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
