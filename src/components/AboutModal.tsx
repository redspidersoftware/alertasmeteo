import { X, Shield, Zap, Map as MapIcon, Info, Mail, MessageSquare, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'features' | 'notifications';

export const AboutModal = ({ isOpen, onClose }: Props) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<Tab>('features');

    if (!isOpen) return null;

    const features = [
        {
            icon: <Zap className="text-yellow-400" size={24} />,
            title: t('about.feature1.title'),
            desc: t('about.feature1.desc')
        },
        {
            icon: <Shield className="text-blue-400" size={24} />,
            title: t('about.feature2.title'),
            desc: t('about.feature2.desc')
        },
        {
            icon: <MapIcon className="text-green-400" size={24} />,
            title: t('about.feature3.title'),
            desc: t('about.feature3.desc')
        }
    ];

    const notifications = [
        {
            icon: <Mail className="text-blue-400" size={24} />,
            title: t('about.notif.mail.title'),
            desc: t('about.notif.mail.desc')
        },
        {
            icon: <MessageSquare className="text-emerald-400" size={24} />,
            title: t('about.notif.whatsapp.title'),
            desc: t('about.notif.whatsapp.desc')
        },
        {
            icon: <Send className="text-sky-400" size={24} />,
            title: t('about.notif.telegram.title'),
            desc: t('about.notif.telegram.desc')
        }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative"
                >
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-10 bg-white/5 p-2 rounded-full hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 sm:p-12 relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                <Info size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">{t('about.title')}</h2>
                                <p className="text-blue-400 font-bold uppercase tracking-widest text-xs mt-1">
                                    {t('about.subtitle')}
                                </p>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-8 w-fit">
                            {(['features', 'notifications'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {t(`about.tab.${tab}`)}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-8 min-h-[300px]">
                            {activeTab === 'features' ? (
                                <motion.div
                                    key="features"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    <p className="text-slate-300 text-lg leading-relaxed font-medium">
                                        {t('about.mission')}
                                    </p>

                                    <div className="grid sm:grid-cols-3 gap-6">
                                        {features.map((feature, index) => (
                                            <div
                                                key={index}
                                                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group"
                                            >
                                                <div className="mb-4 bg-slate-800/50 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform">
                                                    {feature.icon}
                                                </div>
                                                <h3 className="text-white font-bold mb-2">{feature.title}</h3>
                                                <p className="text-slate-400 text-sm leading-snug">{feature.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="notifications"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {notifications.map((notif, index) => (
                                        <div
                                            key={index}
                                            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-6 hover:bg-white/10 transition-colors group"
                                        >
                                            <div className="bg-slate-800/50 w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform shadow-inner">
                                                {notif.icon}
                                            </div>
                                            <div>
                                                <h3 className="text-white text-xl font-bold mb-2">{notif.title}</h3>
                                                <p className="text-slate-400 leading-relaxed font-medium">{notif.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        <div className="mt-12 flex justify-center">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-colors shadow-xl active:scale-95"
                            >
                                {t('form.cancel')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
