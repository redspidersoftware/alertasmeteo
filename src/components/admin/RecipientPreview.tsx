import { useMemo } from 'react';
import type { AdminUser, PostalMapping, WeatherAlert } from './types';
import { alertZoneKeys, normalizeZone, sev, appSeverityToAemet } from './helpers';

/* ══════════════ A1 · PREVIEW DE DESTINATARIOS ══════════════ */
/**
 * Dada una alerta activa, muestra las zonas AEMET que toca, los códigos
 * postales mapeados a esas zonas y los usuarios que recibirían la
 * notificación (agrupados por canal). Responde de un vistazo a
 * "¿quién recibe esta alerta?" y a "¿hay algún hueco en el mapeo?".
 */

interface Props {
    alert: WeatherAlert;
    postal: PostalMapping[];
    users: AdminUser[];
    loadingPostal?: boolean;
    onMapCp?: (zone: string) => void;
}

interface ZoneGroup {
    zone: string;
    zoneLabel: string;
    cps: string[];
    users: AdminUser[];
}

export const RecipientPreview = ({ alert, postal, users, loadingPostal, onMapCp }: Props) => {
    const aemetSeverity = appSeverityToAemet(alert.severity);

    const groups = useMemo<ZoneGroup[]>(() => {
        const keys = alertZoneKeys(alert.area_desc);
        if (keys.length === 0) return [];

        // Zona normalizada → CPs asignados
        const cpsByZone = new Map<string, Set<string>>();
        const labelByZone = new Map<string, string>();
        const provinceByZone = new Map<string, string>();
        for (const p of postal) {
            const k = normalizeZone(p.aemet_zone_name);
            if (!k || !p.postal_code) continue;
            if (!cpsByZone.has(k)) cpsByZone.set(k, new Set());
            cpsByZone.get(k)!.add(p.postal_code);
            if (!labelByZone.has(k)) labelByZone.set(k, p.aemet_zone_name);
            if (!provinceByZone.has(k) && p.province) provinceByZone.set(k, p.province);
        }

        // CP → usuario (prioriza el primer usuario con ese CP)
        const usersByCp = new Map<string, AdminUser[]>();
        for (const u of users) {
            const cp = (u.postalCode || '').trim();
            if (!cp) continue;
            if (!usersByCp.has(cp)) usersByCp.set(cp, []);
            usersByCp.get(cp)!.push(u);
        }

        return keys.map(k => {
            const cps = [...(cpsByZone.get(k) || [])].sort();
            const zoneUsers = cps.flatMap(cp => usersByCp.get(cp) || []);
            return {
                zone: k,
                zoneLabel: labelByZone.get(k) || k,
                cps,
                users: zoneUsers,
            };
        });
    }, [alert, postal, users]);

    const totalCps = groups.reduce((n, g) => n + g.cps.length, 0);
    const totalUsers = new Set(groups.flatMap(g => g.users.map(u => u.id))).size;
    const uncovered = groups.filter(g => g.cps.length === 0);
    const s = sev(aemetSeverity);

    if (postal.length === 0) {
        return (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>hourglass_empty</span>
                {loadingPostal ? 'Cargando la base de códigos postales…' : 'Carga la base de códigos postales para ver los destinatarios.'}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-canvas border border-line/30">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Zonas tocadas</p>
                    <p className="text-xl font-extrabold text-ink mt-0.5">{groups.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-line/30">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">CP mapeados</p>
                    <p className="text-xl font-extrabold text-ink mt-0.5">{totalCps}</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-line/30">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Usuarios</p>
                    <p className="text-xl font-extrabold text-ink mt-0.5">{totalUsers}</p>
                </div>
            </div>

            {/* Huecos de cobertura */}
            {uncovered.length > 0 && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs font-extrabold text-[#b3261e] flex items-center gap-1.5">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                        {uncovered.length} zona{uncovered.length > 1 ? 's' : ''} sin ningún código postal
                    </p>
                    <p className="text-[11px] text-red-700 mt-1">Nadie recibiría esta alerta en: {uncovered.map(g => g.zoneLabel).join(' · ')}</p>
                    {onMapCp && (
                        <button onClick={() => onMapCp(uncovered[0].zoneLabel)}
                            className={`${'inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-surface border border-red-200 text-[#b3261e] hover:bg-red-100 transition-all active:scale-[.97]'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_location</span>Mapear zona
                        </button>
                    )}
                </div>
            )}

            {/* Detalle por zona */}
            <div className="flex flex-col gap-2">
                {groups.map(g => (
                    <div key={g.zone} className="p-3 rounded-xl border border-line/30 bg-canvas">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: s.fg }}>{s.icon}</span>
                            </span>
                            <p className="text-xs font-extrabold text-ink flex-1 min-w-0 truncate">{g.zoneLabel}</p>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${g.cps.length === 0 ? 'bg-red-100 text-[#b3261e]' : 'bg-surface-2 text-ink-700'}`}>
                                {g.cps.length} CP
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand-ink">
                                {new Set(g.users.map(u => u.id)).size} usuario{g.users.length === 1 ? '' : 's'}
                            </span>
                        </div>
                        {g.cps.length > 0 && (
                            <p className="text-[11px] text-ink-500 mt-1.5 font-mono truncate" title={g.cps.join(', ')}>
                                {g.cps.slice(0, 8).join(' · ')}{g.cps.length > 8 ? ` … +${g.cps.length - 8}` : ''}
                            </p>
                        )}
                        {g.users.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {g.users.slice(0, 6).map(u => (
                                    <span key={u.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-ink-700 truncate max-w-[160px]">
                                        {u.name || u.email}
                                    </span>
                                ))}
                                {g.users.length > 6 && (
                                    <span className="text-[11px] font-bold text-ink-500 px-1">+{g.users.length - 6}</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
