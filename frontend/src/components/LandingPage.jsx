import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Map, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const LandingPage = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [savedTrips, setSavedTrips] = useState([]);

  useEffect(() => {
    // Load saved trips from localStorage Wallet
    try {
      const stored = localStorage.getItem('fingraph_trips');
      if (stored) {
        setSavedTrips(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    // Extract ID if they pasted a full URL
    let tripId = joinCode.trim();
    if (tripId.includes('/trip/')) {
      const parts = tripId.split('/trip/');
      tripId = parts[1].split('/')[0].split('?')[0];
    }
    
    navigate(`/trip/${tripId}`);
  };

  const removeSavedTrip = (id) => {
    const updated = savedTrips.filter(t => t.id !== id);
    setSavedTrips(updated);
    localStorage.setItem('fingraph_trips', JSON.stringify(updated));
    toast.success("Removed from local wallet");
  };

  return (
    <div className="min-h-screen bg-[url('/background.jpg')] bg-cover bg-center bg-fixed bg-no-repeat text-slate-900 flex flex-col items-center justify-center p-4">
      
      {/* Hero Section */}
      <div className="max-w-xl w-full text-center space-y-6 mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-emerald-100 rounded-full mb-4 shadow-sm border border-emerald-200">
          <Map className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-5xl font-black tracking-tight text-slate-900">
          Fin<span className="text-emerald-600">Graph</span>
        </h1>
        <p className="text-slate-600 text-lg font-medium">
          No accounts. No passwords. Just simple, mathematically perfect expense splitting.
        </p>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Create New Trip */}
        <div 
          onClick={() => navigate('/create')}
          className="bg-white/80 border-2 border-emerald-200/80 p-8 rounded-3xl hover:border-emerald-400 hover:shadow-xl cursor-pointer transition-all duration-300 group relative overflow-hidden shadow-lg backdrop-blur-xl"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-2">
            <ArrowRight className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform shadow-sm border border-emerald-200">
            <Plus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Create New Trip</h2>
          <p className="text-slate-600 font-medium">
            Start a fresh expense sheet. You'll get a secret link to share with your friends.
          </p>
        </div>

        {/* Join Trip */}
        <div className="bg-white/80 border-2 border-red-200/80 p-8 rounded-3xl shadow-lg backdrop-blur-xl">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-6 text-red-600 shadow-sm border border-red-200">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Join a Trip</h2>
          <p className="text-slate-600 font-medium mb-6">
            Paste a trip code or secret link to join an existing group.
          </p>
          
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 123e4567-..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-red-400 text-slate-900 placeholder-slate-400 transition-colors shadow-sm"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-black transition-colors shadow-md shadow-red-500/20"
            >
              Join
            </button>
          </form>
        </div>

      </div>

      {/* Local Wallet / Saved Trips */}
      {savedTrips.length > 0 && (
        <div className="max-w-4xl w-full mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
            Your Saved Trips
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedTrips.map((trip) => (
              <div 
                key={trip.id}
                className="bg-white/80 border-2 border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2 hover:border-emerald-300 transition-colors shadow-md backdrop-blur-xl"
              >
                <div 
                  className="cursor-pointer group flex-1"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                    {trip.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Last visited: {new Date(trip.lastVisited).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold font-mono truncate w-24 uppercase">
                    {trip.id.split('-')[0]}
                  </span>
                  <button 
                    onClick={() => removeSavedTrip(trip.id)}
                    className="text-[10px] font-black text-rose-500 hover:text-white px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-500 transition-colors"
                  >
                    Forget
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
