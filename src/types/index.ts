export interface AemetApiResponse {
    descripcion: string;
    estado: number;
    datos: string;
    metadatos: string;
}

export interface CapAlert {
    identifier: string;
    sender: string;
    sent: string;
    status: string;
    msgType: string;
    scope: string;
    code: string[];
    info: CapInfo | CapInfo[];
}

export interface CapInfo {
    language: string;
    category: string;
    event: string;
    urgency: string;
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
    certainty: string;
    effective?: string;
    onset?: string;
    expires?: string;
    senderName: string;
    headline: string;
    description: string;
    instruction?: string;
    area: CapArea | CapArea[];
}

export interface CapArea {
    areaDesc: string;
    polygon?: string;
    geocode?: CapGeocode | CapGeocode[];
}

export interface CapGeocode {
    valueName: string;
    value: string;
}

// Internal cleaner interface for UI
export interface WeatherAlert {
    id: string;
    sent: string;
    event: string;
    severity: 'red' | 'orange' | 'yellow' | 'green' | 'unknown';
    headline: string;
    description: string;
    instruction: string;
    area: string;
    expires: string;
    language: string;
    raw: CapInfo; // Keep original for reference
}
