import { useState, useCallback } from 'react';

/* ══════════════ SELECTS CONTROLADOS DE TESTS (C2) ══════════════ */
/** Maneja los selects de cada TestCard sin tocar el DOM (sin getElementById). */

export function useTestSelects(defaults: Record<string, string> = {}) {
    const [values, setValues] = useState<Record<string, string>>(defaults);
    const set = useCallback((key: string) => (v: string) => setValues(p => ({ ...p, [key]: v })), []);
    const get = useCallback((key: string, fallback = '') => values[key] || fallback, [values]);
    const ensure = useCallback((key: string, defaultValue: string) => {
        if (!defaultValue) return;
        setValues(p => (p[key] ? p : { ...p, [key]: defaultValue }));
    }, []);

    return { get, set, ensure, values };
}
