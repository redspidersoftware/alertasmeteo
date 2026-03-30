import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import type { WeatherAlert, CapArea } from '../types';
import 'leaflet/dist/leaflet.css';


interface MapViewProps {
    alerts: WeatherAlert[];
}

const severityColorsMap: Record<string, string> = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    unknown: '#9ca3af'
};

const severityOrder = {
    'green': 1,
    'yellow': 2,
    'orange': 3,
    'red': 4,
    'unknown': 0
};

const parsePolygon = (polygonStr: string): LatLngTuple[] => {
    try {
        if (!polygonStr) return [];
        const coords = polygonStr.trim().split(' ');
        if (coords.length < 3) return []; // Need at least 3 points for a polygon

        return coords.map(coord => {
            const parts = coord.split(',');
            if (parts.length < 2) return [0, 0];
            // AEMET CAP format uses lat,lon — Leaflet needs [lat, lon]
            const [lat, lon] = parts.map(Number);
            if (isNaN(lat) || isNaN(lon)) return [0, 0];
            return [lat, lon] as LatLngTuple;
        }).filter(p => p[0] !== 0 || p[1] !== 0) as LatLngTuple[];
    } catch (e) {
        console.warn("Failed to parse polygon:", polygonStr, e);
        return [];
    }
};

export const MapView = ({ alerts }: MapViewProps) => {
    // const { t } = useLanguage(); - removed because t is unused now
    // If you need it back later, uncomment or re-add it.
    // Actually, just remove it to satisfy lint.
    // useLanguage(); // just call it if side effects are needed, but here it's likely just for the title.


    if (!alerts) return null;

    // Filter alerts that have polygon data and then sort them
    const mapAlerts = alerts
        .filter(alert => {
            try {
                const rawInfo = alert.raw;
                if (!rawInfo || !rawInfo.area) return false;
                const areas = Array.isArray(rawInfo.area) ? rawInfo.area : [rawInfo.area];
                return areas.some(a => !!a.polygon);
            } catch {
                return false;
            }
        })
        .sort((a, b) => {
            const orderA = severityOrder[a.severity] || 0;
            const orderB = severityOrder[b.severity] || 0;
            return orderA - orderB; // Draw low priority first, high priority last (on top)
        });

    return (
        <div className="h-full w-full relative z-0">
            <MapContainer
                center={[36.5, -6]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {mapAlerts.map(alert => {
                    const rawInfo = alert.raw;
                    const areas = (Array.isArray(rawInfo.area) ? rawInfo.area : [rawInfo.area]) as CapArea[];

                    return areas.map((area, idx) => {
                        if (!area.polygon) return null;
                        const positions = parsePolygon(area.polygon);
                        if (positions.length < 3) return null;

                        return (
                            <Polygon
                                key={`${alert.id}-${idx}`}
                                positions={positions}
                                pathOptions={{
                                    color: severityColorsMap[alert.severity] || severityColorsMap.unknown,
                                    fillColor: severityColorsMap[alert.severity] || severityColorsMap.unknown,
                                    fillOpacity: 0.6, // Increased opacity slightly for better visibility
                                    weight: 2
                                }}
                            >
                                <Popup className="text-slate-900">
                                    <strong>{alert.headline}</strong><br />
                                    {alert.description ? alert.description.substring(0, 100) : ''}...
                                </Popup>
                            </Polygon>
                        );
                    });
                })}
            </MapContainer>
        </div>
    );
};
