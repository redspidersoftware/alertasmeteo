import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { WeatherAlert } from '../types';
import { AlertCard } from './AlertCard';
import { useLanguage } from '../context/LanguageContext';

interface AlertSidebarProps {
    alerts: WeatherAlert[];
}

const SEVERITY_ORDER: Record<string, number> = {
    red: 0,
    orange: 1,
    yellow: 2,
    green: 3,
    unknown: 4,
};

const severityColors: Record<string, string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-400',
    green: 'bg-emerald-500',
};

export const AlertSidebar = ({ alerts }: AlertSidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();

    const sortedAlerts = useMemo(() => {
        return [...alerts].sort((a, b) => {
            return (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
        });
    }, [alerts]);

    // Count by severity for badge display
    const severityCounts = useMemo(() => {
        const counts: Record<string, number> = { red: 0, orange: 0, yellow: 0, green: 0 };
        alerts.forEach(a => {
            if (counts[a.severity] !== undefined) counts[a.severity]++;
        });
        return counts;
    }, [alerts]);

    return (
        <>
            {/* Toggle Button - Fixed left side */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-0 group"
                aria-label={t('sidebar.toggle')}
            >
                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 border-l-0 rounded-r-2xl py-4 px-2 shadow-2xl shadow-black/50 flex flex-col items-center gap-3 transition-all duration-300 hover:bg-slate-800/95 hover:px-3">
                    {/* Alert icon with count */}
                    <div className="relative">
                        <AlertTriangle size={20} className="text-white" />
                        {alerts.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                {alerts.length > 99 ? '99+' : alerts.length}
                            </span>
                        )}
                    </div>

                    {/* Mini severity dots */}
                    <div className="flex flex-col gap-1">
                        {(['red', 'orange', 'yellow'] as const).map(sev =>
                            severityCounts[sev] > 0 ? (
                                <div key={sev} className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${severityColors[sev]}`} />
                                    <span className="text-[9px] text-slate-400 font-bold">{severityCounts[sev]}</span>
                                </div>
                            ) : null
                        )}
                    </div>

                    {/* Chevron indicator */}
                    {isOpen ? (
                        <ChevronLeft size={14} className="text-slate-400" />
                    ) : (
                        <ChevronRight size={14} className="text-slate-400" />
                    )}
                </div>
            </button>

            {/* Overlay backdrop for mobile */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:bg-black/30"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 bottom-0 z-50 w-[90vw] sm:w-[420px] lg:w-[440px] flex flex-col bg-slate-950/60 backdrop-blur-[32px] border-r border-white/10 shadow-2xl shadow-black/80"


                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30">
                                    <AlertTriangle size={18} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight">{t('sidebar.title')}</h2>
                                    <p className="text-xs text-slate-500 font-bold">{alerts.length} {t('sidebar.active_count')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <X size={16} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Severity summary bar */}
                        <div className="px-6 py-3 flex items-center gap-3 border-b border-white/5 bg-white/[0.02]">
                            {(['red', 'orange', 'yellow', 'green'] as const).map(sev =>
                                severityCounts[sev] > 0 ? (
                                    <div key={sev} className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${severityColors[sev]}`} />
                                        <span className="text-xs font-black text-slate-300">{severityCounts[sev]}</span>
                                    </div>
                                ) : null
                            )}
                        </div>

                        {/* Alert list */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {sortedAlerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                    <AlertTriangle size={32} className="mb-3 opacity-40" />
                                    <p className="text-sm font-bold">{t('no.alerts')}</p>
                                </div>
                            ) : (
                                sortedAlerts.map(alert => (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <AlertCard alert={alert} />
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
};
