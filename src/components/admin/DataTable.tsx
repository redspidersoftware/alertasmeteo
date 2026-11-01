import { useMemo, useState, type ReactNode } from 'react';
import { Empty } from './AdminUi';

/* ══════════════ TABLA ORDENABLE + PAGINADA (B1) ══════════════ */

export interface Column<T> {
    /** Clave única de la columna (para el estado de orden) */
    key: string;
    /** Cabecera visible */
    label: string;
    /** Clases de anchura/ocultación en móvil */
    className?: string;
    /** Extrae el valor por el que se ordena; si se omite, la columna no ordena */
    sortValue?: (row: T) => string | number;
    /** Renderiza la celda */
    render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    /** Clave única por fila */
    rowKey: (row: T) => string;
    /** Filas por página */
    pageSize?: number;
    /** Filas con fondo alternado */
    striped?: boolean;
    /** Texto del pie con el recuento */
    footer?: (shown: number, total: number) => ReactNode;
    onRowClick?: (row: T) => void;
    emptyIcon?: string;
    emptyTitle?: string;
    emptySub?: string;
}

export function DataTable<T>({
    columns, rows, rowKey, pageSize = 50, striped = true, footer, onRowClick,
    emptyIcon = 'search_off', emptyTitle = 'Sin resultados', emptySub,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);

    const sorted = useMemo(() => {
        if (!sortKey) return rows;
        const col = columns.find(c => c.key === sortKey);
        if (!col?.sortValue) return rows;
        const val = col.sortValue;
        const copy = [...rows];
        copy.sort((a, b) => {
            const av = val(a); const bv = val(b);
            let cmp: number;
            if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
            else cmp = String(av).localeCompare(String(bv), 'es', { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return copy;
    }, [rows, sortKey, sortDir, columns]);

    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, pageCount - 1);
    const shown = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc');
            else { setSortKey(null); setSortDir('asc'); }
        } else { setSortKey(key); setSortDir('asc'); }
        setPage(0);
    };

    if (rows.length === 0) return <Empty icon={emptyIcon} title={emptyTitle} sub={emptySub} />;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-3 text-[11px] uppercase tracking-wider text-ink-500">
                            {columns.map(c => {
                                const active = sortKey === c.key;
                                return (
                                    <th key={c.key}
                                        className={`px-5 py-3 font-bold ${c.className || 'text-left'} ${c.sortValue ? 'cursor-pointer select-none hover:text-brand-ink' : ''}`}
                                        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                                        onClick={() => c.sortValue && toggleSort(c.key)}>
                                        <span className="inline-flex items-center gap-1">
                                            {c.label}
                                            {c.sortValue && (
                                                <span className="material-symbols-outlined" style={{ fontSize: 15, opacity: active ? 1 : 0.35 }}>
                                                    {active ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                                                </span>
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {shown.map((row, i) => (
                            <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}
                                className={`border-t border-line/20 transition-colors ${onRowClick ? 'hover:bg-canvas cursor-pointer' : ''} ${striped && i % 2 === 1 ? 'bg-canvas/60' : ''}`}>
                                {columns.map(c => (
                                    <td key={c.key} className={`px-5 py-3 ${c.className || ''}`}>{c.render(row)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-5 py-3 border-t border-line/20 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-ink-500">
                    {footer ? footer(shown.length, sorted.length) : `${safePage * pageSize + 1}–${safePage * pageSize + shown.length} de ${sorted.length}`}
                </p>
                {pageCount > 1 && (
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
                            className="px-2.5 py-1.5 rounded-lg border border-line text-xs font-bold text-ink-700 hover:border-brand/60 hover:text-brand-ink disabled:opacity-40 disabled:pointer-events-none transition-all">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                        </button>
                        <span className="text-xs font-bold text-ink-700 px-1">Pág. {safePage + 1} / {pageCount}</span>
                        <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}
                            className="px-2.5 py-1.5 rounded-lg border border-line text-xs font-bold text-ink-700 hover:border-brand/60 hover:text-brand-ink disabled:opacity-40 disabled:pointer-events-none transition-all">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
