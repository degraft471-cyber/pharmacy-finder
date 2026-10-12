'use client';

import { useState, useEffect } from 'react';

const ADMIN_PASSWORD = "pharmacy123";

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(1);
  const [medicines, setMedicines] = useState([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', price: '', inStock: true });

  const pharmacyList = [
    { id: 1, name: "HealthPlus Pharmacy" },
    { id: 2, name: "MedCare Pharmacy" },
    { id: 3, name: "CityCare Pharmacy" },
    { id: 4, name: "GreenLife Pharmacy" },
    { id: 5, name: "Cape Health Pharmacy" },
  ];

  useEffect(() => {
    if (isLoggedIn) {
      const saved = localStorage.getItem(`pharmacy_${selectedPharmacyId}_medicines`);
      if (saved) {
        setMedicines(JSON.parse(saved));
      } else {
        setMedicines([
          { name: "Paracetamol", price: 8, inStock: true },
          { name: "Amoxicillin", price: 25, inStock: true },
        ]);
      }
    }
  }, [selectedPharmacyId, isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Wrong password. Try again.');
    }
  };

  const saveMedicines = (updatedList) => {
    setMedicines(updatedList);
    localStorage.setItem(`pharmacy_${selectedPharmacyId}_medicines`, JSON.stringify(updatedList));
  };

  const addMedicine = () => {
    if (!newMedicine.name || !newMedicine.price) return;

    const updated = [...medicines, {
      name: newMedicine.name,
      price: Number(newMedicine.price),
      inStock: newMedicine.inStock
    }];
    saveMedicines(updated);
    setNewMedicine({ name: '', price: '', inStock: true });
  };

  const toggleStock = (index) => {
    const updated = [...medicines];
    updated[index].inStock = !updated[index].inStock;
    saveMedicines(updated);
  };

  const updatePrice = (index, newPrice) => {
    const updated = [...medicines];
    updated[index].price = Number(newPrice);
    saveMedicines(updated);
  };

  const deleteMedicine = (index) => {
    const updated = medicines.filter((_, i) => i !== index);
    saveMedicines(updated);
  };

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-slate-200">
          <h1 className="text-2xl font-bold text-center mb-6 text-slate-800">Pharmacy Admin Login</h1>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                placeholder="Enter admin password"
              />
            </div>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Login
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-4">
            Demo password: <strong className="text-slate-800">pharmacy123</strong>
          </p>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Pharmacy Admin Dashboard</h1>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">

        {/* Select Pharmacy */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Pharmacy</label>
          <select
            value={selectedPharmacyId}
            onChange={(e) => setSelectedPharmacyId(Number(e.target.value))}
            className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white"
          >
            {pharmacyList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Add New Medicine */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3 text-slate-800">Add New Medicine</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Medicine name"
              value={newMedicine.name}
              onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
              className="p-3 border border-slate-300 rounded-lg text-slate-800"
            />
            <input
              type="number"
              placeholder="Price (GH₵)"
              value={newMedicine.price}
              onChange={(e) => setNewMedicine({...newMedicine, price: e.target.value})}
              className="p-3 border border-slate-300 rounded-lg text-slate-800"
            />
            <select
              value={newMedicine.inStock}
              onChange={(e) => setNewMedicine({...newMedicine, inStock: e.target.value === 'true'})}
              className="p-3 border border-slate-300 rounded-lg text-slate-800"
            >
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
            <button
              onClick={addMedicine}
              className="bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Current Medicines */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Current Medicines</h2>

          {medicines.length === 0 ? (
            <p className="text-slate-600">No medicines yet. Add some above.</p>
          ) : (
            <div className="space-y-3">
              {medicines.map((med, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{med.name}</p>
                    <p className={`text-sm font-medium ${med.inStock ? 'text-green-700' : 'text-red-600'}`}>
                      {med.inStock ? 'In Stock' : 'Out of Stock'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">GH₵</span>
                      <input
                        type="number"
                        value={med.price}
                        onChange={(e) => updatePrice(index, e.target.value)}
                        className="w-20 p-2 border border-slate-300 rounded-lg text-center text-slate-800"
                      />
                    </div>

                    <button
                      onClick={() => toggleStock(index)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        med.inStock 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {med.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </button>

                    <button
                      onClick={() => deleteMedicine(index)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}