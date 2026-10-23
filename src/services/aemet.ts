import axios from 'axios';
import type { WeatherAlert, CapInfo, AemetApiResponse, NationalPrediction } from '../types';

const API_KEY = import.meta.env.VITE_AEMET_API_KEY;
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ─── Tipos de Supabase ───────────────────────────────────────────────────────
interface SupabaseWeatherAlert {
    id: string;
    aemet_id: string;
    event: string;
    severity: string;
    area_desc: string;
    expires: string;
    effective: string | null;
    sent: string;
    headline: string | null;
    description: string | null;
    instruction: string | null;
    raw_json: {
        language?: string;
        polygon?: string | string[] | null;
        polygons?: string[];
        [key: string]: unknown;
    } | null;
}

// Mapea una fila de Supabase al tipo WeatherAlert que usa la UI
const mapDbAlertToWeatherAlert = (row: SupabaseWeatherAlert): WeatherAlert => {
    const rawJson = row.raw_json || {};
    
    // Obtenemos los polígonos de raw_json
    let polygonData: string | string[] | null = null;
    if (rawJson.polygon) {
        polygonData = rawJson.polygon;
    } else if (rawJson.polygons && rawJson.polygons.length > 0) {
        polygonData = rawJson.polygons;
    }

    // Normaliza la severidad AEMET → clave interna de la app
    let severity: WeatherAlert['severity'] = 'unknown';
    switch (row.severity?.toLowerCase()) {
        case 'extreme': severity = 'red'; break;
        case 'severe':  severity = 'orange'; break;
        case 'moderate': severity = 'yellow'; break;
        case 'minor':   severity = 'green'; break;
    }

    // El mapa espera que raw.area sea un objeto o un array de objetos con la propiedad 'polygon'
    // Si hay múltiples polígonos (Array de strings), creamos un array de áreas
    const areaData = Array.isArray(polygonData)
        ? polygonData.map(p => ({ areaDesc: row.area_desc || '', polygon: p }))
        : { areaDesc: row.area_desc || '', polygon: polygonData || '' };

    return {
        id: row.aemet_id || row.id,
        sent: row.sent,
        event: row.event || 'Desconocido',
        severity,
        headline: row.headline || '',
        description: row.description || '',
        instruction: row.instruction || '',
        area: row.area_desc || '',
        expires: row.expires || '',
        language: rawJson.language || 'es-ES',
        raw: {
            area: areaData
        } as unknown as CapInfo,
    };
};

// ─── getAlerts: lee desde la API del Worker (evita problemas de RLS de Supabase) ─
export const getAlerts = async (): Promise<WeatherAlert[]> => {
    if (USE_MOCK) {
        console.log("Using Mock Data");
        return getMockAlerts();
    }

    try {
        const response = await axios.get<{ success: boolean; alerts: SupabaseWeatherAlert[] }>(
            'https://aemet-supabase-service.alertasmeteo.workers.dev/api/alerts'
        );

        // Lanza en vez de devolver []: el llamante debe distinguir
        // "no hay alertas" de "no se pudo consultar" (fallback a caché offline)
        if (!response.data.success || !response.data.alerts) {
            throw new Error('El servidor de alertas devolvió una respuesta inválida');
        }

        return response.data.alerts.map(mapDbAlertToWeatherAlert);
    } catch (error) {
        console.error("Failed to fetch alerts:", error);
        throw error;
    }
};



export const getNationalPrediction = async (): Promise<NationalPrediction | null> => {
    if (USE_MOCK) {
        return getMockNationalPrediction();
    }

    try {
        const initResponse = await axios.get<AemetApiResponse>(
            'https://opendata.aemet.es/opendata/api/prediccion/nacional/hoy',
            {
                params: { api_key: API_KEY },
                headers: { 'Accept': 'application/json' }
            }
        );

        if (initResponse.data.estado !== 200) {
            throw new Error(`AEMET API Error: ${initResponse.data.descripcion}`);
        }

        const textResponse = await axios.get(initResponse.data.datos, {
            responseType: 'text',
            headers: { 'Accept': 'text/plain; charset=iso-8859-15' }
        });

        return parseNationalPrediction(textResponse.data);

    } catch (error) {
        console.error("Failed to fetch national prediction:", error);
        return null;
    }
};

const parseNationalPrediction = (text: string): NationalPrediction => {
    // Basic parser for AEMET text prediction
    let elaborated = "";
    let validity = "";
    let significantPhenomena = "";
    let generalPrediction = "";
    let temperatures = "";
    let wind = "";

    // The first lines usually contain the title and date
    const lines = text.split('\n').map(l => l.trim());
    const dateLine = lines.find(l => l.includes('DÍA'));
    if (dateLine) elaborated = dateLine;

    const validLine = lines.find(l => l.includes('VÁLIDA'));
    if (validLine) validity = validLine;

    // A.- FENÓMENOS SIGNIFICATIVOS
    const sigIdx = text.indexOf('A.- FENÓMENOS SIGNIFICATIVOS');
    const predIdx = text.indexOf('B.- PREDICCIÓN');

    if (sigIdx !== -1 && predIdx !== -1) {
        significantPhenomena = text.substring(sigIdx + 28, predIdx).trim();
    }

    // B.- PREDICCIÓN (Contains general, then maybe sub-sections like temperatures/wind)
    if (predIdx !== -1) {
        const predText = text.substring(predIdx + 14).trim();
        const tempIdx = predText.indexOf('Temperaturas');
        const windIdx = predText.indexOf('Soplará viento');

        if (tempIdx !== -1) {
            generalPrediction = predText.substring(0, tempIdx).trim();
            if (windIdx !== -1) {
                temperatures = predText.substring(tempIdx, windIdx).trim();
                wind = predText.substring(windIdx).trim();
            } else {
                temperatures = predText.substring(tempIdx).trim();
            }
        } else {
            generalPrediction = predText;
        }
    }

    return {
        id: `national-${Date.now()}`,
        elaborated,
        validity,
        significantPhenomena,
        generalPrediction,
        temperatures,
        wind
    };
};

const getMockNationalPrediction = (): Promise<NationalPrediction> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: "mock-national",
                elaborated: "DÍA 04 DE MARZO DE 2026 A LAS 08:35 HORA OFICIAL",
                validity: "PREDICCIÓN VÁLIDA PARA EL MIÉRCOLES 4",
                significantPhenomena: "Chubascos y tormentas con probabilidad de ser fuertes en regiones de Andalucía, Castilla-La Mancha y Madrid...",
                generalPrediction: "Situación de inestabilidad en la mayor parte del país debido a una dana situada sobre Marruecos...",
                temperatures: "Temperaturas máximas en descenso en la mitad sur peninsular, notable en regiones de Andalucía...",
                wind: "Soplará viento de componente norte con intervalos de fuerte en Canarias..."
            });
        }, 800);
    });
};

const getMockAlerts = (): Promise<WeatherAlert[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: "mock-1",
                    sent: new Date().toISOString(),
                    event: "Lluvias y Tormentas",
                    severity: "orange",
                    headline: "Aviso naranja por lluvias intensas",
                    description: "Se esperan precipitaciones acumuladas de 40mm en 1 hora.",
                    instruction: "Evite desplazamientos innecesarios.",
                    area: "Sierra de Madrid, Area Metropolitana",
                    expires: new Date(Date.now() + 3600000 * 4).toISOString(),
                    language: 'es',
                    raw: {
                        area: {
                            areaDesc: "Sierra de Madrid",
                            polygon: "40.8,-4.1 41.0,-3.8 40.9,-3.5 40.7,-3.8 40.8,-4.1"
                        }
                    } as unknown as CapInfo
                },
                // Mock 1 duplicated in English
                {
                    id: "mock-1-en",
                    sent: new Date().toISOString(),
                    event: "Rain and Storms",
                    severity: "orange",
                    headline: "Orange warning for heavy rain",
                    description: "Accumulated precipitation of 40mm in 1 hour expected.",
                    instruction: "Avoid unnecessary travel.",
                    area: "Sierra de Madrid, Metropolitan Area",
                    expires: new Date(Date.now() + 3600000 * 4).toISOString(),
                    language: 'en',
                    raw: {
                        area: {
                            areaDesc: "Sierra de Madrid",
                            polygon: "40.8,-4.1 41.0,-3.8 40.9,-3.5 40.7,-3.8 40.8,-4.1"
                        }
                    } as unknown as CapInfo
                },
                {
                    id: "mock-2",
                    sent: new Date().toISOString(),
                    event: "Viento",
                    severity: "yellow",
                    headline: "Rachas de viento fuerte",
                    description: "Rachas máximas de 80 km/h.",
                    instruction: "Precaución con objetos que puedan desprenderse.",
                    area: "Costa de Galicia",
                    expires: new Date(Date.now() + 3600000 * 8).toISOString(),
                    language: 'es',
                    raw: {
                        area: {
                            areaDesc: "Costa de Galicia",
                            polygon: "43.5,-8.5 43.8,-8.0 43.6,-7.5 43.2,-8.0 43.5,-8.5"
                        }
                    } as unknown as CapInfo
                },
                {
                    id: "mock-3",
                    sent: new Date().toISOString(),
                    event: "Nevadas",
                    severity: "red",
                    headline: "Aviso rojo por nevadas copiosas",
                    description: "Espesores de mas de 50cm en cotas altas",
                    instruction: "Cadenas obligatorias. Carreteras cortadas.",
                    area: "Pirineo Oscense",
                    expires: new Date(Date.now() + 3600000 * 12).toISOString(),
                    language: 'es',
                    raw: {
                        area: {
                            areaDesc: "Pirineo Oscense",
                            polygon: "42.6,-0.5 42.8,0.2 42.6,0.8 42.4,0.1 42.6,-0.5"
                        }
                    } as unknown as CapInfo
                }
            ]);
        }, 1000);
    });
};
