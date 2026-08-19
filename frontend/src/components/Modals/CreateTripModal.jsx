import React, { useState } from 'react';
import { Compass, Plus, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';

const CreateTripModal = ({ isOpen, onClose, onTripCreated }) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [members, setMembers] = useState(['Alex', 'Sam', 'Taylor']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMember = (e) => {
    e?.preventDefault();
    const clean = newMemberName.trim();
    if (!clean) return;
    if (members.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      toast.error('Member name already exists.');
      return;
    }
    setMembers([...members, clean]);
    setNewMemberName('');
  };

  const handleRemoveMember = (indexToRemove) => {
    if (members.length <= 2) {
      toast.error('A trip needs at least 2 people.');
      return;
    }
    setMembers(members.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter a trip name.'); return; }
    if (members.length < 2) { toast.error('Please add at least 2 participants.'); return; }

    try {
      setIsSubmitting(true);
      const res = await axiosInstance.post(API_PATHS.GROUPS.QUICK_CREATE, {
        name: name.trim(),
        currency,
        description: description.trim() || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        member_names: members,
      });

      toast.success(`✨ Trip "${res.data.name}" created!`);
      setName('');
      setDescription('');
      setMembers(['Alex', 'Sam', 'Taylor']);
      onClose();
      if (onTripCreated) onTripCreated(res.data.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 border-2 border-white/90 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50 to-emerald-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-400 to-emerald-400 flex items-center justify-center text-white text-lg shadow-md">
              🗺️
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Create New Trip</h3>
              <p className="text-xs font-semibold text-slate-600">No account needed — just names & expenses ✨</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Trip / Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. Miami Road Trip, Tokyo 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-emerald-400 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-3 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:border-emerald-400 transition cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Weekend cabin rental"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Trip Budget (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1000.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm font-bold focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
          </div>

          {/* Members */}
          <div className="space-y-3 pt-2 border-t-2 border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Participants ({members.length})</span>
              </label>
              <span className="text-[11px] font-bold text-slate-500">Minimum 2 people</span>
            </div>

            {/* Member Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Friend's name (e.g. Jordan)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }}
                className="flex-1 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-emerald-400 transition"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-1 transition shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Member Chips */}
            <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 min-h-[64px] max-h-[140px] overflow-y-auto">
              {members.map((member, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 bg-white border-2 border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 shadow-sm hover:border-rose-300 transition"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`}
                    alt={member}
                    className="w-4 h-4 rounded-full bg-slate-200"
                  />
                  <span>{member}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    className="text-slate-400 hover:text-rose-800 ml-0.5 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t-2 border-slate-100 flex justify-end gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-2xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-800 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm font-black rounded-2xl shadow-lg shadow-red-400/25 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : '✨ Create Trip & Start'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTripModal;
