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
  const [successMessage, setSuccessMessage] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', inStock: true });

  const pharmacyList = [
    { id: 1, name: "HealthPlus Pharmacy" },
    { id: 2, name: "MedCare Pharmacy" },
    { id: 3, name: "CityCare Pharmacy" },
    { id: 4, name: "GreenLife Pharmacy" },
    { id: 5, name: "Cape Health Pharmacy" },
  ];

  const currentPharmacy = pharmacyList.find(p => p.id === selectedPharmacyId);

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

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

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
    if (!newMedicine.name.trim() || !newMedicine.price) {
      alert('Please enter both medicine name and price');
      return;
    }

    const updated = [...medicines, {
      name: newMedicine.name.trim(),
      price: Number(newMedicine.price),
      inStock: newMedicine.inStock
    }];
    saveMedicines(updated);
    setNewMedicine({ name: '', price: '', inStock: true });
    showSuccess('Medicine added successfully!');
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditForm({
      name: medicines[index].name,
      price: medicines[index].price,
      inStock: medicines[index].inStock
    });
  };

  const saveEdit = () => {
    if (!editForm.name.trim() || !editForm.price) {
      alert('Please enter both medicine name and price');
      return;
    }

    const updated = [...medicines];
    updated[editingIndex] = {
      name: editForm.name.trim(),
      price: Number(editForm.price),
      inStock: editForm.inStock
    };
    saveMedicines(updated);
    setEditingIndex(null);
    showSuccess('Medicine updated successfully!');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const toggleStock = (index) => {
    const updated = [...medicines];
    updated[index].inStock = !updated[index].inStock;
    saveMedicines(updated);
    showSuccess(updated[index].inStock ? 'Marked as In Stock' : 'Marked as Out of Stock');
  };

  const deleteMedicine = (index) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${medicines[index].name}"?`);
    if (confirmDelete) {
      const updated = medicines.filter((_, i) => i !== index);
      saveMedicines(updated);
      showSuccess('Medicine deleted successfully!');
    }
  };

  // ========== LOGIN SCREEN ==========
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💊</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Pharmacy Admin</h1>
            <p className="text-slate-500 text-sm mt-1">Login to manage your medicines</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                placeholder="Enter admin password"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-medium transition"
            >
              Login
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Demo password: <span className="font-semibold text-slate-700">pharmacy123</span>
          </p>
        </div>
      </div>
    );
  }

  // ========== DASHBOARD ==========
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Pharmacy Admin</h1>
            <p className="text-blue-100 text-sm">Manage medicines & stock</p>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-50 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <span className="text-green-600 text-xl">✓</span>
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Select Pharmacy */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Pharmacy</label>
          <select
            value={selectedPharmacyId}
            onChange={(e) => {
              setSelectedPharmacyId(Number(e.target.value));
              setEditingIndex(null);
            }}
            className="w-full p-3 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pharmacyList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {currentPharmacy && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-sm text-slate-600">Currently managing:</p>
              <p className="font-bold text-blue-700 text-lg">{currentPharmacy.name}</p>
            </div>
          )}
        </div>

        {/* Add New Medicine */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-5">
          <h2 className="text-lg font-bold text-slate-800 mb-4">➕ Add New Medicine</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Medicine name"
              value={newMedicine.name}
              onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
              className="p-3 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Price (GH₵)"
              value={newMedicine.price}
              onChange={(e) => setNewMedicine({...newMedicine, price: e.target.value})}
              className="p-3 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newMedicine.inStock}
              onChange={(e) => setNewMedicine({...newMedicine, inStock: e.target.value === 'true'})}
              className="p-3 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
            <button
              onClick={addMedicine}
              className="bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition py-3"
            >
              + Add Medicine
            </button>
          </div>
        </div>

        {/* Current Medicines List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Current Medicines ({medicines.length})
            </h2>
          </div>

          {medicines.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 text-lg">No medicines yet</p>
              <p className="text-slate-400 text-sm mt-1">Add your first medicine above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medicines.map((med, index) => (
                <div 
                  key={index} 
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition"
                >
                  {editingIndex === index ? (
                    // ========== EDIT MODE ==========
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="p-2.5 border border-slate-300 rounded-lg text-slate-800"
                          placeholder="Medicine name"
                        />
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                          className="p-2.5 border border-slate-300 rounded-lg text-slate-800"
                          placeholder="Price"
                        />
                        <select
                          value={editForm.inStock}
                          onChange={(e) => setEditForm({...editForm, inStock: e.target.value === 'true'})}
                          className="p-2.5 border border-slate-300 rounded-lg text-slate-800"
                        >
                          <option value="true">In Stock</option>
                          <option value="false">Out of Stock</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ========== VIEW MODE ==========
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-lg">{med.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-green-600 font-bold">GH₵{med.price}</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            med.inStock 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {med.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => startEdit(index)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleStock(index)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            med.inStock 
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {med.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                        </button>
                        <button
                          onClick={() => deleteMedicine(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Changes are saved automatically and will appear on the main search page
        </p>
      </div>
    </div>
  );
}