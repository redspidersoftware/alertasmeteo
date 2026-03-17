import { motion } from 'framer-motion';
import { Satellite } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const SatelliteVideo = () => {
    const { t } = useLanguage();

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                    {t('satellite.title')}
                </h2>
                <div className="hidden sm:block text-xs font-black uppercase tracking-[0.2em] text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    {t('satellite.source')}
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-dark rounded-[2.5rem] overflow-hidden p-1 shadow-2xl ring-1 ring-white/5 bg-slate-900/40"
            >
                <div className="relative rounded-[2.25rem] overflow-hidden bg-slate-950/60">
                    {/* Header overlay */}
                    <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-500/30">
                                <Satellite size={18} className="text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">{t('satellite.label')}</p>
                                <p className="text-slate-400 text-xs">{t('satellite.description')}</p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </span>
                                <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Live</span>
                            </div>
                        </div>
                    </div>

                    {/* Video */}
                    <video
                        src="https://api.met.no/weatherapi/geosatellite/1.4/europe.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full aspect-video object-cover"
                    />
                </div>
            </motion.div>
        </div>
    );
};
