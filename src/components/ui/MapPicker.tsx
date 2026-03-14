"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
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
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng); } });
  return null;
}

/** Fly to a new center whenever lat/lng change externally */
function FlyTo({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const prev = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (lat !== null && lng !== null) {
      if (!prev.current || prev.current.lat !== lat || prev.current.lng !== lng) {
        map.flyTo([lat, lng], 16, { animate: true, duration: 1 });
        prev.current = { lat, lng };
      }
    }
  }, [lat, lng]);
  return null;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-purple-200 h-64 relative">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onChange={onChange} />
        <FlyTo lat={lat} lng={lng} />
        {lat !== null && lng !== null && <Marker position={[lat, lng]} />}
      </MapContainer>
      {lat === null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm text-purple-700 font-medium shadow">
            📍 Search above or click on the map to place pin
          </div>
        </div>
      )}
    </div>
  );
}
