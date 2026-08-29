import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Users, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateTrip = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    budget: '',
    members: ['']
  });

  const addMember = () => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, '']
    }));
  };

  const removeMember = (index) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const updateMember = (index, value) => {
    const newMembers = [...formData.members];
    newMembers[index] = value;
    setFormData(prev => ({ ...prev, members: newMembers }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validMembers = formData.members
      .map(m => m.trim())
      .filter(m => m.length >= 2);

    if (!formData.name.trim()) {
      return toast.error("Trip name is required");
    }
    if (validMembers.length < 2) {
      return toast.error("You need at least 2 members to share expenses");
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/groups/quick-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          currency: formData.currency,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          member_names: validMembers,
          description: "Created via FinGraph"
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create trip');
      }

      const trip = await response.json();
      toast.success("Trip created successfully!");
      
      // Save to local wallet immediately (though persona isn't selected yet)
      const trips = JSON.parse(localStorage.getItem('fingraph_trips') || '[]');
      trips.push({ id: trip.id, name: trip.name, lastVisited: new Date().toISOString() });
      localStorage.setItem('fingraph_trips', JSON.stringify(trips));
      
      // Navigate to dashboard
      navigate(`/trip/${trip.id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/background.jpg')] bg-cover bg-center bg-fixed bg-no-repeat text-slate-900 p-6 flex justify-center items-center">
      <div className="max-w-xl w-full bg-white/80 backdrop-blur-xl border-2 border-emerald-200/80 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
        
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-slate-500 hover:text-emerald-600 transition-colors mb-8 text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Create New Trip</h1>
            <p className="text-slate-500 font-medium">Set up a new expense sharing group instantly.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Trip Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Ski Trip 2026, Apartment Utilities"
                  className="w-full bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 transition-colors appearance-none shadow-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>
              <div className="flex-[2]">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Budget (Optional)</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t-2 border-emerald-100">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-slate-700">Members</label>
              <button
                type="button"
                onClick={addMember}
                className="text-xs flex items-center text-emerald-600 hover:text-emerald-700 font-black bg-emerald-50 px-2.5 py-1.5 rounded-lg"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Member
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.members.map((member, idx) => (
                <div key={idx} className="flex gap-2 relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-4 w-4 text-emerald-500" />
                  </div>
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => updateMember(idx, e.target.value)}
                    placeholder={`Member ${idx + 1} Name`}
                    className="flex-1 bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                  {formData.members.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border-2 border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-colors shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-3">
              You'll be able to select which member you are on the next screen.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-4 font-black text-lg shadow-lg shadow-emerald-600/30 transition-all transform active:scale-[0.98] mt-8 flex justify-center items-center gap-2"
          >
            {loading ? "Creating Trip..." : "Create Secret Link"}
          </button>
        </form>

      </div>
    </div>
  );
};

export default CreateTrip;
