import { useState } from 'react';

/* ══════════════ SELECTS CONTROLADOS DE TESTS (C2) ══════════════ */
/** Maneja los selects de cada TestCard sin tocar el DOM (sin getElementById). */

export function useTestSelects(defaults: Record<string, string> = {}) {
    const [values, setValues] = useState<Record<string, string>>(defaults);
    const set = (key: string) => (v: string) => setValues(p => ({ ...p, [key]: v }));
    const get = (key: string) => values[key] ?? '';
    return { get, set };
}
