import type { ReactNode } from 'react';

/* ══════════════ SECCIÓN DE TESTS ══════════════ */

export const TestSection = ({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: ReactNode }) => (
    <div className="bg-surface rounded-2xl border border-line/30 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-surface-3 to-surface border-b border-line/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#d7e2ff] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-brand-ink" style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div>
                <p className="font-extrabold text-sm text-ink leading-tight">{title}</p>
                <p className="text-xs text-ink-500 leading-tight mt-0.5">{sub}</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line/20">
            {children}
        </div>
    </div>
);

export interface TestResult { loading: boolean; ok?: boolean; msg: string }

interface SelectField {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}

interface TestCardProps {
    badge: string;
    badgeClass: string;
    title: string;
    desc: string;
    btnClass: string;
    label: string;
    onClick: () => void;
    result?: TestResult;
    /** Dos selects controlados (sin ids del DOM) */
    select?: SelectField;
    select2?: SelectField;
    isImage?: boolean;
}

export const TestCard = ({ badge, badgeClass, title, desc, btnClass, label, onClick, result, select, select2, isImage }: TestCardProps) => (
    <div className="p-5 hover:bg-canvas/50 transition-colors">
        <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${badgeClass}`}>{badge}</span>
            <span className="font-extrabold text-sm text-ink">{title}</span>
        </div>
        <p className="text-xs text-ink-500 leading-relaxed mb-3">{desc}</p>

        {select && (
            <div className="mb-2">
                <label className="text-xs font-bold text-ink-700 block mb-1">{select.label}</label>
                <select value={select.value} onChange={e => select.onChange(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-line bg-canvas text-xs outline-none focus:border-brand transition-all">
                    {(select.options.length ? select.options : [{ value: '', label: 'No hay datos disponibles' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
        )}
        {select2 && (
            <div className="mb-3">
                <label className="text-xs font-bold text-ink-700 block mb-1">{select2.label}</label>
                <select value={select2.value} onChange={e => select2.onChange(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-line bg-canvas text-xs outline-none focus:border-brand transition-all">
                    {(select2.options.length ? select2.options : [{ value: '', label: 'No hay datos disponibles' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
        )}

        <button onClick={onClick} disabled={result?.loading}
            className={`w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50 active:scale-[.98] ${btnClass}`}>
            {result?.loading ? <span className="inline-flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Ejecutando...</span> : label}
        </button>

        {result && !result.loading && (
            <div className={`mt-3 p-2.5 rounded-xl text-xs border break-all ${result.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {isImage && result.ok ? (
                    <img src={result.msg} alt="Mapa de alertas" className="w-full rounded-lg" />
                ) : (
                    <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-[11px]">{result.msg}</pre>
                )}
            </div>
        )}
    </div>
);

