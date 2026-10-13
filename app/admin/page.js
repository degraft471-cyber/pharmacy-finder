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
  const [authPassword, setAuthPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // New fields
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('8:00 AM - 8:00 PM');
  const [is24hrs, setIs24hrs] = useState(false);

  // For adding a new branch
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
    if (error) {
      alert('Registration Failed: ' + error.message);
    } else {
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
    if (error) {
      alert('Failed to add branch: ' + error.message);
    } else {
      showSuccess(`Branch "${data.name}" added successfully!`);
      setShowAddBranch(false);
      setBranchName('');
      setBranchAddress('');
      setBranchLat('');
      setBranchLng('');
      setBranchPhone('');
      setBranchHours('8:00 AM - 8:00 PM');
      setBranch24hrs(false);
    }
  };

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
      .update({ name: editForm.name.trim(), price: parseFloat(editForm.price) })
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
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">SmartMed Portals</h1>
          <p className="text-center text-slate-500 text-sm mb-6">
            {isRegistering ? 'Register Pharmacy Account' : 'Partner Sign In'}
          </p>
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <input type="text" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} placeholder="Pharmacy Name" className="w-full p-3 border rounded-xl bg-white outline-none" required />
            {isRegistering && (
              <>
                <input type="text" value={pharmacyAddress} onChange={(e) => setPharmacyAddress(e.target.value)} placeholder="Physical Address" className="w-full p-3 border rounded-xl bg-white outline-none" required />
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number (e.g. 0244123456)" className="w-full p-3 border rounded-xl bg-white outline-none" />
                <input type="text" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="Opening Hours" className="w-full p-3 border rounded-xl bg-white outline-none" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={is24hrs} onChange={(e) => setIs24hrs(e.target.checked)} />
                  Open 24 Hours
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" className="w-full p-3 border rounded-xl bg-white outline-none" />
                  <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" className="w-full p-3 border rounded-xl bg-white outline-none" />
                </div>
              </>
            )}
            <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded-xl bg-white outline-none" required />
            {loginError && <p className="text-red-600 text-xs">{loginError}</p>}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold transition shadow-md">
              {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Login'}
            </button>
          </form>
          <button onClick={() => { setIsRegistering(!isRegistering); setLoginError(''); }} className="w-full mt-4 text-center text-sm text-blue-600 font-semibold hover:underline">
            {isRegistering ? 'Have an account? Log in' : 'Register your branch here'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-xl shadow">
          <div>
            <h1 className="text-xl font-bold">{currentPharmacy.name}</h1>
            <p className="text-blue-100 text-xs">
              {currentPharmacy.address}
              {currentPharmacy.phone && ` • ${currentPharmacy.phone}`}
            </p>
          </div>
          <button onClick={() => setCurrentPharmacy(null)} className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-medium">Logout</button>
        </div>

        {successMessage && (
          <div className="p-3 bg-green-100 border border-green-300 rounded-xl text-green-800 font-medium">✓ {successMessage}</div>
        )}

        {/* Add Branch */}
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Branches</h2>
            <button onClick={() => setShowAddBranch(!showAddBranch)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
              {showAddBranch ? 'Cancel' : '+ Add Sub Branch'}
            </button>
          </div>
          {showAddBranch && (
            <form onSubmit={handleAddBranch} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
              <input type="text" placeholder="Branch Name" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none" required />
              <input type="text" placeholder="Branch Address" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none" required />
              <input type="text" placeholder="Phone Number" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none" />
              <input type="text" placeholder="Opening Hours" value={branchHours} onChange={(e) => setBranchHours(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={branch24hrs} onChange={(e) => setBranch24hrs(e.target.checked)} />
                Open 24 Hours
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="any" placeholder="Latitude" value={branchLat} onChange={(e) => setBranchLat(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none" />
                <input type="number" step="any" placeholder="Longitude" value={branchLng} onChange={(e) => setBranchLng(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none" />
              </div>
              <button type="submit" disabled={loading} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
                {loading ? 'Adding...' : 'Create Branch'}
              </button>
            </form>
          )}
        </div>

        {/* Add Medicine */}
        <div className="bg-white p-5 rounded-xl border space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Add Available Drug Listings</h2>
          <form onSubmit={addMedicine} className="bg-slate-50 p-4 rounded-xl flex flex-col md:flex-row gap-3 border items-end">
            <div className="w-full">
              <input type="text" placeholder="Drug Name" value={newMedicine.name} onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })} className="w-full p-2.5 border rounded-xl bg-white outline-none" required />
            </div>
            <div className="w-full md:w-36">
              <input type="number" step="0.01" placeholder="Price (GHC)" value={newMedicine.price} onChange={(e) => setNewMedicine({ ...newMedicine, price: e.target.value })} className="w-full p-2.5 border rounded-xl bg-white outline-none" required />
            </div>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">Publish Live</button>
          </form>

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
                        <td className="py-3"><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-1.5 border rounded" /></td>
                        <td className="py-3"><input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="w-24 p-1.5 border rounded" /></td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${item.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.in_stock ? 'Available' : 'Out of Stock'}</span></td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => saveEdit(item.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">Save</button>
                          <button onClick={cancelEdit} className="bg-slate-200 px-3 py-1 rounded text-xs">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-3 text-slate-600">GHC {Number(item.price).toFixed(2)}</td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${item.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.in_stock ? 'Available' : 'Out of Stock'}</span></td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => startEdit(item)} className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs">Edit</button>
                          <button onClick={() => toggleStock(item)} className="bg-slate-100 border p-1 rounded text-xs">Toggle</button>
                          <button onClick={() => deleteMedicine(item)} className="text-red-500 font-medium text-xs">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {medicines.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-6 text-slate-400">Inventory is empty. Add drugs above!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}