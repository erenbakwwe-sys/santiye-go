'use client';

import { useEffect, useRef } from 'react';

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  height?: string;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
  height = '320px',
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = await import('leaflet');

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: 'picker-marker',
          html: `
            <div style="
              background-color: #EA580C;
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            ">
              <span style="transform: rotate(45deg); font-weight: 900; font-size: 14px;">📍</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([lat, lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onChange({ lat: position.lat, lng: position.lng });
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      } else {
        // Update view if lat/lng changed from outside
        mapInstanceRef.current.setView([lat, lng], 13);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      }
    }

    initMap();

    return () => {
      // Keep instance or destroy on unmount
    };
  }, [lat, lng, onChange]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Haritada Konumu İşaretleyin</span>
        <span>
          Enlem: {lat.toFixed(4)}, Boylam: {lng.toFixed(4)}
        </span>
      </div>
      <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner">
        <div ref={mapContainerRef} style={{ height }} className="w-full z-10" />
      </div>
      <p className="text-[11px] text-slate-500">
        * Pini sürükleyerek veya haritada tıklayarak şantiye/depo tam konumunu belirleyebilirsiniz.
      </p>
    </div>
  );
}
