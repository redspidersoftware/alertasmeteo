import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Info } from 'lucide-react';
import type { WeatherAlert } from '../types';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface AlertCardProps {
    alert: WeatherAlert;
}

const severityColors = {
    red: 'bg-red-500/10 border-red-500 text-red-100',
    orange: 'bg-orange-500/10 border-orange-500 text-orange-100',
    yellow: 'bg-yellow-500/10 border-yellow-500 text-yellow-100',
    green: 'bg-green-500/10 border-green-500 text-green-100',
    unknown: 'bg-gray-500/10 border-gray-500 text-gray-100'
};

const iconColors = {
    red: 'text-red-500',
    orange: 'text-orange-500',
    yellow: 'text-yellow-500',
    green: 'text-green-500',
    unknown: 'text-gray-500'
};

export const AlertCard = ({ alert }: AlertCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const { t } = useLanguage();
    const colorClass = severityColors[alert.severity] || severityColors.unknown;
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            className={`relative overflow-hidden rounded-xl border p-4 backdrop-blur-sm transition-all shadow-lg ${colorClass} hover:bg-opacity-20 cursor-pointer`}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-full bg-black/20 ${iconClass} flex-shrink-0`}>
                    <AlertTriangle size={24} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-lg leading-tight truncate">{alert.headline}</h3>
                        <span className="text-xs font-mono opacity-70 bg-black/30 px-2 py-1 rounded whitespace-nowrap">
                            {formatDate(alert.sent)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-sm opacity-90">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">{alert.area}</span>
                    </div>

                    <p className="mt-2 text-sm opacity-80 line-clamp-2">
                        {alert.description}
                    </p>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 pt-4 border-t border-white/10 text-sm space-y-3">
                                    <div>
                                        <span className="font-semibold block mb-1 flex items-center gap-2"><Info size={14} /> {t('alert.description')}</span>
                                        <p className="opacity-80 whitespace-pre-wrap">{alert.description}</p>
                                    </div>
                                    {alert.instruction && (
                                        <div>
                                            <span className="font-semibold block mb-1">{t('alert.instructions')}</span>
                                            <p className="opacity-80 italic">{alert.instruction}</p>
                                        </div>
                                    )}
                                    <div className="text-xs opacity-60 flex items-center gap-1 mt-2">
                                        <Clock size={12} /> {t('alert.expires')} {formatExpires(alert.expires)}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
