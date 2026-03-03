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
    const [internalAlerts, setInternalAlerts] = useState<WeatherAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const alertsPerPage = 12; // Number of alerts to show per page

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

    // Reset currentPage to 1 whenever the list of alerts changes
    useEffect(() => {
        setCurrentPage(1);
    }, [displayAlerts]);

    // Calculate pagination values
    const totalAlerts = displayAlerts.length;
    const totalPages = Math.ceil(totalAlerts / alertsPerPage);
    const indexOfLastAlert = currentPage * alertsPerPage;
    const indexOfFirstAlert = indexOfLastAlert - alertsPerPage;
    const currentAlerts = displayAlerts.slice(indexOfFirstAlert, indexOfLastAlert);

    const handleNextPage = () => {
        setCurrentPage(prevPage => Math.min(prevPage + 1, totalPages));
    };

    const handlePreviousPage = () => {
        setCurrentPage(prevPage => Math.max(prevPage - 1, 1));
    };

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
        <div className="p-4">
            {currentAlerts.length === 0 && totalAlerts === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-400">
                    <p>{t('no.alerts')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                        {currentAlerts.map(alert => (
                            <AlertCard key={alert.id} alert={alert} />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center mt-8 space-x-4">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                ← Anterior
                            </button>
                            <span className="text-slate-400 text-sm font-bold">
                                Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages}</span>
                                <span className="ml-2 text-slate-600">({totalAlerts} avisos)</span>
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
