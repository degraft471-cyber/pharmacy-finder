'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// This small component helps the map center on the selected pharmacy
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function Map({ pharmacies = [], userLocation, selectedPharmacy }) {
  const center = selectedPharmacy 
    ? selectedPharmacy.position 
    : userLocation 
      ? userLocation 
      : [5.6037, -0.1870]; // Default: Accra

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        key={selectedPharmacy ? selectedPharmacy.id : 'default'}
        center={center}
        zoom={selectedPharmacy ? 15 : 11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeView center={center} zoom={selectedPharmacy ? 15 : 11} />

        {pharmacies.map((pharmacy) => (
          <Marker 
            key={pharmacy.id} 
            position={pharmacy.position}
          >
            <Popup>
              <strong>{pharmacy.name}</strong><br />
              {pharmacy.address}<br />
              {pharmacy.phone}
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}