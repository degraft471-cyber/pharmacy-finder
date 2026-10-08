'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const pharmacyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function FitBounds({ route, userLocation, selectedPharmacy, pharmacies }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 1) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      return;
    }

    const points = [];
    if (userLocation) points.push(userLocation);
    if (selectedPharmacy) points.push(selectedPharmacy.position);
    pharmacies.forEach(p => points.push(p.position));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [route, userLocation, selectedPharmacy, pharmacies, map]);

  return null;
}

export default function Map({ pharmacies, userLocation, selectedPharmacy }) {
  const [isClient, setIsClient] = useState(false);
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!selectedPharmacy || !userLocation) {
      setRoute(null);
      setStatus('');
      return;
    }

    setStatus('Getting route...');
    setRoute(null);

    const [userLat, userLng] = userLocation;
    const [pharmLat, pharmLng] = selectedPharmacy.position;

    // Try two free routing servers
    const urls = [
      `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${pharmLng},${pharmLat}?overview=full&geometries=geojson`,
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${userLng},${userLat};${pharmLng},${pharmLat}?overview=full&geometries=geojson`
    ];

    const tryRoute = async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          const data = await res.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const coordinates = data.routes[0].geometry.coordinates.map(
              (c) => [c[1], c[0]]
            );
            setRoute(coordinates);
            setStatus('Route found ✓');
            return;
          }
        } catch (err) {
          console.log('One server failed, trying next...');
        }
      }
      setStatus('Could not get road route');
      setRoute(null);
    };

    tryRoute();
  }, [selectedPharmacy, userLocation]);

  if (!isClient) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[5.6037, -0.1870]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds
          route={route}
          userLocation={userLocation}
          selectedPharmacy={selectedPharmacy}
          pharmacies={pharmacies}
        />

        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {pharmacies.map((pharmacy) => (
          <Marker key={pharmacy.id} position={pharmacy.position} icon={pharmacyIcon}>
            <Popup>
              <strong>{pharmacy.name}</strong><br />
              {pharmacy.address}<br />
              {pharmacy.phone}
              {pharmacy.distance && (
                <><br /><span style={{ color: '#2563eb' }}>{pharmacy.distance} km away</span></>
              )}
            </Popup>
          </Marker>
        ))}

        {route && route.length > 1 && (
          <Polyline positions={route} color="#2563eb" weight={5} opacity={0.9} />
        )}
      </MapContainer>

      {status && (
        <div className="absolute top-3 left-14 bg-white px-3 py-1.5 rounded-lg shadow text-sm z-[1000] font-medium">
          {status}
        </div>
      )}
    </div>
  );
}