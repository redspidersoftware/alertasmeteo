import { motion } from 'framer-motion';
import type { AlertTiming } from '../hooks/useAlertDynamics';

/**
 * Piezas visuales de las tarjetas de alertas dinámicas.
 * La lógica de tiempo vive en src/hooks/useAlertDynamics.ts
 * (este archivo solo exporta componentes, por regla de react-refresh).
 */

/** "Quedan 2 h 15 min · hasta 14:00" / "Expirada hace 10 min" */
export const Countdown = ({ timing, className = '' }: { timing: AlertTiming; className?: string }) => (
  <span className={className}>
    {timing.expired ? (
      <span className="text-ink-500">
        Expirada hace <strong className="text-ink-500">{timing.label}</strong>
      </span>
    ) : (
      <>
        Quedan{' '}
        <strong className={timing.urgent ? 'text-[#ba1a1a]' : 'text-ink'}>{timing.label}</strong>
        {timing.expiresAt && <span className="text-ink-500"> · hasta {timing.expiresAt}</span>}
      </>
    )}
  </span>
);

/** Barra de vigencia consumida: azul → ámbar (75 %) → rojo (90 %) */
const barTone = (pct: number) => (pct >= 90 ? 'bg-[#ba1a1a]' : pct >= 75 ? 'bg-[#eab308]' : 'bg-brand');

export const VigenciaBar = ({ progress, className = '' }: { progress: number; className?: string }) => {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  return (
    <div
      className={`h-1 w-full overflow-hidden rounded-full bg-ink-100/80 ${className}`}
      role="progressbar"
      aria-label="Vigencia consumida de la alerta"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={`h-full rounded-full transition-colors ${barTone(pct)}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
};

/** Chip "Nueva" con pop de entrada y barrido de brillo (respetado por reduced-motion) */
export const NuevaBadge = ({ className = '' }: { className?: string }) => (
  <motion.span
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
    className={`relative inline-flex flex-shrink-0 overflow-hidden rounded-full bg-[#15803d] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm ${className}`}
  >
    <span className="relative z-10">Nueva</span>
    <span
      aria-hidden="true"
      className="absolute inset-y-0 left-0 w-full animate-[shimmer_2.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent"
    />
  </motion.span>
);
