import { useState } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Controles propios de los mapas (zoom + ubicación).
 * Deben vivir dentro de MapContainer para poder usar useMap() de react-leaflet.
 * Compartido por MapView (usuario) y AdminMap (administración).
 */
export const MapControls = () => {
    const map = useMap();
    const [locating, setLocating] = useState(false);

    const handleLocate = () => {
        if (locating) return;
        setLocating(true);
        map.locate({ setView: true, maxZoom: 11 });
        map.once('locationfound', () => setLocating(false));
        map.once('locationerror', () => setLocating(false));
    };

    const btnClass =
        'w-10 h-10 rounded-lg shadow-md bg-surface text-brand-ink flex items-center justify-center border border-line/30 hover:bg-brand-100/60 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

    return (
        <div className="absolute right-4 bottom-12 z-[1000] flex flex-col gap-2">
            <button type="button" className={btnClass} aria-label="Acercar mapa" onClick={() => map.zoomIn()}>
                <span className="material-symbols-outlined">add</span>
            </button>
            <button type="button" className={btnClass} aria-label="Alejar mapa" onClick={() => map.zoomOut()}>
                <span className="material-symbols-outlined">remove</span>
            </button>
            <button
                type="button"
                className={btnClass}
                aria-label="Mi ubicación"
                onClick={handleLocate}
                disabled={locating}
            >
                <span className={`material-symbols-outlined ${locating ? 'animate-pulse' : ''}`}>my_location</span>
            </button>
        </div>
    );
};
