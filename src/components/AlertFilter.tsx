import { useLanguage } from '../context/LanguageContext';
import type { WeatherAlert } from '../types';
import { CloudRain, Wind, Snowflake, Sun, AlertTriangle } from 'lucide-react';

interface AlertFilterProps {
    alerts: WeatherAlert[];
    selectedType: string | null;
    onSelectType: (type: string | null) => void;
}

export const AlertFilter = ({ alerts, selectedType, onSelectType }: AlertFilterProps) => {
    const { t } = useLanguage();

    // Safely get unique event types
    const eventTypes = Array.from(new Set(
        alerts
            .map(a => a.event || 'Desconocido') // Fallback for missing event
            .filter(Boolean)
    )).sort();

    const getIcon = (event: string) => {
        if (!event) return <AlertTriangle size={16} />;
        const e = event.toLowerCase();
        if (e.includes('lluvia') || e.includes('rain')) return <CloudRain size={16} />;
        if (e.includes('viento') || e.includes('wind')) return <Wind size={16} />;
        if (e.includes('nevada') || e.includes('snow')) return <Snowflake size={16} />;
        if (e.includes('calor') || e.includes('heat') || e.includes('temp')) return <Sun size={16} />;
        return <AlertTriangle size={16} />;
    };

    return (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 h-full overflow-y-auto max-h-[500px]">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                {t('filter.title') || 'Tipos de Avisos'}
            </h3>

            <div className="space-y-2">
                <button
                    onClick={() => onSelectType(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedType === null
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                >
                    <span>{t('filter.all') || 'Todos'}</span>
                    <span className="bg-black/30 px-2 py-0.5 rounded text-xs opacity-70">
                        {alerts.length}
                    </span>
                </button>

                {eventTypes.map(type => {
                    const count = alerts.filter(a => (a.event || 'Desconocido') === type).length;
                    return (
                        <button
                            key={type}
                            onClick={() => onSelectType(type === selectedType ? null : type)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${selectedType === type
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate pr-2">
                                <span className="opacity-70 group-hover:text-current">{getIcon(type)}</span>
                                <span className="truncate">{type}</span>
                            </div>
                            <span className="bg-black/30 px-2 py-0.5 rounded text-xs opacity-70 flex-shrink-0">
                                {count}
                            </span>
                        </button>
                    );
                })}

                {eventTypes.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">
                        {t('no.alerts') || 'Sin avisos'}
                    </p>
                )}
            </div>
        </div>
    );
};
