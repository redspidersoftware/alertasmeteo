import { motion } from 'framer-motion';
import { CloudRainWind } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DonationSectionProps {
    className?: string;
    isFixed?: boolean;
}

export const DonationSection = ({ className = '', isFixed = false }: DonationSectionProps) => {
    const { t } = useLanguage();

    const baseStyles = "bg-slate-900/40 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group";
    const pcStyles = isFixed ? "fixed top-24 left-6 z-40 w-80 transition-all duration-300" : "w-full";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${baseStyles} ${pcStyles} ${className}`}
        >
            <div className={`relative z-10 flex flex-col gap-4`}>
                <div className={`flex items-center gap-3 transition-opacity duration-300 ${isFixed ? 'opacity-40 group-hover:opacity-100' : ''}`}>
                    <div className="bg-blue-500/20 p-2 rounded-xl">
                        <CloudRainWind size={18} className="text-blue-400" />
                    </div>
                    <h2 className="text-lg font-black text-white tracking-tight">
                        {t('footer.donate_title') || t('footer.donate')}
                    </h2>
                </div>

                <div className="flex flex-col gap-3 relative z-10">
                    {/* PayPal */}
                    <form action="https://www.paypal.com/donate" method="post" target="_blank">
                        <input type="hidden" name="business" value="RLBDLZGFL5DRQ" />
                        <input type="hidden" name="no_recurring" value="0" />
                        <input type="hidden" name="item_name" value="Ayúdanos a mejorar el servicio" />
                        <input type="hidden" name="currency_code" value="EUR" />
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-white text-[10px] font-black transition-all shadow-lg uppercase tracking-widest active:scale-95"
                        >
                            PayPal {t('footer.donate')}
                        </button>
                    </form>

                    {/* Buy Me a Coffee */}
                    <a
                        href="https://buymeacoffee.com/alertasmeteo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black transition-all border border-white/10 uppercase tracking-widest active:scale-95"
                    >
                        <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC" className="h-4" />
                        <span>{t('footer.donate_bmc')}</span>
                    </a>
                </div>
            </div>
        </motion.div>
    );
};
