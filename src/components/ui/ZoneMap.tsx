"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";

const DefaultIcon = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const UserIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;background:#4f46e5;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(79,70,229,0.3)"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface Zone {
  id: string;
  name: string;
  type?: string;
  address?: string;
  lat: number;
  lng: number;
  hours?: string;
  distance?: number; // km
}

interface ZoneMapProps {
  zones: Zone[];
  userLat?: number | null;
  userLng?: number | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

function AutoFit({ zones, userLat, userLng }: { zones: Zone[]; userLat?: number | null; userLng?: number | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = zones.map(z => [z.lat, z.lng]);
    if (userLat && userLng) points.push([userLat, userLng]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    }
  }, [zones.length, userLat, userLng]);
  return null;
}

export default function ZoneMap({ zones, userLat, userLng, selectedId, onSelect }: ZoneMapProps) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-purple-200 h-72 relative">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <AutoFit zones={zones} userLat={userLat} userLng={userLng} />

        {/* User location */}
        {userLat && userLng && (
          <>
            <Marker position={[userLat, userLng]} icon={UserIcon}>
              <Popup>📍 Your location</Popup>
            </Marker>
            <Circle
              center={[userLat, userLng]}
              radius={300}
              pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5", fillOpacity: 0.1, weight: 1 }}
            />
          </>
        )}

        {/* Drop zone markers */}
        {zones.map(zone => (
          <Marker
            key={zone.id}
            position={[zone.lat, zone.lng]}
            icon={zone.id === selectedId
              ? L.icon({ ...DefaultIcon.options as any, iconUrl: "/marker-icon.png", className: "selected-marker" })
              : DefaultIcon
            }
            eventHandlers={{ click: () => onSelect?.(zone.id) }}
          >
            <Popup>
              <div className="text-sm font-semibold">{zone.name}</div>
              {zone.type && <div className="text-xs text-gray-500">{zone.type}</div>}
              {zone.distance !== undefined && <div className="text-xs text-purple-600">{zone.distance.toFixed(1)} km away</div>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
