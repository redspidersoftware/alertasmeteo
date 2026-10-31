import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DonationSectionProps {
    className?: string;
    isFixed?: boolean;
}

// Botón flotante de donaciones. Posicionamiento vía utilidades Tailwind
// (safe-area incluida) y colores vía design tokens; solo los colores de
// marca de terceros (PayPal #0070ba, BMC #FFDD00) quedan como hex fijos.
export const DonationSection = ({ isFixed = false }: DonationSectionProps) => {
    const [open, setOpen] = useState(false);

    if (!isFixed) return null;

    return (
        <div className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-14 right-0 w-[220px] flex flex-col gap-2.5 rounded-2xl bg-surface border border-line/40 p-4 shadow-xl"
                    >
                        <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                            ❤️ Apoya el proyecto
                        </p>

                        {/* PayPal */}
                        <form action="https://www.paypal.com/donate" method="post" target="_blank">
                            <input type="hidden" name="business" value="RLBDLZGFL5DRQ" />
                            <input type="hidden" name="no_recurring" value="0" />
                            <input type="hidden" name="item_name" value="Ayúdanos a mejorar el servicio" />
                            <input type="hidden" name="currency_code" value="EUR" />
                            <button
                                type="submit"
                                className="ui-btn w-full h-[38px] rounded-[10px] bg-[#0070ba] text-white text-[11px] tracking-wide hover:bg-[#005c9a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                            >
                                💙 Donar por PayPal
                            </button>
                        </form>

                        {/* Buy Me a Coffee */}
                        <a
                            href="https://buymeacoffee.com/alertasmeteo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-btn w-full h-[38px] rounded-[10px] bg-[#FFDD00] text-black text-[11px] tracking-wide no-underline hover:brightness-95 transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                        >
                            <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="" className="h-4" />
                            Buy Me a Coffee
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle button */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(!open)}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg border border-line/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${open ? 'bg-surface text-ink' : 'bg-[#FFDD00] text-black'}`}
                title="Apoya el proyecto"
                aria-label={open ? 'Cerrar donaciones' : 'Apoya el proyecto'}
                aria-expanded={open}
            >
                {open ? '✕' : '☕'}
            </motion.button>
        </div>
    );
};
