import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
// @ts-expect-error - js-untar types not available
import untar from 'js-untar';
import type { WeatherAlert, CapAlert, CapInfo, AemetApiResponse } from '../types';

const API_KEY = import.meta.env.VITE_AEMET_API_KEY;
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !API_KEY;

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

export const getAlerts = async (): Promise<WeatherAlert[]> => {
    if (USE_MOCK) {
        console.log("Using Mock Data");
        return getMockAlerts();
    }

    try {
        const initResponse = await axios.get<AemetApiResponse>(
            'https://opendata.aemet.es/opendata/api/avisos_cap/ultimoelaborado/area/esp',
            {
                params: { api_key: API_KEY },
                headers: { 'Accept': 'application/json' }
            }
        );

        if (initResponse.data.estado !== 200) {
            throw new Error(`AEMET API Error: ${initResponse.data.descripcion}`);
        }

        const capResponse = await axios.get(initResponse.data.datos, {
            responseType: 'arraybuffer'
        });

        if (!untar) {
            throw new Error("Library js-untar failed to load");
        }

        const files = await untar(capResponse.data);
        let allAlerts: WeatherAlert[] = [];

        for (const file of files) {
            if (!file.name.endsWith('.xml')) continue;

            let xmlContent = "";
            const decoder = new TextDecoder("utf-8");

            if (file.buffer) {
                xmlContent = decoder.decode(file.buffer);
            } else if (file.readAsString) {
                // As fallback, but try to fix encoding if possible
                xmlContent = file.readAsString();
            } else {
                continue;
            }

            const jsonObj = parser.parse(xmlContent);
            const alertRoot = jsonObj.alert;
            const fileAlerts = parseCapToAlerts(alertRoot);
            allAlerts = [...allAlerts, ...fileAlerts];
        }

        return allAlerts;

    } catch (error) {
        console.error("Failed to fetch alerts:", error);
        return [];
    }
};

const parseCapToAlerts = (cap: CapAlert): WeatherAlert[] => {
    if (!cap || !cap.info) return [];

    const infos = Array.isArray(cap.info) ? cap.info : [cap.info];

    return infos.map(info => {
        let severityColor: WeatherAlert['severity'] = 'unknown';
        switch (info.severity) {
            case 'Extreme': severityColor = 'red'; break;
            case 'Severe': severityColor = 'orange'; break;
            case 'Moderate': severityColor = 'yellow'; break;
            case 'Minor': severityColor = 'green'; break;
            default: severityColor = 'unknown';
        }

        const areas = Array.isArray(info.area) ? info.area : [info.area];
        const areaDesc = areas.map(a => a.areaDesc).join(', ');

        return {
            id: cap.identifier,
            sent: cap.sent,
            event: info.event || 'Desconocido',
            severity: severityColor,
            headline: info.headline,
            description: info.description,
            instruction: info.instruction || '',
            area: areaDesc,
            expires: info.expires || '',
            language: info.language || 'es', // Capture language
            raw: info
        };
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
