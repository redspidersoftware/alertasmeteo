import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngTuple } from 'leaflet';
import { geocodePostalCodes } from '../services/cpGeocode';
import type { CpCoords } from '../services/cpGeocode';
import 'leaflet/dist/leaflet.css';

/* ══════════════ TIPOS ══════════════ */

export interface MapAlert {
    id: string;
    aemet_id?: string;
    event: string;
    severity: string;
    area_desc?: string;
    headline?: string;
    effective?: string;
    expires?: string;
}

export interface MapPoint {
    postalCode: string;
    zone: string;
    province: string;
    alerts: MapAlert[];
}

interface AdminMapProps {
    points: MapPoint[];
    loading?: boolean;
}

/* ══════════════ ESTILOS ══════════════ */

const SEV_META: Record<string, { color: string; label: string; icon: string }> = {
    Extreme: { color: '#b3261e', label: 'Extrema', icon: 'crisis_alert' },
    Severe: { color: '#e65100', label: 'Severa', icon: 'warning' },
    Moderate: { color: '#f59e0b', label: 'Moderada', icon: 'error_outline' },
    Minor: { color: '#0277bd', label: 'Leve', icon: 'info_outline' },
};
const SEV_ORDER = ['Extreme', 'Severe', 'Moderate', 'Minor'];
const sevMeta = (s: string) => SEV_META[s] || { color: '#5f6368', label: s || 'Info', icon: 'help' };

const maxSeverity = (alerts: MapAlert[]): string =>
    SEV_ORDER.find(s => alerts.some(a => a.severity === s)) || 'Minor';

/* ══════════════ HELPERS ══════════════ */

const parseV = (v?: string): Date | null => {
    if (!v) return null;
    const s = String(v).trim();
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{1,2}))?$/);
    if (dmy) {
        const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), Number(dmy[4] || 0), Number(dmy[5] || 0)));
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

const fmtDT = (v?: string): string => {
    const d = parseV(v);
    return d ? d.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
};

const expiresSoon = (v?: string): boolean => {
    const d = parseV(v);
    return !!d && d.getTime() - Date.now() < 3 * 3600 * 1000;
};

const cpIcon = (color: string, active: boolean): L.DivIcon => L.divIcon({
    className: '',
    html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:${color};border:2.5px solid #fff;
        box-shadow:0 1px 5px rgba(0,0,0,.45);
        ${active ? 'outline:3px solid rgba(0,63,135,.55);outline-offset:2px;' : ''}
        transition:transform .12s ease;transform:${active ? 'scale(1.25)' : 'scale(1)'};">
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

/* ══════════════ FIT BOUNDS ══════════════ */

const FitBounds = ({ positions }: { positions: LatLngTuple[] }) => {
    const map = useMap();
    useEffect(() => {
        if (positions.length === 0) return;
        if (positions.length === 1) { map.setView(positions[0] as unknown as LatLngExpression, 11); return; }
        map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 11 });
    }, [map, positions]);
    return null;
};

/* ══════════════ COMPONENTE ══════════════ */

export const AdminMap = ({ points, loading }: AdminMapProps) => {
    const [coords, setCoords] = useState<Record<string, CpCoords>>({});
    const [geo, setGeo] = useState({ done: 0, total: 0, loading: false });
    const [selectedCp, setSelectedCp] = useState<string | null>(null);

    const withCoords = useMemo(() => points.filter(p => coords[p.postalCode]), [points, coords]);

    const positions = useMemo<LatLngTuple[]>(
        () => withCoords.map(p => [coords[p.postalCode].lat, coords[p.postalCode].lng] as LatLngTuple),
        [withCoords, coords],
    );

    const markerIcons = useMemo(() => {
        const map: Record<string, L.DivIcon> = {};
        for (const s of SEV_ORDER) {
            const c = sevMeta(s).color;
            map[`${c}-false`] = cpIcon(c, false);
            map[`${c}-true`] = cpIcon(c, true);
        }
        return map;
    }, []);

    useEffect(() => {
        const cps = points.map(p => p.postalCode);
        if (cps.length === 0) return undefined;
        const ctrl = new AbortController();
        let alive = true;
        const start = async () => {
            await Promise.resolve();
            if (!alive) return;
            setGeo({ done: 0, total: cps.length, loading: true });
            const res = await geocodePostalCodes(
                cps,
                (done, total) => { if (alive) setGeo({ done, total, loading: done < total }); },
                ctrl.signal,
            );
            if (alive) setCoords(res);
        };
        void start();
        return () => { alive = false; ctrl.abort(); };
    }, [points]);

    const selected = useMemo(
        () => withCoords.find(p => p.postalCode === selectedCp) || null,
        [withCoords, selectedCp],
    );

    const totalAlerts = useMemo(() => points.reduce((n, p) => n + p.alerts.length, 0), [points]);

    if (loading) {
        return (
            <section className="bg-white rounded-2xl border border-[#c2c6d4]/30 shadow-sm overflow-hidden">
                <div className="py-16 text-center">
                    <div className="w-7 h-7 border-2 border-[#003f87]/25 border-t-[#003f87] rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-semibold text-[#727784]">Cargando alertas activas y códigos postales...</p>
                </div>
            </section>
        );
    }

    if (points.length === 0) {
        return (
            <section className="bg-white rounded-2xl border border-[#c2c6d4]/30 shadow-sm overflow-hidden">
                <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#f1f4f9] flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-[#727784]" style={{ fontSize: 28 }}>map</span>
                    </div>
                    <p className="text-sm font-bold text-[#424752]">Sin alertas activas</p>
                    <p className="text-xs text-[#727784] mt-1">Ningún código postal tiene alertas meteorológicas activas ahora mismo</p>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-2xl border border-[#c2c6d4]/30 shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-[#c2c6d4]/30 flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 rounded-lg bg-[#d7e2ff] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#003f87]" style={{ fontSize: 20 }}>map</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-extrabold text-sm text-[#181c20] leading-tight">Mapa de alertas por código postal</h2>
                    <p className="text-[11px] text-[#727784] leading-tight mt-0.5">
                        {withCoords.length} de {points.length} CP localizados · {totalAlerts} alertas activas · pulsa un punto para ver sus alertas
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {SEV_ORDER.map(s => (
                        <span key={s} className="flex items-center gap-1.5 text-[10px] font-bold text-[#424752]">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: sevMeta(s).color }} />
                            {sevMeta(s).label}
                        </span>
                    ))}
                </div>
            </header>

            <div className="grid lg:grid-cols-[1fr_340px]">
                {/* Mapa */}
                <div className="relative h-[62vh] min-h-[400px] z-0">
                    <MapContainer
                        center={[40.2, -3.7]}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <FitBounds positions={positions} />
                        {withCoords.map(p => {
                            const c = coords[p.postalCode];
                            const color = sevMeta(maxSeverity(p.alerts)).color;
                            const active = selectedCp === p.postalCode;
                            return (
                                <Marker
                                    key={p.postalCode}
                                    position={[c.lat, c.lng]}
                                    icon={markerIcons[`${color}-${active}`] || markerIcons[`${color}-false`]}
                                    eventHandlers={{ click: () => setSelectedCp(p.postalCode) }}
                                >
                                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                        <span className="text-xs font-bold">{p.postalCode}</span>
                                        {' · '}
                                        <span>{p.alerts.length} alerta{p.alerts.length > 1 ? 's' : ''}</span>
                                    </Tooltip>
                                </Marker>
                            );
                        })}
                    </MapContainer>

                    {geo.loading && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-full shadow-lg border border-[#c2c6d4]/40 px-4 py-2 flex items-center gap-2.5">
                            <span className="w-4 h-4 border-2 border-[#003f87]/25 border-t-[#003f87] rounded-full animate-spin" />
                            <p className="text-[11px] font-bold text-[#424752]">Geocodificando CP {geo.done}/{geo.total}…</p>
                        </div>
                    )}
                </div>

                {/* Panel lateral */}
                <aside className="border-t lg:border-t-0 lg:border-l border-[#c2c6d4]/30 bg-[#f7f9ff] flex flex-col max-h-[62vh] min-h-[400px]">
                    {!selected ? (
                        <div className="flex-1 flex items-center justify-center p-6 text-center">
                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-white border border-[#c2c6d4]/40 flex items-center justify-center mx-auto mb-3">
                                    <span className="material-symbols-outlined text-[#727784]" style={{ fontSize: 26 }}>pin_drop</span>
                                </div>
                                <p className="text-sm font-bold text-[#424752]">Selecciona un punto</p>
                                <p className="text-xs text-[#727784] mt-1">Haz clic en un código postal del mapa para ver sus alertas activas</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-4 py-3.5 bg-white border-b border-[#c2c6d4]/30 flex items-start justify-between gap-2 sticky top-0 z-10">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-base font-extrabold text-[#181c20] font-mono">{selected.postalCode}</p>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#d7e2ff] text-[#003f87]">
                                            {selected.alerts.length} alerta{selected.alerts.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#727784] truncate">{selected.zone}{selected.province ? ` · ${selected.province}` : ''}</p>
                                </div>
                                <button onClick={() => setSelectedCp(null)} title="Cerrar"
                                    className="text-[#727784] hover:text-[#181c20] hover:bg-[#f1f4f9] rounded-lg p-1 transition-colors flex-shrink-0">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                                </button>
                            </div>
                            <div className="p-3 space-y-2">
                                {selected.alerts.map(a => {
                                    const s = sevMeta(a.severity);
                                    return (
                                        <div key={a.id} className="bg-white rounded-xl border border-[#c2c6d4]/30 shadow-sm p-3.5">
                                            <div className="flex items-start gap-2.5">
                                                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}22` }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 17, color: s.color }}>{s.icon}</span>
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-xs font-bold text-[#181c20] leading-tight">{a.event}</p>
                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: `${s.color}22`, color: s.color }}>{s.label}</span>
                                                    </div>
                                                    {a.headline && <p className="text-[11px] text-[#424752] mt-1 leading-snug line-clamp-2">{a.headline}</p>}
                                                    <p className={`text-[10px] font-bold mt-1.5 ${expiresSoon(a.expires) ? 'text-[#e65100]' : 'text-[#727784]'}`}>
                                                        {expiresSoon(a.expires) ? '⚡ ' : ''}Expira {fmtDT(a.expires)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
};
