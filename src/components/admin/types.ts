import type { HealthState } from '../AdminWidgets';

/* ══════════════ TIPOS DEL PANEL DE ADMINISTRACIÓN ══════════════ */

export interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    postalCode: string | null;
    language: string | null;
    isVerified: boolean;
    createdAt: string;
    preferredSeverities: string[];
    preferredEventTypes: string[];
}

export interface AdminStats { total: number; verified: number; withPostalCode: number }

export interface WorkerUser { id: string; email: string; phone?: string; daily_forecast?: boolean }

export interface WeatherAlert {
    id: string;
    aemet_id?: string;
    event: string;
    severity: string;
    area_desc: string;
    headline?: string;
    description?: string;
    instruction?: string;
    status?: string;
    created_at?: string;
    effective?: string;
    expires?: string;
}

export interface NotifLog {
    id: string;
    type: string;
    recipient?: string;
    alert_id?: string | null;
    created_at: string;
    users?: { name?: string; email?: string } | null;
}

export interface PostalMapping { postal_code: string; aemet_zone_name: string; province: string }

export interface WStats { extreme: number; severe: number; moderate: number; minor: number; total: number }
export interface LStats { email: number; telegram: number; push: number; total: number }

export interface AuditEntry { t: string; who: string; what: string; payload?: string }

export interface ServiceHealth {
    id: string;
    label: string;
    desc: string;
    icon: string;
    color: string;
    last: Date | null;
    state: HealthState;
    hint: string;
    test?: { id: string; path: string; confirm?: string };
}

export interface CoverageInfo {
    pct: number;
    total: number;
    unmapped: { alert: WeatherAlert; missing: string[] }[];
    invalid: PostalMapping[];
    duplicates: string[];
}

export type Tab = 'panel' | 'alertas' | 'notificaciones' | 'usuarios' | 'codigos' | 'mapa' | 'config' | 'tests';

export const TOKEN_KEY = 'meteoalerta-admin-token';
export const ADMIN_USER_KEY = 'meteoalerta-admin-user';
export const TOTAL_POSTAL_PAGES = 38;

/* Una zona + sus códigos postales, usado por el preview de destinatarios (A1) */
export interface ZoneCoverage {
    zone: string;
    postalCodes: string[];
    province: string;
}
