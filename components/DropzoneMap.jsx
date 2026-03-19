'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js/Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default?.src || 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: require('leaflet/dist/images/marker-icon.png').default?.src || 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png').default?.src || 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Auto-adjust map bounds
function ChangeView({ markers, userLocation }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    } else if (markers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, userLocation, map]);
  return null;
}

export default function DropzoneMap({ dropzones = [], onSelectDropzone, submittingId, userLocation }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true) }, []);

  // Center roughly on India if no dropzones, or first dropzone
  const center = userLocation ? [userLocation.lat, userLocation.lng] : (dropzones.length > 0 ? [dropzones[0].lat, dropzones[0].lng] : [20.5937, 78.9629]);
  const zoom = userLocation ? 14 : (dropzones.length > 0 ? 12 : 5);

  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `<div class="w-4 h-4 bg-primary-500 rounded-full border-2 border-white shadow-lg shadow-primary-500/50 animate-pulse"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  if (!mounted) {
    return (
      <div className="w-full h-[400px] md:h-full min-h-[400px] rounded-2xl overflow-hidden border border-ghost-400 bg-ghost-800 shadow-2xl flex items-center justify-center">
        <span className="text-sm font-medium text-ghost-400 animate-pulse">Initializing Map Engine...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] md:h-full min-h-[400px] rounded-2xl overflow-hidden border border-ghost-400 shadow-2xl relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeView markers={dropzones} userLocation={userLocation} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {dropzones.map((dz) => (
          <Marker key={dz.id} position={[dz.lat, dz.lng]}>
            <Popup className="dropzone-popup">
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-ghost-300 border-b pb-2 mb-2">{dz.name}</h3>
                <p className="text-sm text-ghost-300 mb-3">{dz.address || 'No additional instructions.'}</p>
                {onSelectDropzone && (
                  <button
                    onClick={() => onSelectDropzone(dz.id)}
                    disabled={submittingId === dz.id}
                    className="w-full bg-ghost-300 hover:bg-ghost-400 text-ghost-900 font-medium py-2 rounded-lg transition duration-200 disabled:opacity-50"
                  >
                    {submittingId === dz.id ? 'Submitting...' : 'Submit Here'}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
