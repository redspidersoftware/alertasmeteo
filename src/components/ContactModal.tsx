import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Send, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { validateEmail } from '../services/userService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const ContactModal = ({ isOpen, onClose }: Props) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!formData.name) newErrors.name = 'Required';
        if (!validateEmail(formData.email)) newErrors.email = t('form.error.email');
        if (!formData.subject) newErrors.subject = 'Required';
        if (!formData.message) newErrors.message = 'Required';

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setLoading(true);
            try {
                // Simulate API Call
                console.log('Sending contact form data:', formData);
                await new Promise(resolve => setTimeout(resolve, 1500));
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                    setFormData({ name: '', email: '', subject: '', message: '' });
                }, 3000);
            } catch (error) {
                console.error('Error sending message:', error);
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
                            <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-400">
                                <MessageSquare size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{t('contact.title')}</h2>
                                <p className="text-sm text-slate-400">{t('contact.subtitle')}</p>
                            </div>
                        </div>

                        {success ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                                <CheckCircle size={48} className="text-green-500 mb-4" />
                                <p className="text-lg font-medium text-white mb-2">{t('contact.success')}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('contact.name')}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={`w-full bg-black/20 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors ${errors.name ? 'border-red-500' : 'border-white/10 focus:border-indigo-500'}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('contact.email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full bg-black/20 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors ${errors.email ? 'border-red-500' : 'border-white/10 focus:border-indigo-500'}`}
                                    />
                                    {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.email}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('contact.subject')}</label>
                                    <input
                                        type="text"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className={`w-full bg-black/20 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors ${errors.subject ? 'border-red-500' : 'border-white/10 focus:border-indigo-500'}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('contact.message')}</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        rows={4}
                                        className={`w-full bg-black/20 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors resize-none ${errors.message ? 'border-red-500' : 'border-white/10 focus:border-indigo-500'}`}
                                    />
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
                                        className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                {t('contact.submit')}
                                            </>
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
