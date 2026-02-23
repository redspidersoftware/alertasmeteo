import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { validateEmail, validatePhone, validatePostalCode, saveUser } from '../services/userService';
import { X, UserPlus, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const UserRegistrationModal = ({ isOpen, onClose }: Props) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', postalCode: '', language: 'es' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        setErrorMessage(''); // Clear previous errors

        if (!formData.name) newErrors.name = 'Required';
        if (!validateEmail(formData.email)) newErrors.email = t('form.error.email');
        if (!validatePhone(formData.phone)) newErrors.phone = t('form.error.phone');
        if (!validatePostalCode(formData.postalCode)) newErrors.cp = t('form.error.cp');

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setLoading(true);
            try {
                await saveUser(formData as unknown as never);
                setSuccess(true);
                // Simulate Verification Email
                console.log(`[SIMULATION] Sending verification email to ${formData.email} using language ${formData.language}`);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                    setFormData({ name: '', email: '', phone: '', postalCode: '', language: 'es' });
                }, 3000); // Increased time to read success message
            } catch (error) {
                const e = error as Error;
                console.error('Registration error:', e);
                let msg = e.message || 'Error al registrar usuario.';
                if (msg.toLowerCase().includes('confirmation email')) {
                    msg = 'Error de Supabase: No se pudo enviar el email de confirmación (SMTP no configurado o límite alcanzado). Por favor, sigue las instrucciones en SUPABASE_FIX.md para desactivar la confirmación por email.';
                }
                setErrorMessage(msg);
            } finally {
                setLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-500/20 p-3 rounded-full text-blue-400">
                                <UserPlus size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{t('form.title')}</h2>
                                <p className="text-sm text-slate-400">{t('form.subtitle')}</p>
                            </div>
                        </div>

                        {success ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                                <CheckCircle size={48} className="text-green-500 mb-4" />
                                <p className="text-lg font-medium text-white mb-2">{t('form.success')}</p>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                    In a real app, you would receive an email with a verification link.
                                    For this demo, verify via Admin DB or try logging in.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('form.name')}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('form.email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full bg-black/20 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors ${errors.email ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                                    />
                                    {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.email}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('form.phone')}</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+34..."
                                            className={`w-full bg-black/20 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors ${errors.phone ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                                        />
                                        {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.phone}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('form.cp')}</label>
                                        <input
                                            type="text"
                                            maxLength={5}
                                            value={formData.postalCode}
                                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                            className={`w-full bg-black/20 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors ${errors.cp ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                                        />
                                        {errors.cp && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.cp}</p>}
                                    </div>
                                </div>

                                {errorMessage && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                                        <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-300">{errorMessage}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('form.lang')}</label>
                                    <div className="relative">
                                        <select
                                            value={formData.language}
                                            onChange={(e) => setFormData({ ...formData, language: e.target.value as 'es' | 'en' })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                        >
                                            <option value="es">🇪🇸 Español</option>
                                            <option value="en">🇬🇧 English</option>
                                        </select>
                                        <Globe size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                                    >
                                        {t('form.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            t('form.submit')
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
