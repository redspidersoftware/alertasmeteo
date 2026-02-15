import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Info, ChevronDown } from 'lucide-react';
import type { WeatherAlert } from '../types';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface AlertCardProps {
    alert: WeatherAlert;
}

const severityGradients = {
    red: 'from-red-600/20 to-rose-600/5 border-red-500/30 text-red-50',
    orange: 'from-orange-600/20 to-amber-600/5 border-orange-500/30 text-orange-50',
    yellow: 'from-yellow-500/15 to-amber-500/5 border-yellow-400/30 text-yellow-50',
    green: 'from-emerald-500/15 to-teal-500/5 border-emerald-500/30 text-emerald-50',
    unknown: 'from-slate-600/15 to-slate-800/5 border-slate-500/30 text-slate-100'
};

const iconColors = {
    red: 'bg-red-500/20 text-red-400 shadow-red-500/20',
    orange: 'bg-orange-500/20 text-orange-400 shadow-orange-500/20',
    yellow: 'bg-yellow-400/20 text-yellow-400 shadow-yellow-400/20',
    green: 'bg-emerald-400/20 text-emerald-400 shadow-emerald-400/20',
    unknown: 'bg-slate-500/20 text-slate-400 shadow-slate-500/20'
};

const detectWeatherType = (eventName: string, headline: string = '') => {
    const text = (eventName + ' ' + headline).toLowerCase();
    // Prioritize storm as it's the most dramatic
    if (text.includes('tormenta') || text.includes('rayo')) return 'storm';
    if (text.includes('nieve') || text.includes('nevada') || text.includes('aludes')) return 'snow';
    if (text.includes('lluvia') || text.includes('precipitaci')) return 'rain';
    if (text.includes('viento') || text.includes('rachas') || text.includes('galerna') || text.includes('costero')) return 'wind';
    return null;
};

const WeatherEffects = ({ type }: { type: string | null }) => {
    if (!type) return null;

    const particles = Array.from({ length: 30 });

    if (type === 'storm') {
        return <div className="absolute inset-0 weather-lightning pointer-events-none z-0" />;
    }

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-80">
            {particles.map((_, i) => {
                const left = Math.random() * 100;
                const top = type === 'wind' ? Math.random() * 100 : -20;
                const delay = Math.random() * 5;
                const duration = 0.5 + Math.random() * 1.5;

                let className = "";
                if (type === 'rain') className = "weather-rain w-[2px] h-8 bg-blue-400/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]";
                if (type === 'snow') className = "weather-snow w-3 h-3 bg-white/90 rounded-full blur-[2px]";
                if (type === 'wind') className = "weather-wind w-16 h-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]";

                return (
                    <div
                        key={i}
                        className={`absolute ${className}`}
                        style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            animationDelay: `${delay}s`,
                            animationDuration: `${type === 'snow' ? duration + 4 : duration}s`
                        }}
                    />
                );
            })}
        </div>
    );
};

export const AlertCard = ({ alert }: AlertCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const { t } = useLanguage();
    const gradientClass = severityGradients[alert.severity] || severityGradients.unknown;
    const iconClass = iconColors[alert.severity] || iconColors.unknown;

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
            return dateString;
        }
    };

    const formatExpires = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        } catch {
            return dateString;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br ${gradientClass} backdrop-blur-xl p-6 transition-all shadow-2xl hover:shadow-cyan-500/10 cursor-pointer`}
            onClick={() => setExpanded(!expanded)}
        >
            {/* Glow Effect on Hover */}
            <div className={`absolute -inset-px bg-gradient-to-r ${gradientClass} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

            <WeatherEffects type={detectWeatherType(alert.event, alert.headline)} />

            <div className="relative flex items-start gap-6">
                <div className={`${iconClass} p-4 rounded-2xl shadow-lg flex-shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <AlertTriangle size={28} />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start gap-3">
                        <h3 className="font-black text-xl leading-tight tracking-tight group-hover:text-white transition-colors">
                            {alert.headline}
                        </h3>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                                {formatDate(alert.sent)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 mt-3 text-sm font-bold opacity-70">
                        <div className="p-1 rounded-md bg-white/5">
                            <MapPin size={14} className="text-blue-400" />
                        </div>
                        <span className="truncate">{alert.area}</span>
                    </div>

                    <p className={`mt-4 text-slate-300 leading-relaxed font-medium transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
                        {alert.description}
                    </p>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: "circOut" }}
                                className="overflow-hidden"
                            >
                                <div className="mt-6 pt-6 border-t border-white/10 space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest">
                                            <Info size={16} />
                                            {t('alert.description')}
                                        </div>
                                        <p className="text-slate-200 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 font-medium shadow-inner">
                                            {alert.description}
                                        </p>
                                    </div>

                                    {alert.instruction && (
                                        <div className="space-y-3">
                                            <div className="text-emerald-400 font-black text-xs uppercase tracking-widest">
                                                {t('alert.instructions')}
                                            </div>
                                            <p className="text-emerald-50/80 italic bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 font-medium">
                                                {alert.instruction}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full border border-white/5">
                                            <Clock size={12} className="text-blue-400" />
                                            {t('alert.expires')} {formatExpires(alert.expires)}
                                        </div>

                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5 px-2">
                                            <span>Ver menos</span>
                                            <ChevronDown className="rotate-180" size={12} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {!expanded && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400/60 group-hover:text-blue-400 transition-colors"
                            >
                                <span>Ver más detalles</span>
                                <ChevronDown size={12} className="group-hover:translate-y-0.5 transition-transform" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
