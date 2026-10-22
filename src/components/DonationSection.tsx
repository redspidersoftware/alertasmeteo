import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DonationSectionProps {
    className?: string;
    isFixed?: boolean;
}

export const DonationSection = ({ isFixed = false }: DonationSectionProps) => {
    const [open, setOpen] = useState(false);

    if (!isFixed) return null;

    return (
        <div style={{ position: 'fixed', bottom: '80px', left: '16px', zIndex: 9999 }}>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            bottom: '56px',
                            left: 0,
                            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                            borderRadius: '16px',
                            padding: '16px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            width: '220px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}
                    >
                        <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
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
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: '#0070ba',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    border: 'none',
                                    cursor: 'pointer',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                💙 Donar por PayPal
                            </button>
                        </form>

                        {/* Buy Me a Coffee */}
                        <a
                            href="https://buymeacoffee.com/alertasmeteo"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                height: '38px',
                                borderRadius: '10px',
                                background: '#FFDD00',
                                color: '#000',
                                fontSize: '11px',
                                fontWeight: 800,
                                textDecoration: 'none',
                                letterSpacing: '0.05em',
                                boxSizing: 'border-box',
                            }}
                        >
                            <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC" style={{ height: '16px' }} />
                            Buy Me a Coffee
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle button */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(!open)}
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: open ? '#1e293b' : '#FFDD00',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    transition: 'background 0.2s',
                }}
                title="Apoya el proyecto"
            >
                {open ? '✕' : '☕'}
            </motion.button>
        </div>
    );
};
