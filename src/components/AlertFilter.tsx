import { useLanguage } from '../context/LanguageContext';
import type { WeatherAlert } from '../types';
import { CloudRain, Wind, Snowflake, Sun, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertFilterProps {
    alerts: WeatherAlert[];
    selectedType: string | null;
    selectedSeverity: string | null;
    onFilterChange: (type: string | null, severity: string | null) => void;
}

const SEVERITIES: WeatherAlert['severity'][] = ['red', 'orange', 'yellow'];

export const AlertFilter = ({ alerts, selectedType, selectedSeverity, onFilterChange }: AlertFilterProps) => {
    const { t } = useLanguage();
    const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({});

    const groupedAlerts = useMemo(() => {
        const groups: Record<string, Set<string>> = {
            red: new Set(),
            orange: new Set(),
            yellow: new Set()
        };

        alerts.forEach(alert => {
            if (groups[alert.severity]) {
                groups[alert.severity].add(alert.event);
            }
        });

        return groups;
    }, [alerts]);

    // Auto-expand levels with active alerts on first load
    useEffect(() => {
        const initialState: Record<string, boolean> = {};
        SEVERITIES.forEach(sev => {
            if (groupedAlerts[sev].size > 0) {
                initialState[sev] = true;
            }
        });
        // eslint-disable-next-line
        setExpandedLevels(initialState);
    }, [groupedAlerts]);

    const getIcon = (event: string) => {
        const e = event.toLowerCase();
        if (e.includes('lluvia') || e.includes('precipitaci')) return <CloudRain size={14} />;
        if (e.includes('viento') || e.includes('rachas') || e.includes('galerna')) return <Wind size={14} />;
        if (e.includes('nieve') || e.includes('nevada') || e.includes('aludes')) return <Snowflake size={14} />;
        if (e.includes('calor') || e.includes('máximas') || e.includes('temperatura')) return <Sun size={14} />;
        return <AlertTriangle size={14} />;
    };

    const cleanEventName = (name: string) => {
        return name
            .replace(/aviso de /i, '')
            .replace(/ de nivel (amarillo|naranja|rojo)/i, '')
            .split('/')[0] // Take first part if there are multiple
            .trim();
    };

    const toggleLevel = (level: string) => {
        setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }));
    };

    const isLevelSelected = (sev: string) => selectedSeverity === sev && selectedType === null;
    const isTypeSelected = (sev: string, type: string) => selectedSeverity === sev && selectedType === type;

    return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 h-full overflow-y-auto custom-scrollbar max-h-[600px] shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <div className="w-2 h-6 bg-blue-500 rounded-full" />
                {t('filter.title') || 'Filtro de Avisos'}
            </h3>

            <div className="space-y-4">
                {/* All Alerts Root */}
                <button
                    onClick={() => onFilterChange(null, null)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${selectedSeverity === null && selectedType === null
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        {selectedSeverity === null && <Check size={14} className="text-blue-500" />}
                        {t('filter.all') || 'Todos los Avisos'}
                    </span>
                    <span className="bg-black/40 px-2.5 py-1 rounded-lg text-[10px] font-black opacity-60">
                        {alerts.length}
                    </span>
                </button>

                {/* Tree Structure */}
                <div className="space-y-2">
                    {SEVERITIES.map(sev => {
                        const types = Array.from(groupedAlerts[sev]).sort();
                        const isExpanded = expandedLevels[sev];
                        const hasAlerts = types.length > 0;
                        const labels: Record<string, string> = {
                            red: 'Avisos Rojos',
                            orange: 'Avisos Naranjas',
                            yellow: 'Avisos Amarillos',
                            green: 'Avisos Verdes',
                            unknown: 'Avisos Desconocidos'
                        };

                        const colorClasses: Record<string, string> = {
                            red: 'text-red-400',
                            orange: 'text-orange-400',
                            yellow: 'text-yellow-400',
                            green: 'text-emerald-400',
                            unknown: 'text-slate-400'
                        };

                        const label = labels[sev] || 'Aviso';
                        const colorClass = colorClasses[sev] || 'text-slate-400';

                        return (
                            <div key={sev} className="space-y-1">
                                <div className="flex items-center gap-1 group">
                                    <button
                                        onClick={() => toggleLevel(sev)}
                                        className={`p-1 rounded-md hover:bg-white/5 transition-colors ${!hasAlerts ? 'opacity-20 pointer-events-none' : ''}`}
                                    >
                                        <ChevronRight size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>

                                    <button
                                        onClick={() => hasAlerts && onFilterChange(null, sev)}
                                        className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-black transition-all flex items-center justify-between ${isLevelSelected(sev)
                                            ? `severity-bg-${sev} ${colorClass} border border-white/10`
                                            : `text-slate-500 group-hover:text-slate-300 ${!hasAlerts ? 'opacity-40 grayscale' : ''}`
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${sev === 'red' ? 'bg-red-500' : sev === 'orange' ? 'bg-orange-500' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`} />
                                            {label}
                                        </span>
                                        {hasAlerts && (
                                            <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] opacity-60">
                                                {alerts.filter(a => a.severity === sev).length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && hasAlerts && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="filter-tree-line ml-[18px] border-l border-white/5 pl-4 overflow-hidden"
                                        >
                                            <div className="space-y-1 py-2">
                                                {types.map(originalType => {
                                                    const cleanName = cleanEventName(originalType);
                                                    const count = alerts.filter(a => a.severity === sev && a.event === originalType).length;
                                                    return (
                                                        <button
                                                            key={originalType}
                                                            onClick={() => onFilterChange(originalType, sev)}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group/item relative ${isTypeSelected(sev, originalType)
                                                                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20'
                                                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                                                }`}
                                                        >
                                                            {/* Horizontal branch line */}
                                                            <div className="absolute -left-4 top-1/2 w-3 border-t border-white/5" />

                                                            <div className="flex items-center gap-2">
                                                                <span className="opacity-60 group-hover/item:opacity-100 transition-opacity">
                                                                    {getIcon(originalType)}
                                                                </span>
                                                                <span className="truncate capitalize">{cleanName}</span>
                                                            </div>
                                                            <span className="text-[9px] opacity-40 font-black bg-black/30 px-1.5 py-0.5 rounded">
                                                                {count}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
