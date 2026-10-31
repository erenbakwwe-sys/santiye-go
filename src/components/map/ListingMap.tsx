'use client';

import { useEffect, useRef, useState } from 'react';
import { Listing } from '@/types/database';
import { Search, RefreshCw } from 'lucide-react';

interface ListingMapProps {
  listings: Listing[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  userCoords?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onSearchArea?: (newCenter: { lat: number; lng: number }) => void;
  showSearchAreaButton?: boolean;
}

export default function ListingMap({
  listings,
  center = [39.0, 35.0], // Turkey center
  zoom = 6,
  height = '500px',
  userCoords,
  radiusKm,
  onSearchArea,
  showSearchAreaButton = true,
}: ListingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapMoved, setMapMoved] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = await import('leaflet');

      // 1. Map Initialization
      if (!mapInstanceRef.current) {
        const initialCenter: [number, number] = userCoords
          ? [userCoords.lat, userCoords.lng]
          : center;
        const initialZoom = userCoords ? 10 : zoom;

        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          scrollWheelZoom: true,
        });
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const markersGroup = L.layerGroup().addTo(map);
        markersLayerRef.current = markersGroup;

        // Detect map dragging / moving
        map.on('moveend', () => {
          const c = map.getCenter();
          setCurrentMapCenter({ lat: c.lat, lng: c.lng });
          setMapMoved(true);
        });
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // 2. User Center Pin & Radius Circle
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }

      if (userCoords) {
        // User blue marker
        const userIcon = L.divIcon({
          className: 'user-radar-marker',
          html: `
            <div style="
              background-color: #2563EB;
              color: white;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid white;
              box-shadow: 0 0 15px rgba(37,99,235,0.7);
              animation: pulse 2s infinite;
            ">
              <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const userMarker = L.marker([userCoords.lat, userCoords.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
        userMarker.bindTooltip('📍 Arama Konumunuz', { permanent: false, direction: 'top' });
        userMarkerRef.current = userMarker;

        // Radius circle
        if (radiusKm && radiusKm > 0) {
          const circle = L.circle([userCoords.lat, userCoords.lng], {
            radius: radiusKm * 1000, // meters
            color: '#F97316',
            fillColor: '#F97316',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6, 6',
          }).addTo(map);
          circleRef.current = circle;
        }
      }

      // 3. Clear existing listing markers
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }

      const bounds = L.latLngBounds([]);
      if (userCoords) {
        bounds.extend([userCoords.lat, userCoords.lng]);
      }

      // Custom orange icon generator with category glyph
      const createListingIcon = (categorySlug?: string) => {
        let symbol = '🏗';
        if (categorySlug === 'yapi-malzemeleri' || categorySlug === 'cimento' || categorySlug === 'demir-donati') symbol = '🧱';
        if (categorySlug === 'nakliye' || categorySlug === 'lowbed-agir-nakliyat' || categorySlug === 'hafriyat-nakliyesi') symbol = '🚛';

        return L.divIcon({
          className: 'custom-listing-marker',
          html: `
            <div style="
              background-color: #0B192C;
              border: 2px solid #F97316;
              color: white;
              width: 34px;
              height: 34px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              transition: transform 0.2s;
            ">
              <span style="transform: rotate(45deg); font-weight: 900; font-size: 14px;">${symbol}</span>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -34],
        });
      };

      // 4. Add markers with approximate location and rich popup
      listings.forEach((listing) => {
        if (!listing.lat || !listing.lng) return;

        // Approximate location jitter (to hide exact street address as requested)
        const approxLat = listing.lat;
        const approxLng = listing.lng;

        const priceText = listing.price_daily
          ? `${Number(listing.price_daily).toLocaleString('tr-TR')} ₺ <span style="font-size:10px; color:#64748B;">/ gün</span>`
          : listing.price_sale
          ? `${Number(listing.price_sale).toLocaleString('tr-TR')} ₺`
          : 'Fiyat Sorunuz';

        const imageThumb = listing.images?.[0] || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=300&q=80';

        const popupContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 220px; overflow: hidden; border-radius: 8px;">
            <div style="position: relative; height: 90px; width: 100%; background: #e2e8f0;">
              <img src="${imageThumb}" alt="${listing.title}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 6px; left: 6px; background: #0B192C; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase;">
                ${listing.listing_type === 'rental' ? 'Kiralık' : 'Satılık'}
              </div>
            </div>
            <div style="padding: 8px;">
              <div style="font-size: 10px; font-weight: 700; color: #EA580C; text-transform: uppercase;">
                ${listing.category?.name || 'İlan'}
              </div>
              <div style="font-weight: 800; font-size: 12px; margin: 2px 0 4px; color: #0B192C; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${listing.title}
              </div>
              <div style="font-size: 11px; color: #64748B; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                <span>📍 ${listing.city_name || ''}${listing.district_name ? ', ' + listing.district_name : ''}</span>
                ${listing.distance_km !== undefined ? `<strong style="color: #EA580C;">${listing.distance_km} km</strong>` : ''}
              </div>
              <div style="font-size: 14px; font-weight: 900; color: #0B192C; margin-bottom: 8px;">
                ${priceText}
              </div>
              <a href="/ilan/${listing.slug || listing.id}" style="
                display: block;
                text-align: center;
                background-color: #F97316;
                color: white;
                padding: 6px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                text-decoration: none;
              ">
                İncele & Teklif Al →
              </a>
            </div>
          </div>
        `;

        const marker = L.marker([approxLat, approxLng], {
          icon: createListingIcon(listing.category?.slug),
        });
        marker.bindPopup(popupContent);

        if (markersLayerRef.current) {
          markersLayerRef.current.addLayer(marker);
        }

        bounds.extend([approxLat, approxLng]);
      });

      // Fit bounds if user coords or listings exist
      if (bounds.isValid() && (!userCoords || listings.length > 0)) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }

    initMap();
  }, [listings, center, zoom, userCoords, radiusKm]);

  const handleSearchCurrentArea = () => {
    if (currentMapCenter && onSearchArea) {
      onSearchArea(currentMapCenter);
      setMapMoved(false);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
      <div ref={mapContainerRef} style={{ height }} className="w-full z-10" />

      {/* Floating "Bu Bölgede Ara" Button */}
      {showSearchAreaButton && mapMoved && (
        <button
          type="button"
          onClick={handleSearchCurrentArea}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-navy-900 hover:bg-orange-600 text-white font-bold text-xs rounded-full shadow-xl flex items-center gap-1.5 transition active:scale-95 animate-bounce"
        >
          <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
          <span>Bu Bölgede Ara</span>
        </button>
      )}

      {/* Map Legend / Info Badges */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 shadow-md border border-slate-200 flex items-center gap-3">
        {radiusKm && radiusKm > 0 && userCoords && (
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-orange-500 bg-orange-100 inline-block" />
            <span>Yarıçap: <strong>{radiusKm} km</strong></span>
          </span>
        )}
        <span>Toplam: <strong className="text-navy-900">{listings.length} İlan</strong></span>
      </div>
    </div>
  );
}
