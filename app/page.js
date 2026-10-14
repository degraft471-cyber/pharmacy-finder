'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

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

const popularMedicines = ["Paracetamol", "Amoxicillin", "Ibuprofen", "Vitamin C", "Cough Syrup", "Coartem", "ORS", "Cetirizine"];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1));
}

function StarRating({ rating, size = 'text-sm' }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) % 1 >= 0.5;
  return (
    <span className={`${size} text-yellow-500`}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
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
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filter24hrs, setFilter24hrs] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [favorites, setFavorites] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pharmacyReviews, setPharmacyReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [alternatives, setAlternatives] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') setDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('pharmacies').select(`
        id, name, address, latitude, longitude, phone, opening_hours, is_24hrs, is_open,
        medicines (id, name, price, in_stock), reviews (rating)
      `);
      const formatted = (data || []).map(p => {
        const ratings = (p.reviews || []).map(r => r.rating);
        const avg = ratings.length ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : null;
        return {
          id: p.id, name: p.name, address: p.address || 'Address not available', phone: p.phone || null,
          position: p.latitude && p.longitude ? [Number(p.latitude), Number(p.longitude)] : null,
          openHours: p.opening_hours || '8:00 AM - 8:00 PM', isOpen: p.is_open !== false, is24hrs: p.is_24hrs || false,
          medicines: (p.medicines || []).map(m => ({ name: m.name, price: Number(m.price), inStock: m.in_stock })),
          avgRating: avg, reviewCount: ratings.length
        };
      });
      setPharmacies(formatted);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) { const u = JSON.parse(saved); setCurrentUser(u); loadFavorites(u.id); }
    const rs = localStorage.getItem('recentSearches');
    if (rs) setRecentSearches(JSON.parse(rs));
  }, []);

  const loadFavorites = async (userId) => {
    const { data } = await supabase.from('favorites')
      .select('pharmacy_id, pharmacies(id, name, address, latitude, longitude, phone)')
      .eq('user_id', userId);
    if (data) setFavorites(data.map(f => ({
      id: f.pharmacies.id, name: f.pharmacies.name, address: f.pharmacies.address, phone: f.pharmacies.phone,
      position: f.pharmacies.latitude && f.pharmacies.longitude ? [Number(f.pharmacies.latitude), Number(f.pharmacies.longitude)] : null
    })));
  };

  const loadReviews = async (id) => {
    const { data } = await supabase.from('reviews').select('*, users(full_name)').eq('pharmacy_id', id).order('created_at', { ascending: false });
    setPharmacyReviews(data || []);
  };

  useEffect(() => { if (selectedPharmacy) loadReviews(selectedPharmacy.id); else setPharmacyReviews([]); }, [selectedPharmacy]);

  const getMyLocation = () => {
    setLocationStatus('Getting location...');
    if (!navigator.geolocation) return setLocationStatus('Not supported');
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setLocationStatus('Location found ✓'); },
      () => setLocationStatus('Failed'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  useEffect(() => { getMyLocation(); }, []);

  useEffect(() => {
    if (search.length < 2) { setSuggestions([]); return; }
    const term = search.toLowerCase();
    const all = [...popularMedicines, ...Object.keys(symptomMap), ...Object.values(symptomMap).flat()];
    const unique = [...new Set(all)];
    setSuggestions(unique.filter(m => m.toLowerCase().includes(term)).slice(0, 6));
  }, [search]);

  const handleAuth = async (e) => {
    e.preventDefault(); setAuthError(''); setLoading(true);
    if (isRegistering) {
      const { data, error } = await supabase.from('users').insert([{ full_name: authName, email: authEmail.toLowerCase(), password: authPassword }]).select().single();
      if (error) setAuthError(error.message.includes('duplicate') ? 'Email already registered' : error.message);
      else { setCurrentUser(data); localStorage.setItem('currentUser', JSON.stringify(data)); setShowAuth(false); loadFavorites(data.id); }
    } else {
      const { data, error } = await supabase.from('users').select('*').eq('email', authEmail.toLowerCase()).eq('password', authPassword).single();
      if (error || !data) setAuthError('Invalid email or password');
      else { setCurrentUser(data); localStorage.setItem('currentUser', JSON.stringify(data)); setShowAuth(false); loadFavorites(data.id); }
    }
    setLoading(false);
  };

  const logout = () => { setCurrentUser(null); setFavorites([]); localStorage.removeItem('currentUser'); };

  const toggleFavorite = async (p) => {
    if (!currentUser) return setShowAuth(true);
    const exists = favorites.find(f => f.id === p.id);
    if (exists) {
      await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('pharmacy_id', p.id);
      setFavorites(favorites.filter(f => f.id !== p.id));
    } else {
      await supabase.from('favorites').insert([{ user_id: currentUser.id, pharmacy_id: p.id }]);
      setFavorites([...favorites, { id: p.id, name: p.name, address: p.address, phone: p.phone, position: p.position }]);
    }
  };

  const isFavorite = (id) => favorites.some(f => f.id === id);

  const submitReview = async () => {
    if (!currentUser) return setShowAuth(true);
    setReviewLoading(true);
    const { error } = await supabase.from('reviews').insert([{ pharmacy_id: selectedPharmacy.id, user_id: currentUser.id, rating: newRating, comment: newComment.trim() || null }]);
    setReviewLoading(false);
    if (!error) { setNewComment(''); setNewRating(5); loadReviews(selectedPharmacy.id); }
    else alert(error.message);
  };

  const requestNotify = async () => {
    if (!currentUser) return setShowAuth(true);
    setNotifyLoading(true);
    const { error } = await supabase.from('medicine_requests').insert([{ user_id: currentUser.id, medicine_name: search.trim() }]);
    setNotifyLoading(false);
    if (!error) setNotifySuccess(true);
    else alert(error.message);
  };

  const sharePharmacy = async (pharmacy) => {
    const text = `Check out ${pharmacy.name} on Pharmacy Finder\n${pharmacy.address}\n${pharmacy.phone || ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: pharmacy.name, text, url: window.location.href }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleSearch = (name = search) => {
    setHasSearched(true); setNotifySuccess(false); setShowSuggestions(false); setSidebarOpen(false);
    if (!name.trim()) { setResults([]); setAlternatives([]); return; }

    const term = name.toLowerCase().trim();
    const updated = [name, ...recentSearches.filter(s => s.toLowerCase() !== term)].slice(0, 5);
    setRecentSearches(updated); localStorage.setItem('recentSearches', JSON.stringify(updated));

    let terms = [term];
    let alts = [];
    if (symptomMap[term]) {
      terms = symptomMap[term].map(m => m.toLowerCase());
      alts = symptomMap[term];
    } else {
      for (const [symptom, meds] of Object.entries(symptomMap)) {
        if (meds.some(m => m.toLowerCase().includes(term))) {
          alts = meds.filter(m => !m.toLowerCase().includes(term));
          break;
        }
      }
    }
    setAlternatives(alts.slice(0, 4));

    const filtered = [];
    pharmacies.forEach(p => {
      if (filterOpenNow && !p.isOpen) return;
      if (filter24hrs && !p.is24hrs) return;
      const med = p.medicines.find(m => terms.some(t => m.name.toLowerCase().includes(t)) && m.inStock);
      if (med) {
        let dist = null;
        if (userLocation && p.position) dist = getDistance(userLocation[0], userLocation[1], p.position[0], p.position[1]);
        filtered.push({ ...p, medicineName: med.name, price: med.price, distance: dist });
      }
    });

    if (sortBy === 'price') filtered.sort((a,b) => a.price - b.price);
    else filtered.sort((a,b) => (a.distance || 999) - (b.distance || 999));

    setResults(filtered); setSelectedPharmacy(null); setSearch(name); setActiveTab('search');
  };

  useEffect(() => { if (hasSearched) handleSearch(search); }, [sortBy, filterOpenNow, filter24hrs]);

  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice not supported');
    const r = new SR(); r.lang = 'en-US'; setIsListening(true);
    r.onresult = e => { const t = e.results[0][0].transcript; setSearch(t); setIsListening(false); setTimeout(() => handleSearch(t), 300); };
    r.onerror = r.onend = () => setIsListening(false); r.start();
  };

  const bg = darkMode ? 'bg-slate-900' : 'bg-slate-100';
  const card = darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen ${bg} relative`}>
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* SIDEBAR - fully hidden when closed */}
      <div className={`
        fixed top-0 left-0 h-full z-40 w-64
        ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} 
        border-r transition-transform duration-300 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-lg text-blue-500">Pharmacy Finder</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg text-xl">✕</button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button onClick={() => { setActiveTab('search'); setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeTab === 'search' ? 'bg-blue-600 text-white' : ''}`}>
            <span>🔍</span> Search
          </button>
          <button onClick={() => { setActiveTab('favorites'); setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeTab === 'favorites' ? 'bg-blue-600 text-white' : ''}`}>
            <span>❤️</span> Favorites {favorites.length > 0 && `(${favorites.length})`}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full text-sm py-2 rounded-lg border border-slate-600">
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          {currentUser ? (
            <>
              <p className="text-sm truncate px-1">{currentUser.full_name}</p>
              <button onClick={logout} className="w-full text-sm text-red-400 py-2">Logout</button>
            </>
          ) : (
            <button onClick={() => { setShowAuth(true); setSidebarOpen(false); }} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm">
              Login / Register
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="min-h-screen">
        <header className="bg-blue-600 text-white p-4 sticky top-0 z-20">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="text-2xl leading-none">☰</button>
              <h1 className="text-xl font-bold">{activeTab === 'search' ? 'Search Medicines' : 'My Favorites'}</h1>
            </div>
            {currentUser && <p className="text-sm hidden sm:block">Hi, {currentUser.full_name}</p>}
          </div>
        </header>

        <div className="max-w-5xl mx-auto p-4">
          {showAuth && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className={`${card} rounded-2xl p-6 w-full max-w-md`}>
                <h2 className="text-xl font-bold mb-4">{isRegistering ? 'Create Account' : 'Login'}</h2>
                <form onSubmit={handleAuth} className="space-y-3">
                  {isRegistering && <input type="text" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full p-3 border rounded-xl bg-transparent" required />}
                  <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-3 border rounded-xl bg-transparent" required />
                  <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-3 border rounded-xl bg-transparent" required />
                  {authError && <p className="text-red-500 text-sm">{authError}</p>}
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium">{isRegistering ? 'Register' : 'Login'}</button>
                </form>
                <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-3 text-sm text-blue-500">{isRegistering ? 'Already have account? Login' : 'Need account? Register'}</button>
                <button onClick={() => setShowAuth(false)} className="w-full mt-2 text-sm text-slate-400">Cancel</button>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <>
              <div className={`${card} rounded-lg border p-4 mb-4 space-y-3`}>
                <div className="flex flex-wrap gap-3 items-center">
                  <button onClick={getMyLocation} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">📍 My Location</button>
                  <span className={`text-sm ${muted}`}>{locationStatus}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterOpenNow(!filterOpenNow)} className={`px-3 py-1.5 rounded-full text-sm border ${filterOpenNow ? 'bg-blue-600 text-white' : ''}`}>Open Now</button>
                  <button onClick={() => setFilter24hrs(!filter24hrs)} className={`px-3 py-1.5 rounded-full text-sm border ${filter24hrs ? 'bg-blue-600 text-white' : ''}`}>24 Hours</button>
                </div>
              </div>

              <div className={`${card} rounded-lg border p-4 mb-4`}>
                <p className="text-sm font-medium mb-2">Quick search:</p>
                <div className="flex flex-wrap gap-2">
                  {['headache', 'malaria', 'fever', 'cold', ...popularMedicines.slice(0,5)].map(item => (
                    <button key={item} onClick={() => handleSearch(item)} className="px-3 py-1.5 bg-blue-600/20 text-blue-500 rounded-full text-sm capitalize">{item}</button>
                  ))}
                </div>
              </div>

              <div className={`${card} rounded-lg border p-4 mb-4 relative`}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="Search medicine or symptom..."
                      className="w-full p-3 border rounded-lg bg-transparent"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className={`absolute z-20 w-full mt-1 rounded-xl border shadow-lg ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                        {suggestions.map(s => (
                          <button key={s} onClick={() => { setSearch(s); handleSearch(s); }} className="w-full text-left px-4 py-2.5 hover:bg-blue-600 hover:text-white text-sm capitalize">{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={startVoiceSearch} className={`px-4 py-3 rounded-lg ${isListening ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'}`}>{isListening ? '...' : '🎤'}</button>
                    <button onClick={() => handleSearch()} className="bg-blue-600 text-white px-6 py-3 rounded-lg">Search</button>
                  </div>
                </div>
              </div>

              {alternatives.length > 0 && hasSearched && (
                <div className={`${card} rounded-lg border p-4 mb-4`}>
                  <p className="text-sm font-medium mb-2">You may also try:</p>
                  <div className="flex flex-wrap gap-2">
                    {alternatives.map(a => (
                      <button key={a} onClick={() => handleSearch(a)} className="px-3 py-1.5 bg-amber-500/20 text-amber-600 rounded-full text-sm">{a}</button>
                    ))}
                  </div>
                </div>
              )}

              {hasSearched && results.length === 0 && !loading && (
                <div className={`${card} rounded-lg border p-10 text-center mb-4`}>
                  <div className="text-5xl mb-3">😔</div>
                  <h3 className="text-xl font-semibold mb-2">Currently Unavailable</h3>
                  <p className={`${muted} mb-4`}>No pharmacy has <strong>"{search}"</strong> right now.</p>
                  {notifySuccess ? (
                    <p className="text-green-500 font-medium">✓ You will be notified when available</p>
                  ) : (
                    <button onClick={requestNotify} disabled={notifyLoading} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium">
                      {notifyLoading ? 'Saving...' : '🔔 Notify Me'}
                    </button>
                  )}
                </div>
              )}

              {results.length > 0 && (
                <div className={`${card} rounded-lg border p-4 mb-4`}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Found in {results.length} pharmacies</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setSortBy('distance')} className={`px-3 py-1.5 rounded-lg text-sm ${sortBy === 'distance' ? 'bg-blue-600 text-white' : 'border'}`}>Distance</button>
                      <button onClick={() => setSortBy('price')} className={`px-3 py-1.5 rounded-lg text-sm ${sortBy === 'price' ? 'bg-blue-600 text-white' : 'border'}`}>Price</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {results.map(item => (
                      <div key={item.id} onClick={() => setSelectedPharmacy(item)} className={`border rounded-xl p-4 cursor-pointer ${selectedPharmacy?.id === item.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600/30'}`}>
                        <div className="flex justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-lg">{item.name}</h3>
                              <button onClick={e => { e.stopPropagation(); toggleFavorite(item); }}>{isFavorite(item.id) ? '❤️' : '🤍'}</button>
                              <button onClick={e => { e.stopPropagation(); sharePharmacy(item); }} className="text-sm px-2 py-0.5 border rounded-lg">Share</button>
                              {item.is24hrs && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">24hrs</span>}
                              {item.avgRating && <span className="flex items-center gap-1 text-sm"><StarRating rating={Number(item.avgRating)} /><span className={muted}>({item.reviewCount})</span></span>}
                            </div>
                            <p className={`text-sm ${muted}`}>{item.address}</p>
                            <p className={`text-sm ${muted}`}>{item.openHours}</p>
                            {item.distance !== null && <p className="text-blue-400 text-sm font-medium mt-1">📍 {item.distance} km</p>}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {item.phone && <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">📞 Call</a>}
                              {item.phone && <a href={`https://wa.me/233${item.phone.replace(/^0/, '')}?text=Hello, I want to buy ${item.medicineName}`} target="_blank" onClick={e => e.stopPropagation()} className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg">WhatsApp</a>}
                              {item.position && <a href={`https://www.google.com/maps/dir/?api=1&destination=${item.position[0]},${item.position[1]}`} target="_blank" onClick={e => e.stopPropagation()} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Directions</a>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-500 font-bold text-xl">GH₵{item.price}</p>
                            <p className={`text-sm ${muted}`}>{item.medicineName}</p>
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full mt-1 inline-block">In Stock</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPharmacy && (
                <div className={`${card} rounded-lg border p-5 mb-4 border-l-4 border-l-blue-500`}>
                  <div className="flex justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-bold">{selectedPharmacy.name}</h2>
                        <button onClick={() => toggleFavorite(selectedPharmacy)}>{isFavorite(selectedPharmacy.id) ? '❤️' : '🤍'}</button>
                        <button onClick={() => sharePharmacy(selectedPharmacy)} className="text-sm px-3 py-1 border rounded-lg">Share</button>
                      </div>
                      <p className={muted}>{selectedPharmacy.address}</p>
                      <p className={`text-sm ${muted}`}>{selectedPharmacy.openHours}</p>
                    </div>
                    <button onClick={() => setSelectedPharmacy(null)}>✕</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedPharmacy.phone && <a href={`tel:${selectedPharmacy.phone}`} className="px-4 py-2 bg-green-600 text-white rounded-lg">Call</a>}
                    {selectedPharmacy.phone && <a href={`https://wa.me/233${selectedPharmacy.phone.replace(/^0/, '')}`} target="_blank" className="px-4 py-2 bg-emerald-500 text-white rounded-lg">WhatsApp</a>}
                    {selectedPharmacy.position && <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPharmacy.position[0]},${selectedPharmacy.position[1]}`} target="_blank" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Directions</a>}
                  </div>
                  <h3 className="font-semibold mb-3">Medicines</h3>
                  <div className="space-y-2 mb-6">
                    {selectedPharmacy.medicines.map((med, i) => (
                      <div key={i} className={`flex justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className={`text-sm ${med.inStock ? 'text-green-500' : 'text-red-500'}`}>{med.inStock ? 'In Stock' : 'Out of Stock'}</p>
                        </div>
                        <p className="font-bold text-green-500">GH₵{med.price}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-600 pt-5">
                    <h3 className="font-semibold mb-4">Reviews</h3>
                    {currentUser ? (
                      <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                        <div className="flex gap-2 mb-3">
                          {[1,2,3,4,5].map(s => <button key={s} onClick={() => setNewRating(s)} className={`text-2xl ${s <= newRating ? 'text-yellow-500' : 'text-slate-500'}`}>★</button>)}
                        </div>
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Your experience..." className="w-full p-3 border rounded-xl mb-3 bg-transparent text-sm" rows={2} />
                        <button onClick={submitReview} disabled={reviewLoading} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm">{reviewLoading ? '...' : 'Submit Review'}</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAuth(true)} className="text-blue-500 text-sm mb-4">Login to review</button>
                    )}
                    <div className="space-y-3">
                      {pharmacyReviews.length === 0 ? <p className={`text-sm ${muted}`}>No reviews yet</p> : pharmacyReviews.map(r => (
                        <div key={r.id} className="border border-slate-600/40 rounded-xl p-4">
                          <div className="flex justify-between"><p className="font-medium text-sm">{r.users?.full_name || 'User'}</p><StarRating rating={r.rating} /></div>
                          {r.comment && <p className={`text-sm ${muted}`}>{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'favorites' && (
            <div className={`${card} rounded-lg border p-6`}>
              <h2 className="text-xl font-semibold mb-4">My Favorites</h2>
              {!currentUser ? (
                <div className="text-center py-10">
                  <button onClick={() => setShowAuth(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Login to see favorites</button>
                </div>
              ) : favorites.length === 0 ? (
                <p className={`text-center py-16 ${muted}`}>No favorites yet</p>
              ) : (
                <div className="space-y-3">
                  {favorites.map(fav => (
                    <div key={fav.id} className="border border-slate-600/30 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{fav.name}</h3>
                        <p className={`text-sm ${muted}`}>{fav.address}</p>
                      </div>
                      <div className="flex gap-2">
                        {fav.phone && <a href={`tel:${fav.phone}`} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">Call</a>}
                        <button onClick={() => sharePharmacy(fav)} className="px-3 py-1.5 border text-sm rounded-lg">Share</button>
                        <button onClick={() => toggleFavorite(fav)} className="px-3 py-1.5 text-red-400 text-sm">Remove</button>
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