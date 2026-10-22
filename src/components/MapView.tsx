import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import type { WeatherAlert, CapArea } from '../types';
import { AlertCard } from './AlertCard';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
    alerts: WeatherAlert[];
    onSelectAlert?: (alert: WeatherAlert) => void;
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

const parseSingleRing = (ringStr: string): LatLngTuple[] => {
    if (typeof ringStr !== 'string' || !ringStr.trim()) return [];
    const coords = ringStr.trim().split(' ');
    if (coords.length < 3) return [];
    const points = coords.map(coord => {
        const parts = coord.split(',');
        if (parts.length < 2) return null;
        const [lat, lon] = parts.map(Number);
        if (isNaN(lat) || isNaN(lon)) return null;
        return [lat, lon] as LatLngTuple;
    }).filter((p): p is LatLngTuple => p !== null && (p[0] !== 0 || p[1] !== 0));
    return points.length >= 3 ? points : [];
};

const parsePolygon = (polygonInput: string | string[]): LatLngTuple[] => {
    try {
        if (!polygonInput) return [];

        // AEMET CAP may return an array of rings — parse each and return the first valid one
        if (Array.isArray(polygonInput)) {
            for (const ring of polygonInput) {
                const points = parseSingleRing(ring);
                if (points.length >= 3) return points;
            }
            return [];
        }

        return parseSingleRing(polygonInput);
    } catch (e) {
        console.warn("Failed to parse polygon:", polygonInput, e);
        return [];
    }
};

export const MapView = ({ alerts, onSelectAlert }: MapViewProps) => {
    const [hoveredAlert, setHoveredAlert] = useState<WeatherAlert | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

    const handleMouseOver = (e: LeafletMouseEvent, alert: WeatherAlert) => {
        setHoveredAlert(alert);
        setMousePos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
    };

    const handleMouseOut = () => {
        setHoveredAlert(null);
    };

    const handleMouseMove = (e: LeafletMouseEvent) => {
        setMousePos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
    };

    return (
        <div className="h-full w-full relative z-0">
            <MapContainer
                center={[40.0, -3.5]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                                eventHandlers={{
                                    mouseover: (e) => handleMouseOver(e, alert),
                                    mouseout: handleMouseOut,
                                    mousemove: handleMouseMove,
                                    click: () => {
                                        if (onSelectAlert) {
                                            onSelectAlert(alert);
                                        }
                                    }
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

            {hoveredAlert && (
                <div
                    className="fixed pointer-events-none z-[9999]"
                    style={{
                        left: mousePos.x + 20,
                        top: mousePos.y + 20,
                        transform: mousePos.x + 320 > window.innerWidth ? 'translateX(-100%) translateX(-40px)' : 'none'
                    }}
                >
                    <AlertCard alert={hoveredAlert} isTooltip={true} />
                </div>
            )}
        </div>
    );
};
