'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentPharmacy, setCurrentPharmacy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Coordinates
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationStatus, setLocationStatus] = useState('');

  // For adding a new branch
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchLat, setBranchLat] = useState('');
  const [branchLng, setBranchLng] = useState('');
  const [branchLocationStatus, setBranchLocationStatus] = useState('');

  const [medicines, setMedicines] = useState([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', price: '' });

  // For editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '' });

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const loadInventory = async (pharmacyId) => {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('name');
    if (!error) setMedicines(data || []);
  };

  useEffect(() => {
    if (currentPharmacy) loadInventory(currentPharmacy.id);
  }, [currentPharmacy]);

  // ========== GET CURRENT LOCATION ==========
  const getCurrentLocation = (isBranch = false) => {
    if (isBranch) {
      setBranchLocationStatus('Getting location...');
    } else {
      setLocationStatus('Getting location...');
    }

    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser';
      isBranch ? setBranchLocationStatus(msg) : setLocationStatus(msg);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        if (isBranch) {
          setBranchLat(lat);
          setBranchLng(lng);
          setBranchLocationStatus('Location captured ✓');
        } else {
          setLatitude(lat);
          setLongitude(lng);
          setLocationStatus('Location captured ✓');
        }
      },
      () => {
        const msg = 'Unable to get location. Please allow location permission.';
        isBranch ? setBranchLocationStatus(msg) : setLocationStatus(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ========== LOGIN ==========
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

    if (error || !data) {
      setLoginError('Invalid name or password.');
    } else {
      setCurrentPharmacy(data);
      showSuccess(`Welcome, ${data.name}!`);
    }
  };

  // ========== REGISTER MAIN PHARMACY ==========
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!pharmacyName || !pharmacyAddress || !authPassword) {
      return alert('Please fill all required fields');
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('pharmacies')
      .insert([{
        name: pharmacyName.trim(),
        address: pharmacyAddress.trim(),
        phone: pharmacyPhone.trim() || null,
        password: authPassword,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        owner_name: pharmacyName.trim()
      }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert('Registration Failed: ' + error.message);
    } else {
      setCurrentPharmacy(data);
      showSuccess('Pharmacy registered successfully!');
    }
  };

  // ========== ADD SUB BRANCH ==========
  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!branchName || !branchAddress) return alert('Fill branch name and address');

    setLoading(true);

    const { data, error } = await supabase
      .from('pharmacies')
      .insert([{
        name: branchName.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim() || null,
        password: currentPharmacy.password,
        owner_name: currentPharmacy.owner_name || currentPharmacy.name,
        latitude: branchLat ? parseFloat(branchLat) : null,
        longitude: branchLng ? parseFloat(branchLng) : null
      }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert('Failed to add branch: ' + error.message);
    } else {
      showSuccess(`Branch "${data.name}" added successfully!`);
      setShowAddBranch(false);
      setBranchName('');
      setBranchAddress('');
      setBranchPhone('');
      setBranchLat('');
      setBranchLng('');
      setBranchLocationStatus('');
    }
  };

  // ========== ADD MEDICINE ==========
  const addMedicine = async (e) => {
    e.preventDefault();
    if (!newMedicine.name || !newMedicine.price || !currentPharmacy) return alert('Fill fields');
    
    setLoading(true);
    const { error } = await supabase.from('medicines').insert([{
      pharmacy_id: currentPharmacy.id,
      name: newMedicine.name.trim(),
      price: parseFloat(newMedicine.price),
      in_stock: true
    }]);
    setLoading(false);

    if (error) {
      alert('Insert Blocked: ' + error.message);
    } else {
      showSuccess('Item published live!');
      setNewMedicine({ name: '', price: '' });
      loadInventory(currentPharmacy.id);
    }
  };

  // ========== EDIT MEDICINE ==========
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, price: item.price });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', price: '' });
  };

  const saveEdit = async (id) => {
    if (!editForm.name || !editForm.price) return alert('Fill both fields');
    setLoading(true);
    const { error } = await supabase
      .from('medicines')
      .update({
        name: editForm.name.trim(),
        price: parseFloat(editForm.price)
      })
      .eq('id', id);
    setLoading(false);

    if (error) {
      alert('Update failed: ' + error.message);
    } else {
      showSuccess('Drug updated successfully!');
      setEditingId(null);
      loadInventory(currentPharmacy.id);
    }
  };

  const toggleStock = async (item) => {
    await supabase
      .from('medicines')
      .update({ in_stock: !item.in_stock })
      .eq('id', item.id);
    loadInventory(currentPharmacy.id);
  };

  const deleteMedicine = async (item) => {
    if (confirm(`Remove "${item.name}"?`)) {
      await supabase.from('medicines').delete().eq('id', item.id);
      loadInventory(currentPharmacy.id);
    }
  };

  // ==================== LOGIN / REGISTER SCREEN ====================
  if (!currentPharmacy) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-800">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">SmartMed Portals</h1>
          <p className="text-center text-slate-500 text-sm mb-6">
            {isRegistering ? 'Register Pharmacy Account' : 'Partner Sign In'}
          </p>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder="Pharmacy Name"
              className="w-full p-3 border rounded-xl bg-white outline-none"
              required
            />

            {isRegistering && (
              <>
                <input
                  type="text"
                  value={pharmacyAddress}
                  onChange={(e) => setPharmacyAddress(e.target.value)}
                  placeholder="Physical Address"
                  className="w-full p-3 border rounded-xl bg-white outline-none"
                  required
                />

                <input
                  type="tel"
                  value={pharmacyPhone}
                  onChange={(e) => setPharmacyPhone(e.target.value)}
                  placeholder="Phone Number (e.g. 0244123456)"
                  className="w-full p-3 border rounded-xl bg-white outline-none"
                />

                {/* Location Section */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => getCurrentLocation(false)}
                    className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-green-700"
                  >
                    📍 Use Current Location
                  </button>

                  {locationStatus && (
                    <p className={`text-xs text-center ${locationStatus.includes('✓') ? 'text-green-600' : 'text-slate-500'}`}>
                      {locationStatus}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Latitude"
                      className="w-full p-3 border rounded-xl bg-white outline-none text-sm"
                    />
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Longitude"
                      className="w-full p-3 border rounded-xl bg-white outline-none text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 border rounded-xl bg-white outline-none"
              required
            />

            {loginError && <p className="text-red-600 text-xs">{loginError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold transition shadow-md"
            >
              {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Login'}
            </button>
          </form>

          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setLoginError('');
              setLocationStatus('');
            }}
            className="w-full mt-4 text-center text-sm text-blue-600 font-semibold hover:underline"
          >
            {isRegistering ? 'Have an account? Log in' : 'Register your branch here'}
          </button>
        </div>
      </div>
    );
  }

  // ==================== DASHBOARD ====================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-xl shadow">
          <div>
            <h1 className="text-xl font-bold">{currentPharmacy.name}</h1>
            <p className="text-blue-100 text-xs">
              {currentPharmacy.address}
              {currentPharmacy.phone && ` • ${currentPharmacy.phone}`}
              {currentPharmacy.latitude && (
                <span> • {currentPharmacy.latitude}, {currentPharmacy.longitude}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setCurrentPharmacy(null)}
            className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-medium"
          >
            Logout
          </button>
        </div>

        {successMessage && (
          <div className="p-3 bg-green-100 border border-green-300 rounded-xl text-green-800 font-medium">
            ✓ {successMessage}
          </div>
        )}

        {/* Add Branch Section */}
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Branches</h2>
            <button
              onClick={() => setShowAddBranch(!showAddBranch)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              {showAddBranch ? 'Cancel' : '+ Add Sub Branch'}
            </button>
          </div>

          {showAddBranch && (
            <form onSubmit={handleAddBranch} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
              <input
                type="text"
                placeholder="Branch Name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-white outline-none"
                required
              />
              <input
                type="text"
                placeholder="Branch Address"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-white outline-none"
                required
              />
              <input
                type="tel"
                placeholder="Branch Phone Number"
                value={branchPhone}
                onChange={(e) => setBranchPhone(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-white outline-none"
              />

              {/* Branch Location */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => getCurrentLocation(true)}
                  className="w-full bg-green-600 text-white py-2 rounded-xl font-medium text-sm hover:bg-green-700"
                >
                  📍 Use Current Location
                </button>

                {branchLocationStatus && (
                  <p className={`text-xs text-center ${branchLocationStatus.includes('✓') ? 'text-green-600' : 'text-slate-500'}`}>
                    {branchLocationStatus}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={branchLat}
                    onChange={(e) => setBranchLat(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white outline-none text-sm"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={branchLng}
                    onChange={(e) => setBranchLng(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
              >
                {loading ? 'Adding...' : 'Create Branch'}
              </button>
            </form>
          )}
        </div>

        {/* Add Medicine Section */}
        <div className="bg-white p-5 rounded-xl border space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Add Available Drug Listings</h2>

          <form onSubmit={addMedicine} className="bg-slate-50 p-4 rounded-xl flex flex-col md:flex-row gap-3 border items-end">
            <div className="w-full">
              <input
                type="text"
                placeholder="Drug Name"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                className="w-full p-2.5 border rounded-xl bg-white outline-none"
                required
              />
            </div>
            <div className="w-full md:w-36">
              <input
                type="number"
                step="0.01"
                placeholder="Price (GHC)"
                value={newMedicine.price}
                onChange={(e) => setNewMedicine({ ...newMedicine, price: e.target.value })}
                className="w-full p-2.5 border rounded-xl bg-white outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
            >
              Publish Live
            </button>
          </form>

          {/* Medicines Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-slate-400 text-xs uppercase">
                  <th className="pb-2 text-left">Drug Name</th>
                  <th className="pb-2 text-left">Price</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {medicines.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {editingId === item.id ? (
                      <>
                        <td className="py-3">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full p-1.5 border rounded"
                          />
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            className="w-24 p-1.5 border rounded"
                          />
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.in_stock ? 'Available' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => saveEdit(item.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                            Save
                          </button>
                          <button onClick={cancelEdit} className="bg-slate-200 px-3 py-1 rounded text-xs">
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-3 text-slate-600">GHC {Number(item.price).toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.in_stock ? 'Available' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => startEdit(item)} className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs">
                            Edit
                          </button>
                          <button onClick={() => toggleStock(item)} className="bg-slate-100 border p-1 rounded text-xs">
                            Toggle
                          </button>
                          <button onClick={() => deleteMedicine(item)} className="text-red-500 font-medium text-xs">
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {medicines.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-400">
                      Inventory is empty. Add drugs above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}