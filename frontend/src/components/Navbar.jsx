import React from 'react';
import { Database, Link as LinkIcon, Plus, Sparkles, Sprout, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const Navbar = ({
  groups = [],
  selectedGroupId,
  onSelectGroup,
  onSeedDemo,
  onOpenCreateTrip,
  onOpenManageMembers,
  onOpenAddExpense,
  isSeeding = false,
}) => {
  const handleCopyShareLink = () => {
    if (!selectedGroupId) return;
    const shareUrl = `${window.location.origin}/trip/${selectedGroupId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('📋 Trip link copied! Send it to your friends.');
  };

  return (
    <header className="border-b border-white/80 bg-white/75 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-black tracking-tighter drop-shadow-sm">
                <span className="text-emerald-600">Fin</span>
                <span className="text-red-400">Graph</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Middle: Group Switcher & DB Status */}
        <div className="hidden md:flex items-center gap-3">
          {/* Group Selector & New Trip Trigger */}
          <div className="flex items-center gap-2">
            {groups.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/90 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs font-bold text-slate-800 shadow-sm">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => onSelectGroup(e.target.value)}
                  className="bg-transparent border-none text-slate-800 text-xs font-bold focus:outline-none cursor-pointer max-w-[170px] truncate"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-white text-slate-900 font-semibold">
                      {g.name} ({g.members.length} friends)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onOpenCreateTrip}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800 rounded-2xl text-xs font-black transition shadow-sm"
              title="Create a new trip with custom friends"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Trip</span>
            </button>

            {selectedGroupId && (
              <button
                onClick={onOpenManageMembers}
                className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 hover:bg-teal-200 border border-teal-300 text-teal-800 rounded-2xl text-xs font-black transition shadow-sm"
                title="Manage trip"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manage Trip</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {selectedGroupId && (
            <button
              onClick={handleCopyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-slate-50 border border-slate-200 text-emerald-800 rounded-2xl text-xs font-black transition shadow-sm"
              title="Copy shareable link for your friends"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Share Link</span>
            </button>
          )}

          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition shadow-sm"
            title="Populates dummy data. Note: Public demo is capped at 5 active trips."
          >
            <Sprout className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isSeeding ? 'Seeding...' : 'Seed'}</span>
          </button>

          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition shadow-md shadow-emerald-600/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
