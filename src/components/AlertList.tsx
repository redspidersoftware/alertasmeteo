import { useEffect, useState, useCallback } from 'react';
import { getAlerts } from '../services/aemet';
import type { WeatherAlert } from '../types';
import { AlertCard } from './AlertCard';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AlertListProps {
    filteredAlerts?: WeatherAlert[];
}

export const AlertList = ({ filteredAlerts }: AlertListProps) => {
    // If filteredAlerts is provided, use it. Otherwise fetch locally (fallback, though App passes it now)
    // For logic consistency with App.tsx, we should prefer receiving props.
    // However, initially AlertList fetched its own data.
    // To keep it compatible, we can check if props are passed.

    const [internalAlerts, setInternalAlerts] = useState<WeatherAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    const fetchAlerts = useCallback(async () => {
        if (filteredAlerts) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await getAlerts();
            setInternalAlerts(data);
            setError(null);
        } catch (err) {
            setError(t('error.fetch'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [t, filteredAlerts]);

    useEffect(() => {
        fetchAlerts();
        if (!filteredAlerts) {
            const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [fetchAlerts, filteredAlerts]);

    const displayAlerts = filteredAlerts || internalAlerts;

    if (loading && displayAlerts.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-blue-400" size={48} />
                <span className="ml-3 text-slate-400">{t('loading')}</span>
            </div>
        );
    }

    if (error && !filteredAlerts) {
        return (
            <div className="text-center py-20 text-red-400">
                <p>{error}</p>
                <button
                    onClick={fetchAlerts}
                    className="mt-4 px-4 py-2 bg-red-500/20 rounded hover:bg-red-500/40 transition-colors"
                >
                    {t('retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
            {displayAlerts.length === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-400">
                    <p>{t('no.alerts')}</p>
                </div>
            ) : (
                displayAlerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} />
                ))
            )}
        </div>
    );
};
