import { useRef, useState } from 'react';
import { downloadCsv, normalizeZone } from './helpers';
import type { PostalMapping } from './types';
import { BTN } from './AdminUi';

/* ══════════════ A5 · IMPORT / EXPORT DE CÓDIGOS POSTALES ══════════════ */

interface Props {
    postal: PostalMapping[];
    /** Guarda un CP (reutiliza la acción existente del worker) */
    onSave: (m: PostalMapping) => Promise<void>;
    onProgress?: (done: number, total: number) => void;
}

/** Parsea un CSV con separador `;` o `,`, con o sin cabecera. Devuelve filas válidas. */
const parseCsv = (text: string): PostalMapping[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const sep = lines[0].includes(';') ? ';' : ',';
    const out: PostalMapping[] = [];
    for (const line of lines) {
        const cells = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cells.length < 2) continue;
        // Detecta y descarta la cabecera
        const first = cells[0].toLowerCase();
        if (first === 'postal_code' || first === 'codigo' || first === 'código' || first === 'cp') continue;
        const [pc, zone, province] = cells;
        if (!/^\d{5}$/.test(pc)) continue;
        if (!zone) continue;
        out.push({ postal_code: pc, aemet_zone_name: zone, province: province || '' });
    }
    return out;
};

export const PostalTools = ({ postal, onSave, onProgress }: Props) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ ok: number; skipped: number; total: number } | null>(null);

    const handleExport = () => {
        if (postal.length === 0) return;
        const rows: (string | number)[][] = [
            ['postal_code', 'aemet_zone_name', 'province'],
            ...postal.map(p => [p.postal_code, p.aemet_zone_name, p.province]),
        ];
        downloadCsv(`codigos-postales-meteoalerta-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    };

    const handleFile = async (file: File) => {
        setImporting(true);
        setResult(null);
        try {
            const text = await file.text();
            const rows = parseCsv(text);
            const existing = new Set(postal.map(p => p.postal_code));
            let done = 0; let skipped = 0;
            // Importa secuencialmente para no saturar el worker
            for (const r of rows) {
                // Si el CP ya existe pero la zona normalizada difiere, lo re-guarda (corrige acentos)
                if (existing.has(r.postal_code) && normalizeZone(r.aemet_zone_name) === normalizeZone(
                    postal.find(p => p.postal_code === r.postal_code)?.aemet_zone_name || '')) {
                    skipped++;
                    done++;
                    onProgress?.(done, rows.length);
                    continue;
                }
                try {
                    await onSave(r);
                    done++;
                } catch {
                    skipped++;
                    done++;
                }
                onProgress?.(done, rows.length);
            }
            setResult({ ok: rows.length - skipped, skipped, total: rows.length });
        } finally {
            setImporting(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-canvas border border-line/30">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <p className="text-xs font-extrabold text-ink">Importar / exportar CSV</p>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                        Columnas: <span className="font-mono">codigo_postal; zona_aemet; provincia</span> · el import corrige zonas mal escritas
                    </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button onClick={handleExport} disabled={postal.length === 0}
                        className={`${BTN} px-3.5 py-2 bg-surface border border-line text-ink-700 hover:border-brand/60 hover:text-brand-ink`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>download</span>Exportar
                    </button>
                    <button onClick={() => fileRef.current?.click()} disabled={importing}
                        className={`${BTN} px-3.5 py-2 bg-brand text-white shadow hover:brightness-110`}>
                        {importing
                            ? <span className="inline-flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Importando…</span>
                            : <><span className="material-symbols-outlined" style={{ fontSize: 15 }}>upload</span>Importar</>}
                    </button>
                </div>
            </div>

            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />

            {importing && onProgress && (
                <p className="text-[11px] font-semibold text-brand-ink">Procesando registros…</p>
            )}
            {result && !importing && (
                <p className={`text-[11px] font-semibold px-3 py-2 rounded-xl border ${result.ok > 0 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                    {result.ok} guardado{result.ok === 1 ? '' : 's'} · {result.skipped} sin cambios/erróneos · {result.total} filas leídas
                </p>
            )}
        </div>
    );
};
