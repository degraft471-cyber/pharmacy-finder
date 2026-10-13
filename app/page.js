'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from './lib/supabase';

const Map = dynamic(() => import('./Map'), { 
  ssr: false,
  loading: () => <p className="text-center p-10">Loading map...</p>
});

// ========== SYMPTOM → MEDICINE MAPPING ==========
const symptomMap = {
  headache: ['Paracetamol', 'Ibuprofen', 'Aspirin', 'Panadol'],
  migraine: ['Paracetamol', 'Ibuprofen', 'Aspirin'],
  fever: ['Paracetamol', 'Ibuprofen', 'Aspirin'],
  malaria: ['Coartem', 'Lonart', 'Artemether', 'Lumefantrine', 'Paracetamol'],
  cold: ['Cough Syrup', 'Vitamin C', 'Paracetamol', 'Amoxicillin'],
  flu: ['Cough Syrup', 'Vitamin C', 'Paracetamol'],
  cough: ['Cough Syrup', 'Vitamin C'],
  pain: ['Ibuprofen', 'Paracetamol', 'Diclofenac', 'Aspirin'],
  stomachache: ['Antacid', 'Omeprazole', 'Paracetamol'],
  'stomach pain': ['Antacid', 'Omeprazole', 'Paracetamol'],
  diarrhea: ['ORS', 'Loperamide', 'Zinc'],
  infection: ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin'],
  allergy: ['Cetirizine', 'Loratadine', 'Piriton'],
};

const popularMedicines = ["Paracetamol", "Amoxicillin", "Ibuprofen", "Vitamin C", "Cough Syrup", "Coartem"];

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
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filter24hrs, setFilter24hrs] = useState(false);

  // User Auth
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Sidebar & Favorites
  const [activeTab, setActiveTab] = useState('search');
  const [favorites, setFavorites] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load pharmacies
  useEffect(() => {
    const loadPharmacies = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pharmacies')
        .select(`
          id, name, address, latitude, longitude, phone, opening_hours, is_24hrs, is_open,
          medicines (id, name, price, in_stock)
        `);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const formatted = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        address: p.address || 'Address not available',
        phone: p.phone || null,
        position: p.latitude && p.longitude ? [Number(p.latitude), Number(p.longitude)] : null,
        openHours: p.opening_hours || '8:00 AM - 8:00 PM',
        isOpen: p.is_open !== false,
        is24hrs: p.is_24hrs || false,
        medicines: (p.medicines || []).map(m => ({
          name: m.name,
          price: Number(m.price),
          inStock: m.in_stock
        }))
      }));

      setPharmacies(formatted);
      setLoading(false);
    };
    loadPharmacies();
  }, []);

  // Load user + favorites
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      loadFavorites(user.id);
    }
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const loadFavorites = async (userId) => {
    const { data } = await supabase
      .from('favorites')
      .select('pharmacy_id, pharmacies(id, name, address, latitude, longitude, phone)')
      .eq('user_id', userId);

    if (data) {
      const favs = data.map(f => ({
        id: f.pharmacies.id,
        name: f.pharmacies.name,
        address: f.pharmacies.address,
        phone: f.pharmacies.phone,
        position: f.pharmacies.latitude && f.pharmacies.longitude
          ? [Number(f.pharmacies.latitude), Number(f.pharmacies.longitude)]
          : null
      }));
      setFavorites(favs);
    }
  };

  const getMyLocation = () => {
    setLocationStatus('Getting your location...');
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationStatus('Location found ✓');
      },
      () => setLocationStatus('Failed to get location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { getMyLocation(); }, []);

  // ========== AUTH ==========
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    if (isRegistering) {
      if (!authName || !authEmail || !authPassword) {
        setAuthError('Please fill all fields');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('users')
        .insert([{ full_name: authName, email: authEmail.toLowerCase(), password: authPassword }])
        .select()
        .single();

      if (error) {
        setAuthError(error.message.includes('duplicate') ? 'Email already registered' : error.message);
      } else {
        setCurrentUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        setShowAuth(false);
        loadFavorites(data.id);
      }
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', authEmail.toLowerCase())
        .eq('password', authPassword)
        .single();

      if (error || !data) {
        setAuthError('Invalid email or password');
      } else {
        setCurrentUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        setShowAuth(false);
        loadFavorites(data.id);
      }
    }
    setLoading(false);
  };

  const logout = () => {
    setCurrentUser(null);
    setFavorites([]);
    localStorage.removeItem('currentUser');
  };

  // ========== FAVORITES ==========
  const toggleFavorite = async (pharmacy) => {
    if (!currentUser) {
      setShowAuth(true);
      return;
    }

    const exists = favorites.find(f => f.id === pharmacy.id);
    if (exists) {
      await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('pharmacy_id', pharmacy.id);
      setFavorites(favorites.filter(f => f.id !== pharmacy.id));
    } else {
      await supabase.from('favorites').insert([{ user_id: currentUser.id, pharmacy_id: pharmacy.id }]);
      setFavorites([...favorites, {
        id: pharmacy.id,
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        position: pharmacy.position
      }]);
    }
  };

  const isFavorite = (id) => favorites.some(f => f.id === id);

  // ========== SMART SEARCH ==========
  const handleSearch = (medicineName = search) => {
    setHasSearched(true);
    if (!medicineName.trim()) {
      setResults([]);
      return;
    }

    const term = medicineName.toLowerCase().trim();
    const updatedRecent = [medicineName, ...recentSearches.filter(s => s.toLowerCase() !== term)].slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));

    // Check if it's a symptom
    let searchTerms = [term];
    if (symptomMap[term]) {
      searchTerms = symptomMap[term].map(m => m.toLowerCase());
    }

    const filtered = [];

    pharmacies.forEach(pharmacy => {
      // Apply filters
      if (filterOpenNow && !pharmacy.isOpen) return;
      if (filter24hrs && !pharmacy.is24hrs) return;

      const foundMedicine = pharmacy.medicines.find(med =>
        searchTerms.some(t => med.name.toLowerCase().includes(t)) && med.inStock
      );

      if (foundMedicine) {
        let distance = null;
        if (userLocation && pharmacy.position) {
          distance = getDistance(userLocation[0], userLocation[1], pharmacy.position[0], pharmacy.position[1]);
        }
        filtered.push({
          ...pharmacy,
          medicineName: foundMedicine.name,
          price: foundMedicine.price,
          distance
        });
      }
    });

    if (sortBy === 'price') filtered.sort((a, b) => a.price - b.price);
    else filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));

    setResults(filtered);
    setSelectedPharmacy(null);
    setSearch(medicineName);
    setActiveTab('search');
  };

  useEffect(() => {
    if (hasSearched) handleSearch(search);
  }, [sortBy, filterOpenNow, filter24hrs]);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice search not supported');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSearch(transcript);
      setIsListening(false);
      setTimeout(() => handleSearch(transcript), 300);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && <h2 className="font-bold text-lg text-blue-600">Pharmacy Finder</h2>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button onClick={() => setActiveTab('search')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeTab === 'search' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <span>🔍</span>{sidebarOpen && 'Search'}
          </button>
          <button onClick={() => setActiveTab('favorites')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeTab === 'favorites' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <span>❤️</span>
            {sidebarOpen && <span>Favorites {favorites.length > 0 && <span className="bg-red-500 text-white text-xs px-1.5 rounded-full ml-1">{favorites.length}</span>}</span>}
          </button>
        </nav>

        <div className="p-4 border-t">
          {currentUser ? (
            <div className="space-y-2">
              {sidebarOpen && <p className="text-sm font-medium truncate">{currentUser.full_name}</p>}
              <button onClick={logout} className="w-full text-sm text-red-600 hover:underline">
                {sidebarOpen ? 'Logout' : '🚪'}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm">
              {sidebarOpen ? 'Login / Register' : '👤'}
            </button>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-blue-600 text-white p-4 shadow-md">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">{activeTab === 'search' ? 'Search Medicines' : 'My Favorites'}</h1>
            {currentUser && <p className="text-sm">Hi, {currentUser.full_name}</p>}
          </div>
        </header>

        <div className="max-w-5xl mx-auto p-4">

          {/* AUTH MODAL */}
          {showAuth && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{isRegistering ? 'Create Account' : 'Login'}</h2>
                <form onSubmit={handleAuth} className="space-y-3">
                  {isRegistering && (
                    <input type="text" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full p-3 border rounded-xl" required />
                  )}
                  <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-3 border rounded-xl" required />
                  <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-3 border rounded-xl" required />
                  {authError && <p className="text-red-600 text-sm">{authError}</p>}
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium">
                    {isRegistering ? 'Register' : 'Login'}
                  </button>
                </form>
                <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-3 text-sm text-blue-600">
                  {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                </button>
                <button onClick={() => setShowAuth(false)} className="w-full mt-2 text-sm text-slate-500">Cancel</button>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <>
              {/* Location + Filters */}
              <div className="bg-white rounded-lg border p-4 mb-4 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <button onClick={getMyLocation} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">📍 My Location</button>
                  <span className="text-sm text-slate-600">{locationStatus}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterOpenNow(!filterOpenNow)} className={`px-3 py-1.5 rounded-full text-sm border ${filterOpenNow ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                    Open Now
                  </button>
                  <button onClick={() => setFilter24hrs(!filter24hrs)} className={`px-3 py-1.5 rounded-full text-sm border ${filter24hrs ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                    24 Hours
                  </button>
                </div>
              </div>

              {/* Popular + Recent */}
              <div className="bg-white rounded-lg border p-4 mb-4">
                <p className="text-sm font-medium mb-2">Try searching symptoms or medicines:</p>
                <div className="flex flex-wrap gap-2">
                  {['headache', 'malaria', 'fever', 'cold', ...popularMedicines].map(item => (
                    <button key={item} onClick={() => handleSearch(item)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200 capitalize">
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Box */}
              <div className="bg-white rounded-lg border p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search medicine or symptom (e.g. headache, malaria)..."
                    className="flex-1 p-3 border rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button onClick={startVoiceSearch} className={`px-4 py-3 rounded-lg ${isListening ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'}`}>
                      {isListening ? 'Listening...' : '🎤'}
                    </button>
                    <button onClick={() => handleSearch()} className="bg-blue-600 text-white px-6 py-3 rounded-lg">Search</button>
                  </div>
                </div>
              </div>

              {/* No Results */}
              {hasSearched && results.length === 0 && !loading && (
                <div className="bg-white rounded-lg border p-10 text-center mb-4">
                  <div className="text-5xl mb-3">😔</div>
                  <h3 className="text-xl font-semibold mb-2">Currently Unavailable</h3>
                  <p className="text-slate-600">No pharmacy currently has medicine for <strong>"{search}"</strong>.<br />Please check again later.</p>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="bg-white rounded-lg border p-4 mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Found in {results.length} pharmacies</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setSortBy('distance')} className={`px-3 py-1.5 rounded-lg text-sm ${sortBy === 'distance' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Distance</button>
                      <button onClick={() => setSortBy('price')} className={`px-3 py-1.5 rounded-lg text-sm ${sortBy === 'price' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Price</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {results.map(item => (
                      <div key={item.id} onClick={() => setSelectedPharmacy(item)} className={`border rounded-xl p-4 cursor-pointer ${selectedPharmacy?.id === item.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <div className="flex justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{item.name}</h3>
                              <button onClick={e => { e.stopPropagation(); toggleFavorite(item); }}>{isFavorite(item.id) ? '❤️' : '🤍'}</button>
                              {item.is24hrs && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">24hrs</span>}
                            </div>
                            <p className="text-sm text-slate-600">{item.address}</p>
                            <p className="text-sm text-slate-500">{item.openHours}</p>
                            {item.distance !== null && <p className="text-blue-600 text-sm font-medium mt-1">📍 {item.distance} km away</p>}

                            <div className="flex flex-wrap gap-2 mt-3">
                              {item.phone && (
                                <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">📞 Call</a>
                              )}
                              {item.phone && (
                                <a
                                  href={`https://wa.me/233${item.phone.replace(/^0/, '')}?text=Hello, I would like to buy ${item.medicineName}`}
                                  target="_blank"
                                  onClick={e => e.stopPropagation()}
                                  className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg"
                                >
                                  WhatsApp Order
                                </a>
                              )}
                              {item.position && (
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${item.position[0]},${item.position[1]}`} target="_blank" onClick={e => e.stopPropagation()} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">🗺️ Directions</a>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-600 font-bold text-xl">GH₵{item.price}</p>
                            <p className="text-sm text-slate-500">{item.medicineName}</p>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mt-1 inline-block">In Stock</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Details */}
              {selectedPharmacy && (
                <div className="bg-white rounded-lg border p-5 mb-4 border-l-4 border-l-blue-600">
                  <div className="flex justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">{selectedPharmacy.name}</h2>
                        <button onClick={() => toggleFavorite(selectedPharmacy)}>{isFavorite(selectedPharmacy.id) ? '❤️' : '🤍'}</button>
                      </div>
                      <p className="text-slate-600">{selectedPharmacy.address}</p>
                      <p className="text-sm text-slate-500">{selectedPharmacy.openHours}</p>
                    </div>
                    <button onClick={() => setSelectedPharmacy(null)}>✕</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedPharmacy.phone && <a href={`tel:${selectedPharmacy.phone}`} className="px-4 py-2 bg-green-600 text-white rounded-lg">📞 Call</a>}
                    {selectedPharmacy.phone && (
                      <a href={`https://wa.me/233${selectedPharmacy.phone.replace(/^0/, '')}?text=Hello, I need medicine`} target="_blank" className="px-4 py-2 bg-emerald-500 text-white rounded-lg">WhatsApp</a>
                    )}
                    {selectedPharmacy.position && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPharmacy.position[0]},${selectedPharmacy.position[1]}`} target="_blank" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Directions</a>
                    )}
                  </div>
                  <h3 className="font-semibold mb-3">Available Medicines</h3>
                  <div className="space-y-2">
                    {selectedPharmacy.medicines.map((med, i) => (
                      <div key={i} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className={`text-sm ${med.inStock ? 'text-green-600' : 'text-red-600'}`}>{med.inStock ? 'In Stock' : 'Out of Stock'}</p>
                        </div>
                        <p className="font-bold text-green-600">GH₵{med.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              <div className="bg-white rounded-lg border p-4">
                <div className="h-96 rounded-lg overflow-hidden">
                  <Map pharmacies={results.length > 0 ? results : pharmacies.filter(p => p.position)} userLocation={userLocation} selectedPharmacy={selectedPharmacy} />
                </div>
              </div>
            </>
          )}

          {/* FAVORITES TAB */}
          {activeTab === 'favorites' && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">My Favorite Pharmacies</h2>
              {!currentUser ? (
                <div className="text-center py-10">
                  <p className="mb-4">Please login to save favorites</p>
                  <button onClick={() => setShowAuth(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Login / Register</button>
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <div className="text-5xl mb-4">🤍</div>
                  <p>No favorites yet. Click the heart icon on any pharmacy.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map(fav => (
                    <div key={fav.id} className="border rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg">{fav.name}</h3>
                        <p className="text-sm text-slate-600">{fav.address}</p>
                      </div>
                      <div className="flex gap-2">
                        {fav.phone && <a href={`tel:${fav.phone}`} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">Call</a>}
                        {fav.position && <a href={`https://www.google.com/maps/dir/?api=1&destination=${fav.position[0]},${fav.position[1]}`} target="_blank" className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Directions</a>}
                        <button onClick={() => toggleFavorite(fav)} className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg border">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}