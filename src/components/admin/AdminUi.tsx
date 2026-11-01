import type { ReactNode } from 'react';
import { SparkLine } from '../AdminWidgets';

/* ══════════════ CONSTANTES DE ESTILO ══════════════ */

export const BTN = 'inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none';
export const inputCls = 'w-full h-11 px-3 rounded-xl border border-line bg-canvas text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all';

/* ══════════════ COMPONENTES REUTILIZABLES ══════════════ */

export const StatCard = ({ icon, color, label, value, hint, spark, sparkColor }: { icon: string; color: string; label: string; value: ReactNode; hint?: string; spark?: number[]; sparkColor?: string }) => (
    <div className="bg-surface rounded-2xl border border-line/30 shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
                <p className="text-3xl font-extrabold text-ink mt-1.5 leading-none">{value}</p>
                {hint && <p className="text-xs text-ink-500 mt-1.5 truncate">{hint}</p>}
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>{icon}</span>
            </div>
        </div>
        {spark && spark.length > 1 && (
            <div className="mt-3 -mx-1">
                <SparkLine data={spark} color={sparkColor || '#003f87'} />
            </div>
        )}
    </div>
);

export const Card = ({ icon, title, sub, action, children, pad = true }: { icon: string; title: string; sub?: string; action?: ReactNode; children: ReactNode; pad?: boolean }) => (
    <section className="bg-surface rounded-2xl border border-line/30 shadow-sm overflow-hidden">
        <header className="px-5 py-4 border-b border-line/30 flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-[#d7e2ff] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-brand-ink" style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="font-extrabold text-sm text-ink leading-tight">{title}</h2>
                {sub && <p className="text-xs text-ink-500 leading-tight mt-0.5">{sub}</p>}
            </div>
            {action}
        </header>
        <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
);

export const Loading = ({ text = 'Cargando...', rows = 0 }: { text?: string; rows?: number }) => {
    // Skeleton opcional: si se piden filas, dibuja líneas en lugar de un spinner
    if (rows > 0) {
        return (
            <div className="py-4 space-y-2.5" aria-busy="true" aria-label={text}>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-1">
                        <div className="w-9 h-9 rounded-lg bg-surface-3 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 rounded bg-surface-3 animate-pulse" style={{ width: `${55 + ((i * 13) % 35)}%` }} />
                            <div className="h-2.5 rounded bg-surface-3 animate-pulse" style={{ width: `${35 + ((i * 17) % 40)}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-brand/25 border-t-brand rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-ink-500">{text}</p>
        </div>
    );
};

export const Empty = ({ icon, title, sub }: { icon: string; title: string; sub?: string }) => (
    <div className="py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-ink-500" style={{ fontSize: 28 }}>{icon}</span>
        </div>
        <p className="text-sm font-bold text-ink-700">{title}</p>
        {sub && <p className="text-xs text-ink-500 mt-1">{sub}</p>}
    </div>
);

export const SearchBox = ({ value, onChange, placeholder, icon = 'search' }: { value: string; onChange: (v: string) => void; placeholder: string; icon?: string }) => (
    <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" style={{ fontSize: 19 }}>{icon}</span>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-line bg-canvas text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all" />
    </div>
);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
        <label className="text-xs font-bold text-ink-700 block mb-1.5">{label}</label>
        {children}
    </div>
);

export const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-line/30 bg-canvas">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="leading-none">
            <p className="text-lg font-extrabold text-ink">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500 mt-0.5">{label}</p>
        </div>
    </div>
);

export const ConfigBlock = ({ title, icon, children }: { title: string; icon: string; children: ReactNode }) => (
    <div className="border-t border-line/30 pt-6 first:border-0 first:pt-0">
        <h3 className="font-extrabold text-ink mb-3.5 flex items-center gap-2 text-[15px]">
            <span className="material-symbols-outlined text-brand-ink" style={{ fontSize: 20 }}>{icon}</span>
            {title}
        </h3>
        {children}
    </div>
);
