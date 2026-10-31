import { useEffect, useState } from 'react';

/**
 * Lógica de "tarjetas vivas" para alertas (sin JSX — ver AlertDynamics.tsx
 * para las piezas visuales: Countdown, VigenciaBar y NuevaBadge).
 *  - useNow: reloj compartido (un intervalo por componente, 60 s por defecto)
 *  - getAlertTiming: cuenta atrás, urgencia, estado "nueva" y vigencia consumida
 */

export function useNow(tickMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return now;
}

export interface AlertTiming {
  /** Tiempo restante en formato corto: "2 h 15 min" / "45 min" / "menos de 1 min" */
  label: string;
  /** Queda <=20 % de vigencia o <=1 h: para el pulso de urgencia */
  urgent: boolean;
  /** La alerta ya superó su fecha de expiración */
  expired: boolean;
  /** Emitida hace menos de 1 h */
  isNew: boolean;
  /** Fracción de vigencia consumida (0..1) */
  progress: number;
  /** Hora de expiración "HH:MM" (vacío si la fecha no es válida) */
  expiresAt: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function formatRemaining(ms: number): string {
  const totalMin = Math.floor(Math.abs(ms) / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0) return `${m} min`;
  return 'menos de 1 min';
}

export function getAlertTiming(sent?: string, expires?: string, now = Date.now()): AlertTiming {
  const sentMs = Date.parse(sent ?? '');
  const expMs = Date.parse(expires ?? '');
  const valid = !isNaN(sentMs) && !isNaN(expMs) && expMs > sentMs;

  const remainingMs = valid ? expMs - now : 0;
  const totalMs = valid ? expMs - sentMs : 0;
  const expired = valid && remainingMs <= 0;
  const urgent =
    valid && !expired && (remainingMs <= 60 * 60_000 || (totalMs > 0 && remainingMs / totalMs <= 0.2));
  const isNew = valid && !expired && now - sentMs <= 60 * 60_000;

  return {
    label: valid ? formatRemaining(remainingMs) : '—',
    expired,
    urgent,
    isNew,
    progress: !valid ? 0 : expired ? 1 : clamp01((now - sentMs) / totalMs),
    expiresAt: isNaN(expMs)
      ? ''
      : new Date(expMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };
}
