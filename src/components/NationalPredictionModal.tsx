import { X, Cloud, Thermometer, Wind, Zap, Calendar } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { getNationalPrediction } from '../services/aemet';
import type { NationalPrediction } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const NationalPredictionModal = ({ isOpen, onClose }: Props) => {
    const { t } = useLanguage();
    const [prediction, setPrediction] = useState<NationalPrediction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getNationalPrediction().then(data => {
                setPrediction(data);
                setLoading(false);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden relative my-auto"
                >
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -ml-48 -mb-48"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-50 bg-white/5 p-2 rounded-full hover:bg-white/10 shadow-lg"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-6 sm:p-10 relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                <Cloud size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">Predicción Nacional</h2>
                                <p className="text-blue-400 font-bold uppercase tracking-widest text-xs mt-1">
                                    AEMET — Actualización diaria
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando pronóstico...</p>
                            </div>
                        ) : prediction ? (
                            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                                {/* Left Column: Status & Significant Phenomena */}
                                <div className="space-y-6">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner">
                                        <div className="flex items-center gap-3 mb-4 text-blue-400">
                                            <Calendar size={20} />
                                            <h3 className="font-black uppercase tracking-widest text-xs">Información General</h3>
                                        </div>
                                        <p className="text-slate-100 font-bold text-lg mb-1">{prediction.validity}</p>
                                        <p className="text-slate-400 text-sm font-medium italic">{prediction.elaborated}</p>
                                    </div>

                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                        <div className="absolute -right-8 -top-8 bg-amber-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>
                                        <div className="flex items-center gap-3 mb-4 text-amber-400">
                                            <Zap size={20} />
                                            <h3 className="font-black uppercase tracking-widest text-xs">Fenómenos Significativos</h3>
                                        </div>
                                        <p className="text-slate-200 leading-relaxed font-semibold">
                                            {prediction.significantPhenomena}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column: Details */}
                                <div className="space-y-6">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                        <div className="flex items-center gap-3 mb-4 text-emerald-400">
                                            <Cloud size={20} />
                                            <h3 className="font-black uppercase tracking-widest text-xs">Predicción</h3>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            <p className="text-slate-300 leading-relaxed font-medium">
                                                {prediction.generalPrediction}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                            <div className="flex items-center gap-3 mb-3 text-orange-400">
                                                <Thermometer size={18} />
                                                <h3 className="font-black uppercase tracking-widest text-[10px]">Temperaturas</h3>
                                            </div>
                                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                                {prediction.temperatures}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                            <div className="flex items-center gap-3 mb-3 text-sky-400">
                                                <Wind size={18} />
                                                <h3 className="font-black uppercase tracking-widest text-[10px]">Viento</h3>
                                            </div>
                                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                                {prediction.wind}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <p className="text-slate-500">No se pudo cargar la predicción en este momento.</p>
                            </div>
                        )}

                        <div className="mt-10 flex justify-center border-t border-white/5 pt-8">
                            <button
                                onClick={onClose}
                                className="px-10 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-colors shadow-2xl active:scale-95"
                            >
                                {t('form.cancel')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
