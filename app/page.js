'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from './lib/supabase';

const Map = dynamic(() => import('./Map'), { 
  ssr: false,
  loading: () => <p className="text-center p-10 text-slate-500">Loading map...</p>
});

const popularMedicines = ["Paracetamol", "Amoxicillin", "Ibuprofen", "Vitamin C", "Cough Syrup", "Flagyl", "ORS"];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export default function Home() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Not set');
  const [sortBy, setSortBy] = useState('distance');
  const [recentSearches, setRecentSearches] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load real pharmacies + medicines from Supabase
  const loadPharmacies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pharmacies')
      .select(`
        id,
        name,
        address,
        phone,
        latitude,
        longitude,
        medicines (
          id,
          name,
          price,
          in_stock
        )
      `);

    if (error) {
      console.error('Error loading pharmacies:', error);
      setLoading(false);
      return;
    }

    const formatted = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      address: p.address || 'Address not available',
      phone: p.phone || null,
      position: p.latitude && p.longitude 
        ? [Number(p.latitude), Number(p.longitude)] 
        : null,
      openHours: '8:00 AM - 8:00 PM',
      isOpen: true,
      medicines: (p.medicines || []).map(m => ({
        name: m.name,
        price: Number(m.price),
        inStock: m.in_stock
      }))
    }));

    setPharmacies(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadPharmacies();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

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
        setLocationStatus('Location found ✓');
      },
      () => {
        setLocationStatus('Failed to get location. Please allow permission.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getMyLocation();
  }, []);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
      setIsListening(false);
      setTimeout(() => handleSearch(transcript), 300);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleSearch = (medicineName = search) => {
    if (!medicineName.trim()) {
      setResults([]);
      setSelectedPharmacy(null);
      return;
    }

    const updatedRecent = [medicineName, ...recentSearches.filter(s => s.toLowerCase() !== medicineName.toLowerCase())].slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));

    const filtered = [];

    pharmacies.forEach(pharmacy => {
      const foundMedicine = pharmacy.medicines.find(med => 
        med.name.toLowerCase().includes(medicineName.toLowerCase()) && med.inStock
      );

      if (foundMedicine) {
        let distance = null;
        if (userLocation && pharmacy.position) {
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

    if (sortBy === 'price') {
      filtered.sort((a, b) => a.price - b.price);
    } else {
      filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    setResults(filtered);
    setSelectedPharmacy(null);
    setSearch(medicineName);
  };

  useEffect(() => {
    if (results.length > 0) {
      handleSearch(search);
    }
  }, [sortBy]);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Pharmacy Finder</h1>
            <p className="text-sm text-blue-100">Find medicines near you in Ghana</p>
          </div>
          <button
            onClick={loadPharmacies}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={getMyLocation}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-medium"
            >
              📍 Use My Current Location
            </button>
            <p className="text-sm text-slate-600">
              Status: <span className="font-medium text-slate-800">{locationStatus}</span>
            </p>
          </div>
        </div>

        {/* Popular Medicines */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Popular medicines:</p>
          <div className="flex flex-wrap gap-2">
            {popularMedicines.map((med) => (
              <button
                key={med}
                onClick={() => handleSearch(med)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 border border-blue-200"
              >
                {med}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Recent searches:</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((med) => (
                <button
                  key={med}
                  onClick={() => handleSearch(med)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-slate-200"
                >
                  {med}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for a medicine or click the mic..."
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />

            <div className="flex gap-3">
              <button
                onClick={startVoiceSearch}
                disabled={isListening}
                className={`flex-1 sm:flex-none px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  isListening 
                    ? 'bg-red-500 text-white' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isListening ? '🔴 Listening...' : '🎤 Speak'}
              </button>

              <button
                onClick={() => handleSearch()}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-10 text-slate-500">
            Loading pharmacies from cloud...
          </div>
        )}

        {!loading && pharmacies.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            No pharmacies registered yet. Go to the Admin page to add one.
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold text-slate-900">
                Found in {results.length} pharmacies
              </h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('distance')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    sortBy === 'distance' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sort by Distance
                </button>
                <button
                  onClick={() => setSortBy('price')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    sortBy === 'price' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sort by Price
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedPharmacy(item)}
                  className={`border rounded-xl p-4 cursor-pointer transition
                    ${selectedPharmacy?.id === item.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                          Open now
                        </span>
                      </div>
                      
                      <p className="text-slate-600 text-sm mt-1">{item.address}</p>
                      
                      {item.phone && (
                        <p className="text-slate-500 text-sm">{item.phone}</p>
                      )}
                      
                      {item.distance !== null && (
                        <p className="text-blue-600 text-sm font-medium mt-1">
                          📍 {item.distance} km away
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            📞 Call
                          </a>
                        )}
                        
                        {item.position && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${item.position[0]},${item.position[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            🗺️ Directions
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <p className="text-green-600 font-bold text-xl">GH₵{item.price}</p>
                      <p className="text-sm text-slate-500 mt-1">{item.medicineName}</p>
                      <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        In Stock
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Pharmacy Details */}
        {selectedPharmacy && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4 border-l-4 border-l-blue-600">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedPharmacy.name}</h2>
                <p className="text-slate-600 mt-1">{selectedPharmacy.address}</p>
                {selectedPharmacy.phone && (
                  <p className="text-slate-500 text-sm mt-1">📞 {selectedPharmacy.phone}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedPharmacy(null)}
                className="text-slate-500 hover:text-slate-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              {selectedPharmacy.phone && (
                <a
                  href={`tel:${selectedPharmacy.phone}`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📞 Call {selectedPharmacy.phone}
                </a>
              )}
              
              {selectedPharmacy.position && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPharmacy.position[0]},${selectedPharmacy.position[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🗺️ Get Directions
                </a>
              )}
            </div>

            <h3 className="font-semibold text-lg mb-3 text-slate-900">Available Medicines</h3>
            <div className="space-y-2">
              {selectedPharmacy.medicines.length === 0 ? (
                <p className="text-slate-500 text-sm">No medicines listed yet.</p>
              ) : (
                selectedPharmacy.medicines.map((med, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{med.name}</p>
                      <p className={`text-sm ${med.inStock ? 'text-green-600' : 'text-red-600'}`}>
                        {med.inStock ? 'In Stock' : 'Out of Stock'}
                      </p>
                    </div>
                    <p className="font-bold text-green-600">GH₵{med.price}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Map View</h3>
          <div className="h-96 rounded-lg overflow-hidden">
            <Map 
              pharmacies={results.length > 0 ? results : pharmacies.filter(p => p.position)} 
              userLocation={userLocation}
              selectedPharmacy={selectedPharmacy}
            />
          </div>
        </div>
      </div>
    </main>
  );
}