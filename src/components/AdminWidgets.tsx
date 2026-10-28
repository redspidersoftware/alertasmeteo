/* ══════════════ TIPOS ══════════════ */

export type HealthState = 'ok' | 'warn' | 'down' | 'unknown';

export interface BarPoint { label: string; value: number }

/* ══════════════ HEALTH BADGE ══════════════ */

const HEALTH_META: Record<HealthState, { dot: string; fg: string; label: string }> = {
    ok: { dot: '#16a34a', fg: '#15803d', label: 'OK' },
    warn: { dot: '#f59e0b', fg: '#b45309', label: 'Atrasado' },
    down: { dot: '#dc2626', fg: '#b91c1c', label: 'Caído' },
    unknown: { dot: '#9ca3af', fg: '#6b7280', label: 'Sin dato' },
};

export const HealthBadge = ({ state, text }: { state: HealthState; text?: string }) => {
    const m = HEALTH_META[state];
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide"
            style={{ background: `${m.dot}18`, color: m.fg }} role="status">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.dot, boxShadow: state === 'down' ? `0 0 0 3px ${m.dot}30` : 'none' }} />
            {text || m.label}
        </span>
    );
};

/* ══════════════ SPARKLINE ══════════════ */

export const SparkLine = ({ data, color = '#003f87', height = 34 }: { data: number[]; color?: string; height?: number }) => {
    if (data.length < 2 || data.every(v => v === 0)) return null;
    const w = 100;
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = height - 3 - (v / max) * (height - 8);
        return [x, y] as const;
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const area = `${line} L${w},${height} L0,${height} Z`;
    const last = pts[pts.length - 1];
    return (
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full block" style={{ height }}
            aria-hidden="true" focusable="false">
            <path d={area} fill={color} opacity={0.12} />
            <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

/* ══════════════ BARRAS (divs, sin dependencias) ══════════════ */

export const BarChart = ({ data, color = '#003f87', height = 110, empty = 'Sin datos en el periodo' }: {
    data: BarPoint[]; color?: string; height?: number; empty?: string;
}) => {
    if (data.length === 0 || data.every(d => d.value === 0)) {
        return (
            <div className="flex items-center justify-center text-[11px] text-[#727784]" style={{ height }}>
                {empty}
            </div>
        );
    }
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div>
            <div className="flex items-end gap-[3px] w-full" style={{ height }} role="img"
                aria-label={`Gráfico de barras, máximo ${max}`}>
                {data.map((d, i) => {
                    const h = Math.max(3, Math.round((d.value / max) * height));
                    const isLast = i === data.length - 1;
                    return (
                        <div key={`${d.label}-${i}`} title={`${d.label}: ${d.value}`}
                            className="flex-1 min-w-0 rounded-t-[3px] transition-all hover:opacity-80"
                            style={{
                                height: h,
                                background: color,
                                opacity: isLast ? 1 : 0.62,
                                boxShadow: isLast ? `0 0 0 1.5px ${color}` : 'none',
                                outline: isLast ? '1px solid #fff' : 'none',
                                outlineOffset: '-3px',
                            }} />
                    );
                })}
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] font-bold uppercase tracking-wide text-[#727784]">
                <span>{data[0].label}</span>
                <span>{data[data.length - 1].label}</span>
            </div>
        </div>
    );
};
