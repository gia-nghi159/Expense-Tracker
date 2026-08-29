import React from 'react';
import { Link as LinkIcon, Plus, Users, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Navbar = ({
  groupName,
  onOpenManageMembers,
  onOpenAddExpense,
  onLeaveTrip,
}) => {
  const navigate = useNavigate();

  const handleCopyShareLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast.success('📋 Trip link copied! Send it to your friends.');
  };

  return (
    <header className="border-b border-white/80 bg-white/75 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <h1 className="text-4xl font-black tracking-tighter drop-shadow-sm">
              <span className="text-emerald-600">Fin</span>
              <span className="text-red-400">Graph</span>
            </h1>
          </button>
        </div>

        {/* Middle: Group Name & Manage */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2">
            {groupName && (
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-2xl shadow-sm relative group">
                <select
                  value={window.location.pathname.split('/').pop()}
                  onChange={(e) => {
                    if (e.target.value === 'CREATE_NEW') navigate('/create');
                    else navigate(`/trip/${e.target.value}`);
                  }}
                  className="bg-transparent border-none text-slate-800 text-sm font-bold focus:outline-none cursor-pointer max-w-[200px] truncate appearance-none pr-4"
                >
                  {(() => {
                    try {
                      const currentId = window.location.pathname.split('/').pop();
                      const trips = JSON.parse(localStorage.getItem('fingraph_trips') || '[]');
                      
                      const options = trips.map(t => (
                        <option key={t.id} value={t.id} className="bg-white text-slate-900 font-semibold">
                          {t.name}
                        </option>
                      ));
                      
                      if (!trips.find(t => t.id === currentId)) {
                        options.unshift(
                          <option key={currentId} value={currentId} className="hidden">
                            {groupName}
                          </option>
                        );
                      }
                      
                      options.push(
                        <option key="CREATE_NEW" value="CREATE_NEW" className="bg-emerald-50 text-emerald-700 font-black">
                          + Create New Trip
                        </option>
                      );
                      
                      return options;
                    } catch {
                      return null;
                    }
                  })()}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            )}

            <button
              onClick={onOpenManageMembers}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 hover:bg-teal-200 border border-teal-300 text-teal-800 rounded-2xl text-xs font-black transition shadow-sm"
              title="Manage trip members and settings"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Trip</span>
            </button>

            <button
              onClick={() => navigate('/create')}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-black transition shadow-sm ml-1"
              title="Create a new trip"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trip</span>
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-slate-50 border border-slate-200 text-emerald-800 rounded-2xl text-xs font-black transition shadow-sm"
            title="Copy shareable link for your friends"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Link</span>
          </button>

          <button
            onClick={onLeaveTrip}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold transition shadow-sm"
            title="Remove this trip from your local wallet"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave Trip</span>
          </button>

          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black transition shadow-md shadow-emerald-600/25 ml-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
