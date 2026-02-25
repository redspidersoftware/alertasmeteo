import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserX, AlertTriangle, CheckCircle, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';

export const UnsubscribePage = () => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({ email: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // We call the edge function that handles the deletion from both tables
            const { data, error: funcError } = await supabase.functions.invoke('delete-user', {
                body: {
                    email: formData.email,
                    password: formData.phone // Phone acts as password
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
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 selection:bg-red-500/30">
            <AnimatePresence mode="wait">
                {!success ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md"
                    >
                        <div className="glass-dark rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-2xl overflow-hidden relative">
                            {/* Decorative Background */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl"></div>

                            <div className="relative z-10">
                                <div className="bg-red-500/10 p-4 rounded-3xl w-fit mb-6 border border-red-500/20 shadow-inner">
                                    <UserX size={32} className="text-red-400" />
                                </div>

                                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                                    {t('unsub.title')}
                                </h1>
                                <p className="text-slate-400 mb-8 font-medium">
                                    {t('unsub.subtitle')}
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2 px-1">
                                            {t('form.email')}
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all duration-300 placeholder:text-slate-600"
                                            placeholder="example@mail.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2 px-1">
                                            {t('unsub.password')}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all duration-300"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex items-start gap-3">
                                        <ShieldAlert size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-red-300/80 leading-relaxed font-medium">
                                            {t('unsub.warning')}
                                        </p>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold"
                                        >
                                            <AlertTriangle size={18} />
                                            <p>{error}</p>
                                        </motion.div>
                                    )}

                                    <div className="pt-4 flex flex-col gap-3">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black tracking-widest uppercase text-sm shadow-xl shadow-red-600/20 hover:shadow-red-600/40 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : t('unsub.submit')}
                                        </button>

                                        <a
                                            href="/"
                                            className="w-full py-4 rounded-2xl border border-white/5 bg-white/5 text-slate-300 font-bold text-center hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft size={18} />
                                            {t('unsub.back')}
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md"
                    >
                        <div className="glass-dark rounded-[2.5rem] p-10 border border-white/5 text-center relative overflow-hidden">
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-green-600/10 rounded-full blur-3xl"></div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="bg-green-500/10 p-6 rounded-full w-fit mb-8 border border-green-500/20 shadow-inner">
                                    <CheckCircle size={48} className="text-green-400" />
                                </div>

                                <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                                    {t('unsub.success.title')}
                                </h2>
                                <p className="text-slate-400 mb-10 text-lg font-medium leading-relaxed">
                                    {t('unsub.success.desc')}
                                </p>

                                <a
                                    href="/"
                                    className="px-10 py-4 rounded-2xl bg-white text-black font-black tracking-widest uppercase text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    {t('unsub.back')}
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
