'use client';

import { useState } from 'react';

const initialPharmacies = [
  { id: 1, name: 'Medicare Pharmacy', address: 'Cantonments Road, Accra', phone: '0208111243' },
  { id: 2, name: 'GreenLife Pharmacy', address: 'Kaneshie Market Road, Kaneshie', phone: '0551122334' }
];

const initialMedicines = [
  { id: 101, pharmacy_id: 1, name: 'Amoxicillin 500mg', price: 25.00, in_stock: true },
  { id: 102, pharmacy_id: 1, name: 'Paracetamol', price: 10.00, in_stock: true },
  { id: 103, pharmacy_id: 1, name: 'Vitamin C', price: 15.00, in_stock: false },
  { id: 104, pharmacy_id: 2, name: 'Amoxicillin 500mg', price: 22.50, in_stock: true }
];

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pharmacies, setPharmacies] = useState(initialPharmacies);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(1);
  const [medicines, setMedicines] = useState(initialMedicines);
  const [successMessage, setSuccessMessage] = useState('');

  const [newMedicine, setNewMedicine] = useState({ name: '', price: '' });

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "pharmacy123") {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Wrong password');
    }
  };

  const addMedicine = (e) => {
    e.preventDefault();
    if (!newMedicine.name || !newMedicine.price) {
      alert('Please fill in medicine name and price');
      return;
    }
    const newItem = {
      id: Date.now(),
      pharmacy_id: selectedPharmacyId,
      name: newMedicine.name,
      price: parseFloat(newMedicine.price),
      in_stock: true
    };
    setMedicines([...medicines, newItem]);
    setNewMedicine({ name: '', price: '' });
    showSuccess('Medicine added successfully!');
  };

  const toggleStock = (id) => {
    setMedicines(medicines.map(med => 
      med.id === id ? { ...med, in_stock: !med.in_stock } : med
    ));
    showSuccess('Stock status updated!');
  };

  const deleteMedicine = (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setMedicines(medicines.filter(med => med.id !== id));
    showSuccess('Medicine removed from inventory.');
  };

  const activeMedicines = medicines.filter(m => m.pharmacy_id === selectedPharmacyId);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-800">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-slate-200">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">💊</div>
            <h1 className="text-2xl font-bold text-slate-800">Pharmacy Admin</h1>
            <p className="text-slate-500 text-sm">Manage pharmacies & medicines</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 border border-slate-300 rounded-xl mb-3 text-slate-800 bg-white"
            />
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition">
              Login
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">Password: <strong>pharmacy123</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-12">
      <header className="bg-blue-600 text-white p-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">SmartMed Portal</h1>
            <p className="text-blue-100 text-sm">Active Dashboard Preview</p>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-50 transition">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-5">
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium animate-fade-in">
            ✓ {successMessage}
          </div>
        )}

        {/* PHARMACY SELECTOR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-2">Select Active Pharmacy Branch</h2>
          <select 
            value={selectedPharmacyId} 
            onChange={(e) => setSelectedPharmacyId(Number(e.target.value))}
            className="p-3 border rounded-xl bg-slate-50 text-slate-800 w-full max-w-xs outline-none focus:border-blue-500 transition"
          >
            {pharmacies.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* INVENTORY TRACKER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Manage Drug Inventory</h2>
          
          {/* Quick Add Form */}
          <form onSubmit={addMedicine} className="bg-slate-50 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-end gap-3 border border-slate-200">
            <div className="w-full">
              <label className="text-xs font-bold text-slate-500 block mb-1">Medicine Name</label>
              <input
                type="text"
                placeholder="e.g., Amoxicillin 500mg"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                className="w-full p-2.5 border rounded-xl text-slate-800 bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-bold text-slate-500 block mb-1">Price (GHC)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newMedicine.price}
                onChange={(e) => setNewMedicine({...newMedicine, price: e.target.value})}
                className="w-full p-2.5 border rounded-xl text-slate-800 bg-white outline-none focus:border-blue-500"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap">
              + Add Item
            </button>
          </form>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 text-left font-semibold">Drug Details</th>
                  <th className="pb-3 text-left font-semibold">Price</th>
                  <th className="pb-3 text-left font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMedicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 font-semibold text-slate-800">{med.name}</td>
                    <td className="py-4 text-slate-600 font-medium">GHC {med.price.toFixed(2)}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${med.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {med.in_stock ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => toggleStock(med.id)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        Toggle Stock
                      </button>
                      <button
                        onClick={() => deleteMedicine(med.id, med.name)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline px-2 py-1.5 font-medium transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {activeMedicines.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-400 text-sm font-medium">
                      No items in this pharmacy inventory yet. Add one above!
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
