'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentPharmacy, setCurrentPharmacy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('8:00 AM - 8:00 PM');
  const [is24hrs, setIs24hrs] = useState(false);

  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchLat, setBranchLat] = useState('');
  const [branchLng, setBranchLng] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchHours, setBranchHours] = useState('8:00 AM - 8:00 PM');
  const [branch24hrs, setBranch24hrs] = useState(false);

  const [medicines, setMedicines] = useState([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', price: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '' });

  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [stats, setStats] = useState({ totalMedicines: 0, inStock: 0, outOfStock: 0, lowStock: 0 });

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getLocation = (forBranch = false) => {
    setLocationStatus('Getting location...');
    if (!navigator.geolocation) {
      setLocationStatus('Location not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        if (forBranch) {
          setBranchLat(lat);
          setBranchLng(lng);
        } else {
          setLatitude(lat);
          setLongitude(lng);
        }
        setLocationStatus('Location found ✓');
      },
      () => setLocationStatus('Failed to get location. Please allow permission.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadInventory = async (pharmacyId) => {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('name');
    if (!error) {
      setMedicines(data || []);
      const total = data?.length || 0;
      const inStock = data?.filter(m => m.in_stock).length || 0;
      setStats({ totalMedicines: total, inStock, outOfStock: total - inStock, lowStock: total - inStock });
    }
  };

  useEffect(() => {
    if (currentPharmacy) loadInventory(currentPharmacy.id);
  }, [currentPharmacy]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('name', pharmacyName.trim())
      .eq('password', authPassword)
      .single();
    setLoading(false);
    if (error || !data) setLoginError('Invalid name or password.');
    else {
      setCurrentPharmacy(data);
      showSuccess(`Welcome, ${data.name}!`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!pharmacyName || !pharmacyAddress || !authPassword) return alert('Please fill required fields');
    setLoading(true);
    const { data, error } = await supabase
      .from('pharmacies')
      .insert([{
        name: pharmacyName.trim(),
        address: pharmacyAddress.trim(),
        password: authPassword,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        phone: phone || null,
        opening_hours: openingHours,
        is_24hrs: is24hrs,
        is_open: true,
        owner_name: pharmacyName.trim()
      }])
      .select()
      .single();
    setLoading(false);
    if (error) alert('Registration Failed: ' + error.message);
    else {
      setCurrentPharmacy(data);
      showSuccess('Pharmacy registered successfully!');
    }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!branchName || !branchAddress) return alert('Fill branch name and address');
    setLoading(true);
    const { data, error } = await supabase
      .from('pharmacies')
      .insert([{
        name: branchName.trim(),
        address: branchAddress.trim(),
        password: currentPharmacy.password,
        owner_name: currentPharmacy.owner_name || currentPharmacy.name,
        latitude: branchLat ? parseFloat(branchLat) : null,
        longitude: branchLng ? parseFloat(branchLng) : null,
        phone: branchPhone || null,
        opening_hours: branchHours,
        is_24hrs: branch24hrs,
        is_open: true
      }])
      .select()
      .single();
    setLoading(false);
    if (error) alert('Failed: ' + error.message);
    else {
      showSuccess(`Branch "${data.name}" added!`);
      setShowAddBranch(false);
      setBranchName(''); setBranchAddress(''); setBranchLat(''); setBranchLng('');
      setBranchPhone(''); setBranchHours('8:00 AM - 8:00 PM'); setBranch24hrs(false);
    }
  };

  const addMedicine = async (e) => {
    e.preventDefault();
    if (!newMedicine.name || !newMedicine.price) return alert('Fill fields');
    setLoading(true);
    const { error } = await supabase.from('medicines').insert([{
      pharmacy_id: currentPharmacy.id,
      name: newMedicine.name.trim(),
      price: parseFloat(newMedicine.price),
      in_stock: true
    }]);
    setLoading(false);
    if (error) alert(error.message);
    else {
      showSuccess('Medicine added!');
      setNewMedicine({ name: '', price: '' });
      loadInventory(currentPharmacy.id);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return alert('Paste medicines first');
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    const items = [];
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const price = parseFloat(parts[1]);
        if (name && !isNaN(price)) items.push({ pharmacy_id: currentPharmacy.id, name, price, in_stock: true });
      }
    }
    if (items.length === 0) return alert('Use format: Name, Price');
    setLoading(true);
    const { error } = await supabase.from('medicines').insert(items);
    setLoading(false);
    if (error) alert(error.message);
    else {
      showSuccess(`${items.length} medicines added!`);
      setBulkText('');
      setShowBulk(false);
      loadInventory(currentPharmacy.id);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, price: item.price });
  };

  const saveEdit = async (id) => {
    if (!editForm.name || !editForm.price) return alert('Fill both fields');
    setLoading(true);
    const { error } = await supabase.from('medicines').update({ name: editForm.name.trim(), price: parseFloat(editForm.price) }).eq('id', id);
    setLoading(false);
    if (error) alert(error.message);
    else {
      showSuccess('Updated!');
      setEditingId(null);
      loadInventory(currentPharmacy.id);
    }
  };

  const toggleStock = async (item) => {
    await supabase.from('medicines').update({ in_stock: !item.in_stock }).eq('id', item.id);
    loadInventory(currentPharmacy.id);
  };

  const deleteMedicine = async (item) => {
    if (confirm(`Remove "${item.name}"?`)) {
      await supabase.from('medicines').delete().eq('id', item.id);
      loadInventory(currentPharmacy.id);
    }
  };

  if (!currentPharmacy) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-800">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border">
          <h1 className="text-2xl font-bold text-center mb-2">Pharmacy Admin</h1>
          <p className="text-center text-slate-500 text-sm mb-6">{isRegistering ? 'Register your pharmacy' : 'Partner Sign In'}</p>
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <input type="text" value={pharmacyName} onChange={e => setPharmacyName(e.target.value)} placeholder="Pharmacy Name" className="w-full p-3 border rounded-xl" required />
            {isRegistering && (
              <>
                <input type="text" value={pharmacyAddress} onChange={e => setPharmacyAddress(e.target.value)} placeholder="Physical Address" className="w-full p-3 border rounded-xl" required />
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (e.g. 0244123456)" className="w-full p-3 border rounded-xl" />
                <input type="text" value={openingHours} onChange={e => setOpeningHours(e.target.value)} placeholder="Opening Hours" className="w-full p-3 border rounded-xl" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={is24hrs} onChange={e => setIs24hrs(e.target.checked)} /> Open 24 Hours
                </label>

                {/* USE MY LOCATION */}
                <div className="space-y-2">
                  <button type="button" onClick={() => getLocation(false)} className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium">
                    📍 Use My Current Location
                  </button>
                  {locationStatus && <p className="text-xs text-slate-600">{locationStatus}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" className="w-full p-3 border rounded-xl" />
                    <input type="text" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" className="w-full p-3 border rounded-xl" />
                  </div>
                </div>
              </>
            )}
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded-xl" required />
            {loginError && <p className="text-red-600 text-xs">{loginError}</p>}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
              {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Login'}
            </button>
          </form>
          <button onClick={() => { setIsRegistering(!isRegistering); setLoginError(''); }} className="w-full mt-4 text-center text-sm text-blue-600 font-semibold">
            {isRegistering ? 'Have an account? Log in' : 'Register your pharmacy'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-xl">
          <div>
            <h1 className="text-xl font-bold">{currentPharmacy.name}</h1>
            <p className="text-blue-100 text-xs">{currentPharmacy.address}{currentPharmacy.phone && ` • ${currentPharmacy.phone}`}</p>
          </div>
          <button onClick={() => setCurrentPharmacy(null)} className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-medium">Logout</button>
        </div>

        {successMessage && <div className="p-3 bg-green-100 border border-green-300 rounded-xl text-green-800 font-medium">✓ {successMessage}</div>}

        {/* Analytics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border text-center"><p className="text-2xl font-bold text-blue-600">{stats.totalMedicines}</p><p className="text-xs text-slate-500">Total</p></div>
          <div className="bg-white p-4 rounded-xl border text-center"><p className="text-2xl font-bold text-green-600">{stats.inStock}</p><p className="text-xs text-slate-500">In Stock</p></div>
          <div className="bg-white p-4 rounded-xl border text-center"><p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p><p className="text-xs text-slate-500">Out of Stock</p></div>
          <div className="bg-white p-4 rounded-xl border text-center"><p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p><p className="text-xs text-slate-500">Low Stock</p></div>
        </div>

        {stats.outOfStock > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800">Low Stock Alert</p>
              <p className="text-sm text-amber-700">{stats.outOfStock} medicine(s) out of stock</p>
            </div>
          </div>
        )}

        {/* Branches */}
        <div className="bg-white p-5 rounded-xl border">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Branches</h2>
            <button onClick={() => setShowAddBranch(!showAddBranch)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">{showAddBranch ? 'Cancel' : '+ Add Branch'}</button>
          </div>
          {showAddBranch && (
            <form onSubmit={handleAddBranch} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
              <input type="text" placeholder="Branch Name" value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
              <input type="text" placeholder="Address" value={branchAddress} onChange={e => setBranchAddress(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
              <input type="text" placeholder="Phone" value={branchPhone} onChange={e => setBranchPhone(e.target.value)} className="w-full p-2.5 border rounded-xl" />
              <input type="text" placeholder="Opening Hours" value={branchHours} onChange={e => setBranchHours(e.target.value)} className="w-full p-2.5 border rounded-xl" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={branch24hrs} onChange={e => setBranch24hrs(e.target.checked)} /> Open 24 Hours</label>
              
              <button type="button" onClick={() => getLocation(true)} className="w-full bg-green-600 text-white py-2 rounded-xl text-sm">📍 Use My Location for Branch</button>
              {locationStatus && <p className="text-xs text-slate-600">{locationStatus}</p>}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Latitude" value={branchLat} onChange={e => setBranchLat(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                <input type="text" placeholder="Longitude" value={branchLng} onChange={e => setBranchLng(e.target.value)} className="w-full p-2.5 border rounded-xl" />
              </div>
              <button type="submit" disabled={loading} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">{loading ? 'Adding...' : 'Create Branch'}</button>
            </form>
          )}
        </div>

        {/* Add Medicine */}
        <div className="bg-white p-5 rounded-xl border space-y-4">
          <h2 className="text-lg font-bold">Add Medicine</h2>
          <form onSubmit={addMedicine} className="bg-slate-50 p-4 rounded-xl flex flex-col md:flex-row gap-3 border">
            <input type="text" placeholder="Drug Name" value={newMedicine.name} onChange={e => setNewMedicine({...newMedicine, name: e.target.value})} className="flex-1 p-2.5 border rounded-xl" required />
            <input type="number" step="0.01" placeholder="Price" value={newMedicine.price} onChange={e => setNewMedicine({...newMedicine, price: e.target.value})} className="w-full md:w-32 p-2.5 border rounded-xl" required />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Add</button>
          </form>
        </div>

        {/* Bulk Add */}
        <div className="bg-white p-5 rounded-xl border">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Bulk Add Medicines</h2>
            <button onClick={() => setShowBulk(!showBulk)} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm">{showBulk ? 'Cancel' : '📦 Bulk Add'}</button>
          </div>
          {showBulk && (
            <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
              <p className="text-sm text-slate-600">Format (one per line): <code className="bg-slate-200 px-1 rounded">Paracetamol, 8</code></p>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={"Paracetamol, 8\nAmoxicillin, 25"} className="w-full p-3 border rounded-xl h-36 text-sm font-mono" />
              <button onClick={handleBulkAdd} disabled={loading} className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">{loading ? 'Adding...' : 'Add All'}</button>
            </div>
          )}
        </div>

        {/* Inventory Table */}
        <div className="bg-white p-5 rounded-xl border">
          <h2 className="text-lg font-bold mb-4">Inventory ({medicines.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-400 text-xs uppercase">
                  <th className="pb-2 text-left">Name</th>
                  <th className="pb-2 text-left">Price</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {medicines.map(item => (
                  <tr key={item.id} className={!item.in_stock ? 'bg-red-50' : ''}>
                    {editingId === item.id ? (
                      <>
                        <td className="py-3"><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-1.5 border rounded" /></td>
                        <td className="py-3"><input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-20 p-1.5 border rounded" /></td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${item.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.in_stock ? 'In Stock' : 'Out'}</span></td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => saveEdit(item.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">Save</button>
                          <button onClick={() => setEditingId(null)} className="bg-slate-200 px-3 py-1 rounded text-xs">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 font-semibold">{item.name}</td>
                        <td className="py-3">GH₵{Number(item.price).toFixed(2)}</td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${item.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.in_stock ? 'In Stock' : 'Out of Stock'}</span></td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => startEdit(item)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Edit</button>
                          <button onClick={() => toggleStock(item)} className="bg-slate-100 px-2 py-1 rounded text-xs">{item.in_stock ? 'Mark Out' : 'Mark In'}</button>
                          <button onClick={() => deleteMedicine(item)} className="text-red-500 text-xs">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {medicines.length === 0 && <tr><td colSpan="4" className="text-center py-6 text-slate-400">No medicines yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}