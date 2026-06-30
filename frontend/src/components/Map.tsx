"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths in Next.js
const setupIconFix = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface MapMarker {
  lat: number;
  lng: number;
  label: string;
}

interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export default function Map({ 
  center, 
  zoom = 13, 
  markers = [], 
  onLocationSelect,
  interactive = true 
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    setupIconFix();

    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

      // Add dark themed map tiles to match website design aesthetics
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);

      // Create a layer group to hold markers so we can clear/add them dynamically
      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);

      // Handle click events for location selection
      if (interactive && onLocationSelect) {
        mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          
          // Clear previously selected custom marker
          if (selectedMarkerRef.current && markerGroupRef.current) {
            markerGroupRef.current.removeLayer(selectedMarkerRef.current);
          }

          // Add new selected location marker
          if (mapRef.current && markerGroupRef.current) {
            const redIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });

            selectedMarkerRef.current = L.marker([lat, lng], { icon: redIcon })
              .addTo(markerGroupRef.current)
              .bindPopup('Selected Location')
              .openPopup();
          }

          onLocationSelect(lat, lng);
        });
      }
    }

    return () => {
      // Cleanup map on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map viewport when center props change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center]);

  // Update markers when props change
  useEffect(() => {
    if (!mapRef.current || !markerGroupRef.current) return;

    // Clear all except the user-selected pin if present
    const userPin = selectedMarkerRef.current;
    markerGroupRef.current.clearLayers();
    
    if (userPin) {
      markerGroupRef.current.addLayer(userPin);
    }

    // Add list markers
    markers.forEach(m => {
      const marker = L.marker([m.lat, m.lng])
        .addTo(markerGroupRef.current!)
        .bindPopup(m.label);
      
      // Auto open popup for single markers
      if (markers.length === 1) {
        marker.openPopup();
      }
    });
  }, [markers]);

  return (
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-white/10 z-20">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
