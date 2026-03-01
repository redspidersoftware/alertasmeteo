import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { WeatherAlert } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TimelineProps {
    alerts: WeatherAlert[];
    currentTime: Date | null;
    onTimeChange: (time: Date | null) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

export const Timeline = ({ alerts, currentTime, onTimeChange, isPlaying, onTogglePlay }: TimelineProps) => {
    const { t } = useLanguage();

    const range = useMemo(() => {
        if (alerts.length === 0) return null;

        let min = new Date(alerts[0].raw.effective || alerts[0].sent).getTime();
        let max = new Date(alerts[0].expires).getTime();

        alerts.forEach(alert => {
            const effective = new Date(alert.raw.effective || alert.sent).getTime();
            const expires = new Date(alert.expires).getTime();
            if (effective < min) min = effective;
            if (expires > max) max = expires;
        });

        // Add a small buffer if min and max are the same
        if (min === max) {
            max += 3600000; // +1 hour
        }

        return { min, max };
    }, [alerts]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!range) return;
        const timestamp = parseInt(e.target.value);
        onTimeChange(new Date(timestamp));
    };

    const handleReset = () => {
        onTimeChange(null);
    };

    if (!range || alerts.length === 0) return null;

    const displayTime = currentTime || new Date();
    const progress = ((displayTime.getTime() - range.min) / (range.max - range.min)) * 100;

    return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 mt-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider opacity-70">
                    <Clock size={14} className="text-blue-400" />
                    {t('timeline.title') || 'Línea de Tiempo'}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onTogglePlay}
                        className={`p-2 rounded-lg transition-all ${isPlaying ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                        onClick={handleReset}
                        className={`p-2 rounded-lg transition-all ${!currentTime ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                        title="Reset to live"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="absolute h-full bg-blue-500"
                        initial={false}
                        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                    <input
                        type="range"
                        min={range.min}
                        max={range.max}
                        value={displayTime.getTime()}
                        onChange={handleSliderChange}
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>

                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <span>{new Date(range.min).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-blue-400 font-black px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                        {displayTime.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{new Date(range.max).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {!currentTime && (
                    <div className="flex items-center justify-center gap-2 bg-emerald-500/5 py-1 rounded-lg border border-emerald-500/10">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t('timeline.live') || 'En Vivo'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
