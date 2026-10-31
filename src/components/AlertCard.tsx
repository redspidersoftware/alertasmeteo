import { motion, AnimatePresence } from 'framer-motion';
import type { WeatherAlert } from '../types';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAlertTiming, useNow } from '../hooks/useAlertDynamics';
import { Countdown, VigenciaBar, NuevaBadge } from './AlertDynamics';

interface AlertCardProps {
    alert: WeatherAlert;
    isTooltip?: boolean;
}

// Chips de severidad "autocontenidos": fondo sólido + texto con contraste,
// legibles sobre cualquier superficie (mapa claro u oscuro, tarjeta clara u oscura).
// Los hex de severidad son intencionales y no deben tokenizarse.
const severityStyles: Record<string, { chip: string; accent: string; icon: string }> = {
    red: { chip: 'text-white bg-[#ba1a1a]', accent: 'bg-[#ba1a1a]', icon: 'text-[#ba1a1a]' },
    orange: { chip: 'text-white bg-[#f97316]', accent: 'bg-[#f97316]', icon: 'text-[#f97316]' },
    yellow: { chip: 'text-[#001a40] bg-[#ffea85]', accent: 'bg-[#eab308]', icon: 'text-[#eab308]' },
    green: { chip: 'text-white bg-[#22c55e]', accent: 'bg-[#22c55e]', icon: 'text-[#22c55e]' },
    unknown: { chip: 'text-ink-700 bg-surface-2', accent: 'bg-ink-300', icon: 'text-ink-500' },
};

const severityLabels: Record<string, string> = {
    red: 'NIVEL ROJO',
    orange: 'NIVEL NARANJA',
    yellow: 'NIVEL AMARILLO',
    green: 'NIVEL VERDE',
    unknown: 'SIN NIVEL',
};

const detectWeatherType = (eventName: string, headline: string = '') => {
    const text = (eventName + ' ' + headline).toLowerCase();
    // Prioritize storm/snow/heat/cold as they are the most dramatic
    if (text.includes('tormenta') || text.includes('rayo')) return 'storm';
    if (text.includes('nieve') || text.includes('nevada') || text.includes('aludes')) return 'snow';
    if (text.includes('máximas') || text.includes('calor') || text.includes('altas temperaturas')) return 'heat';
    if (text.includes('mínimas') || text.includes('frío') || text.includes('bajas temperaturas')) return 'cold';
    if (text.includes('lluvia') || text.includes('precipitaci')) return 'rain';
    if (text.includes('viento') || text.includes('rachas') || text.includes('galerna') || text.includes('costero')) return 'wind';
    if (text.includes('polvo') || text.includes('calima') || text.includes('suspensi')) return 'dust';
    if (text.includes('deshielo')) return 'thaw';
    return null;
};

const WeatherEffects = ({ type, isTooltip }: { type: string | null, isTooltip?: boolean }) => {
    const [renderedParticles] = useState(() => {
        if (!type || type === 'storm') return null;

        // Menos partículas que antes: suficiente atmosfera sin restar legibilidad
        return Array.from({ length: isTooltip ? 6 : 16 }).map((_, i) => {
            const left = Math.random() * 100;
            let top = -20;
            const delay = Math.random() * 5;
            const duration = 0.5 + Math.random() * 1.5;

            let className = "";
            let sizeStr = "";
            // Tonos slate/azules: visibles sobre fondos claros y oscuros
            if (type === 'rain') className = "weather-rain w-[2px] h-8 bg-sky-400/70 shadow-[0_0_8px_rgba(56,189,248,0.35)]";
            if (type === 'snow') className = "weather-snow w-3 h-3 bg-[#93c5fd] rounded-full blur-[2px]";
            if (type === 'wind') {
                className = "weather-wind w-16 h-[2px] bg-slate-400/60 shadow-[0_0_10px_rgba(148,163,184,0.25)]";
                top = Math.random() * 100;
            }
            if (type === 'heat') {
                className = "weather-heat w-12 h-1 bg-orange-300/30 blur-xl";
                top = 100;
            }
            if (type === 'cold') {
                className = "weather-cold w-20 h-12 bg-sky-300/20 blur-3xl rounded-full";
                top = 80;
            }
            if (type === 'dust') {
                const size = 1 + Math.random() * 3;
                sizeStr = `${size}px`;
                className = "weather-dust bg-amber-700/60 rounded-full blur-[1px]";
                top = Math.random() * 100;
            }
            if (type === 'thaw') {
                className = "weather-thaw w-[4px] h-[10px] bg-cyan-200/60 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.3)]";
                top = -20;
            }

            const animationDuration = `${type === 'snow' ? duration + 4 :
                type === 'dust' ? duration + 8 :
                    type === 'heat' ? duration + 3 :
                        type === 'thaw' ? duration + 2 : duration
                }s`;

            return { id: i, left, top, delay, duration: animationDuration, className, sizeStr };
        });
    });

    if (!type) return null;

    if (type === 'storm') {
        return <div className="absolute inset-0 weather-lightning pointer-events-none z-0" />;
    }

    return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${isTooltip ? 'opacity-40' : 'opacity-80'}`}>
            {/* Base Color Overlays for temperature/dust/thaw */}
            {type === 'heat' && <div className="absolute inset-0 bg-orange-500/10 mix-blend-overlay animate-pulse duration-[4s]" />}
            {type === 'cold' && <div className="absolute inset-0 bg-blue-300/10 mix-blend-overlay animate-pulse duration-[4s]" />}
            {type === 'dust' && <div className="absolute inset-0 bg-amber-600/20 mix-blend-multiply transition-opacity duration-1000" />}
            {type === 'thaw' && <div className="absolute inset-0 bg-cyan-400/5 backdrop-blur-[1px]" />}

            {renderedParticles?.map((p) => (
                <div
                    key={p.id}
                    className={`absolute ${p.className}`}
                    style={p.sizeStr
                        ? {
                            width: p.sizeStr,
                            height: p.sizeStr,
                            left: `${p.left}%`,
                            top: `${p.top}%`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: p.duration
                        }
                        : {
                            left: `${p.left}%`,
                            top: `${p.top}%`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: p.duration
                        }}
                />
            ))}
        </div>
    );
};

export const AlertCard = ({ alert, isTooltip = false }: AlertCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const { t } = useLanguage();
    const styles = severityStyles[alert.severity] || severityStyles.unknown;
    const severityLabel = severityLabels[alert.severity] || severityLabels.unknown;
    // Tarjeta "viva": cuenta atrás, urgencia, estado nueva y vigencia
    const now = useNow();
    const timing = getAlertTiming(alert.sent, alert.expires, now);

    const formatTime = (dateString: string) => {
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

    const handleClick = () => {
        if (!isTooltip) {
            setExpanded(!expanded);
        }
    };

    const iconBtn = 'flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand-ink';

    return (
        <motion.div
            layout={!isTooltip}
            initial={isTooltip ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            whileHover={!isTooltip ? { y: -4, transition: { duration: 0.2 } } : undefined}
            className={`group relative overflow-hidden bg-surface border border-line/40 shadow-lg text-ink ${isTooltip ? 'rounded-2xl w-72' : 'rounded-2xl cursor-pointer hover:shadow-xl transition-shadow'}`}
            onClick={handleClick}
        >
            <WeatherEffects type={detectWeatherType(alert.event, alert.headline)} isTooltip={isTooltip} />

            {/* Barra de acento de severidad (pulsa si la alerta es urgente) */}
            <div className={`absolute left-0 top-0 h-full w-1.5 ${styles.accent} ${timing.urgent ? 'urgent-bar-pulse' : ''}`} aria-hidden="true" />

            <div className="relative flex items-start gap-3 p-4">
                <div className={`${styles.chip} ${isTooltip ? 'p-2' : 'p-2.5'} rounded-xl flex-shrink-0`}>
                    <span className="material-symbols-outlined" style={{ fontSize: isTooltip ? 20 : 24 }}>warning</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`${styles.chip} px-2 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider whitespace-nowrap`}>
                                {severityLabel}
                            </span>
                            {timing.isNew && <NuevaBadge />}
                        </div>
                        <span className="text-[11px] font-bold text-ink-500 whitespace-nowrap">
                            {formatTime(alert.sent)}
                        </span>
                    </div>

                    <h3 className={`mt-2 font-bold text-ink leading-snug ${isTooltip ? 'text-sm line-clamp-2' : 'text-base'}`}>
                        {alert.headline}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-1.5 text-ink-700">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span className={`text-[11px] font-semibold ${isTooltip ? 'truncate' : ''}`}>{alert.area}</span>
                    </div>

                    {/* Cuenta atrás + vigencia consumida (B1/B2) */}
                    <div className="mt-2 space-y-1.5">
                        <VigenciaBar progress={timing.progress} />
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-500">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <Countdown timing={timing} />
                        </div>
                    </div>

                    <p className={`mt-2 text-xs leading-relaxed text-ink-700 ${isTooltip ? 'line-clamp-2' : (expanded ? '' : 'line-clamp-2')}`}>
                        {alert.description}
                    </p>

                    {!isTooltip && (
                        <AnimatePresence initial={false}>
                            {expanded ? (
                                <motion.div
                                    key="expanded"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-4 pt-4 border-t border-line/40 space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-brand-ink font-bold text-[11px] uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-[16px]">info</span>
                                                {t('alert.description')}
                                            </div>
                                            <p className="text-xs leading-relaxed text-ink-700 bg-surface-3 p-3 rounded-xl border border-line/30">
                                                {alert.description}
                                            </p>
                                        </div>

                                        {alert.instruction && (
                                            <div className="space-y-2">
                                                <div className="text-brand-ink font-bold text-[11px] uppercase tracking-widest">
                                                    {t('alert.instructions')}
                                                </div>
                                                <p className="text-xs leading-relaxed text-ink-700 bg-brand-100/40 p-3 rounded-xl border border-brand/20">
                                                    {alert.instruction}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-ink-500 bg-surface-2 px-3 py-1.5 rounded-full">
                                                <span className="material-symbols-outlined text-[14px] text-brand-ink">schedule</span>
                                                <span className="uppercase tracking-wider">{t('alert.expires')}</span>
                                                {formatExpires(alert.expires)}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                                                className={iconBtn}
                                            >
                                                <span>Ver menos</span>
                                                <span className="material-symbols-outlined text-[16px] rotate-180">expand_more</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="collapsed"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-3"
                                >
                                    <span className={`${iconBtn} opacity-70 group-hover:opacity-100 transition-opacity`}>
                                        <span>Ver más detalles</span>
                                        <span className="material-symbols-outlined text-[16px] group-hover:translate-y-0.5 transition-transform">expand_more</span>
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
