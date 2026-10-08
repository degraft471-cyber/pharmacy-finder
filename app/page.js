'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), { 
  ssr: false,
  loading: () => <p className="text-center p-10">Loading map...</p>
});

const pharmacies = [
  {
    id: 1,
    name: "HealthPlus Pharmacy",
    address: "Oxford Street, Osu, Accra",
    phone: "0244123456",
    position: [5.5557, -0.1820],
    medicines: [
      { name: "Paracetamol", price: 8, inStock: true },
      { name: "Amoxicillin", price: 25, inStock: true },
      { name: "Ibuprofen", price: 12, inStock: true },
    ]
  },
  {
    id: 2,
    name: "MedCare Pharmacy",
    address: "Spintex Road, Accra",
    phone: "0209876543",
    position: [5.6360, -0.1200],
    medicines: [
      { name: "Paracetamol", price: 7, inStock: true },
      { name: "Vitamin C", price: 15, inStock: true },
      { name: "Cough Syrup", price: 30, inStock: true },
    ]
  },
  {
    id: 3,
    name: "CityCare Pharmacy",
    address: "Community 1, Tema",
    phone: "0274567890",
    position: [5.6698, -0.0166],
    medicines: [
      { name: "Paracetamol", price: 9, inStock: true },
      { name: "Amoxicillin", price: 22, inStock: true },
      { name: "Ibuprofen", price: 11, inStock: false },
    ]
  },
  {
    id: 4,
    name: "GreenLife Pharmacy",
    address: "Kasoa Main Road, Kasoa",
    phone: "0551122334",
    position: [5.5340, -0.4160],
    medicines: [
      { name: "Paracetamol", price: 6, inStock: true },
      { name: "Vitamin C", price: 18, inStock: true },
      { name: "Cough Syrup", price: 28, inStock: true },
    ]
  },
  {
    id: 5,
    name: "Cape Health Pharmacy",
    address: "Commercial Street, Cape Coast",
    phone: "0247788990",
    position: [5.1053, -1.2466],
    medicines: [
      { name: "Paracetamol", price: 8, inStock: true },
      { name: "Amoxicillin", price: 20, inStock: true },
      { name: "Ibuprofen", price: 10, inStock: true },
    ]
  }
];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

export default function Home() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Not set');

  const getMyLocation = () => {
    setLocationStatus('Getting your location...');

    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setLocationStatus(`Location found: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
      },
      (error) => {
        console.error(error);
        setLocationStatus('Failed to get location. Please allow permission.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Try to get location automatically when page loads
  useEffect(() => {
    getMyLocation();
  }, []);

  const handleSearch = () => {
    if (!search.trim()) {
      setResults([]);
      setSelectedPharmacy(null);
      return;
    }

    const filtered = [];

    pharmacies.forEach(pharmacy => {
      const foundMedicine = pharmacy.medicines.find(med => 
        med.name.toLowerCase().includes(search.toLowerCase()) && med.inStock
      );

      if (foundMedicine) {
        let distance = null;
        if (userLocation) {
          distance = getDistance(
            userLocation[0], userLocation[1],
            pharmacy.position[0], pharmacy.position[1]
          );
        }

        filtered.push({
          ...pharmacy,
          medicineName: foundMedicine.name,
          price: foundMedicine.price,
          distance: distance
        });
      }
    });

    filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    setResults(filtered);
    setSelectedPharmacy(null);
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Pharmacy Finder</h1>
          <p className="text-sm">Find medicines near you</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">

        {/* Location Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={getMyLocation}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-medium"
            >
              📍 Use My Current Location
            </button>
            <p className="text-sm text-gray-600">
              Status: <span className="font-medium">{locationStatus}</span>
            </p>
          </div>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a medicine (e.g. Paracetamol)..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              Found in {results.length} pharmacies
            </h2>
            <div className="space-y-3">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedPharmacy(item)}
                  className={`border rounded-lg p-4 cursor-pointer transition
                    ${selectedPharmacy?.id === item.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                      <p className="text-gray-700 text-sm">{item.address}</p>
                      <p className="text-gray-700 text-sm">Phone: {item.phone}</p>
                      {item.distance && (
                        <p className="text-blue-600 text-sm font-medium mt-1">
                          📍 {item.distance} km away
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-bold text-lg">GH₵{item.price}</p>
                      <p className="text-sm text-gray-600">{item.medicineName}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="h-96 rounded-lg overflow-hidden">
            <Map 
              pharmacies={results.length > 0 ? results : pharmacies} 
              userLocation={userLocation}
              selectedPharmacy={selectedPharmacy}
            />
          </div>
        </div>
      </div>
    </main>
  );
}