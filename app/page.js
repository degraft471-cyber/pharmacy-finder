'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), { 
  ssr: false,
  loading: () => <p className="text-center p-10">Loading map...</p>
});

const basePharmacies = [
  {
    id: 1,
    name: "HealthPlus Pharmacy",
    address: "Oxford Street, Osu, Accra",
    phone: "0244123456",
    position: [5.5557, -0.1820],
    openHours: "8:00 AM - 9:00 PM",
    isOpen: true,
    defaultMedicines: [
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
    openHours: "8:00 AM - 8:00 PM",
    isOpen: true,
    defaultMedicines: [
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
    openHours: "9:00 AM - 7:00 PM",
    isOpen: false,
    defaultMedicines: [
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
    openHours: "8:00 AM - 10:00 PM",
    isOpen: true,
    defaultMedicines: [
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
    openHours: "8:00 AM - 8:00 PM",
    isOpen: true,
    defaultMedicines: [
      { name: "Paracetamol", price: 8, inStock: true },
      { name: "Amoxicillin", price: 20, inStock: true },
      { name: "Ibuprofen", price: 10, inStock: true },
    ]
  }
];

const popularMedicines = ["Paracetamol", "Amoxicillin", "Ibuprofen", "Vitamin C", "Cough Syrup"];

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

  // Load pharmacies + medicines from localStorage
  useEffect(() => {
    const loaded = basePharmacies.map(pharmacy => {
      const saved = localStorage.getItem(`pharmacy_${pharmacy.id}_medicines`);
      return {
        ...pharmacy,
        medicines: saved ? JSON.parse(saved) : pharmacy.defaultMedicines
      };
    });
    setPharmacies(loaded);
  }, []);

  // Load recent searches
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

  // ========== VOICE SEARCH ==========
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
      // Automatically search after speaking
      setTimeout(() => {
        handleSearch(transcript);
      }, 300);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

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
          <h1 className="text-2xl font-bold">Pharmacy Finder</h1>
          <p className="text-sm">Find medicines near you</p>
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

        {/* Search Box + Voice Button */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for a medicine or click the mic..."
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />

            {/* Microphone Button */}
            <button
              onClick={startVoiceSearch}
              disabled={isListening}
              className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${
                isListening 
                  ? 'bg-red-500 text-white' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isListening ? (
                <>🔴 Listening...</>
              ) : (
                <>🎤 Speak</>
              )}
            </button>

            <button
              onClick={() => handleSearch()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          {isListening && (
            <p className="text-sm text-red-600 mt-2 font-medium">
              Listening... Speak the medicine name now
            </p>
          )}
        </div>

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
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.isOpen 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.isOpen ? 'Open now' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mt-1">{item.address}</p>
                      <p className="text-slate-500 text-sm">{item.openHours}</p>
                      
                      {item.distance !== null && (
                        <p className="text-blue-600 text-sm font-medium mt-1">
                          📍 {item.distance} km away
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        <a
                          href={`tel:${item.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          📞 Call
                        </a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${item.position[0]},${item.position[1]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          🗺️ Directions
                        </a>
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

        {/* Pharmacy Details Panel */}
        {selectedPharmacy && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4 border-l-4 border-l-blue-600">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedPharmacy.name}</h2>
                <p className="text-slate-600 mt-1">{selectedPharmacy.address}</p>
                <p className="text-sm text-slate-500">{selectedPharmacy.openHours}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium ${
                  selectedPharmacy.isOpen 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {selectedPharmacy.isOpen ? 'Open now' : 'Closed'}
                </span>
              </div>
              <button
                onClick={() => setSelectedPharmacy(null)}
                className="text-slate-500 hover:text-slate-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <a
                href={`tel:${selectedPharmacy.phone}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                📞 Call {selectedPharmacy.phone}
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPharmacy.position[0]},${selectedPharmacy.position[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🗺️ Get Directions
              </a>
            </div>

            <h3 className="font-semibold text-lg mb-3 text-slate-900">Available Medicines</h3>
            <div className="space-y-2">
              {selectedPharmacy.medicines.map((med, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{med.name}</p>
                    <p className={`text-sm ${med.inStock ? 'text-green-600' : 'text-red-600'}`}>
                      {med.inStock ? 'In Stock' : 'Out of Stock'}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">GH₵{med.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
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