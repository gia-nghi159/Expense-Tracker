import React, { useState } from 'react';
import { Plus, Trash2, Users, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';

const ManageMembersModal = ({ isOpen, onClose, group, onMembersUpdated, networkData }) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState({});
  const [editName, setEditName] = useState(group?.name || '');
  const [editBudget, setEditBudget] = useState(group?.budget || '');

  React.useEffect(() => {
    if (group) {
      setEditName(group.name || '');
      setEditBudget(group.budget || '');
    }
  }, [group]);

  const handleUpdateSettings = async () => {
    try {
      setIsSubmitting(true);
      await axiosInstance.patch(API_PATHS.GROUPS.UPDATE(group.id), {
        name: editName.trim() || undefined,
        budget: editBudget ? parseFloat(editBudget) : null
      });
      toast.success("Trip settings updated!");
      if (onMembersUpdated) onMembersUpdated();
    } catch {
      toast.error("Failed to update trip settings.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeleteTrip = async () => {
    const hasUnresolved = networkData?.total_unsettled_debt > 0;
    
    if (hasUnresolved) {
      if (!window.confirm("The payings are not resolved yet. Do you want to remove still?")) return;
    } else {
      if (!window.confirm("Are you sure you want to remove this trip? This can't be undone.")) return;
    }

    try {
      setIsSubmitting(true);
      await axiosInstance.delete(API_PATHS.GROUPS.DELETE(group.id));
      toast.success("Trip deleted successfully.");
      onClose();
      if (onMembersUpdated) onMembersUpdated(true); // pass true to indicate trip deleted
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete trip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !group) return null;

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    try {
      setIsSubmitting(true);
      await axiosInstance.post(API_PATHS.GROUPS.ADD_MEMBER(group.id), {
        name: newMemberName.trim(),
      });
      toast.success(`✨ Added ${newMemberName} to the trip!`);
      setNewMemberName('');
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    try {
      setIsSubmitting(true);
      setErrorMessages((prev) => ({ ...prev, [memberId]: null }));
      
      await axiosInstance.delete(API_PATHS.GROUPS.REMOVE_MEMBER(group.id, memberId));
      toast.success(`✨ Removed ${memberName} from the trip.`);
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail && detail.message) {
        setErrorMessages((prev) => ({
          ...prev,
          [memberId]: {
            message: detail.message,
            expenses: detail.expenses || []
          }
        }));
        toast.error(`Could not remove ${memberName}.`);
      } else {
        toast.error('Failed to remove member.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 border-2 border-white/90 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-lg shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Manage Trip</h3>
              <p className="text-xs font-semibold text-slate-600">Add or remove trip members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Edit Trip Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Trip Settings
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Trip Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-[2] bg-white border border-slate-200 rounded-2xl px-4 py-2 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-400"
              />
              <input
                type="number"
                placeholder="Budget ($)"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-400"
              />
              <button
                onClick={handleUpdateSettings}
                disabled={isSubmitting || (!editName.trim() && !editBudget)}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-2xl px-4 text-sm font-bold transition disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
          
          <div className="h-px bg-slate-100 w-full" />

          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="text"
              placeholder="Friend's Name (e.g. Maya)"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-emerald-400 transition"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newMemberName.trim()}
              className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-4 transition disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Member List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Current Friends ({group.members?.length || 0})
            </h4>
            
            <div className="space-y-2">
              {group.members?.map((m) => {
                const error = errorMessages[m.id];
                return (
                  <div key={m.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.name}`}
                          alt={m.name}
                          className="w-8 h-8 rounded-xl bg-slate-100 object-cover"
                        />
                        <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        disabled={isSubmitting}
                        className="text-red-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition"
                        title="Remove friend"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Error Box for tied expenses */}
                    {error && (
                      <div className="ml-4 mr-1 p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                        <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {error.message}
                        </p>
                        {error.expenses.length > 0 && (
                          <ul className="list-disc pl-5 text-xs font-medium text-rose-700 space-y-0.5">
                            {error.expenses.map((exp, idx) => (
                              <li key={idx}>{exp}</li>
                            ))}
                          </ul>
                        )}
                        <p className="text-[10px] font-bold text-rose-600 uppercase mt-2">
                          Delete or adjust these in History first!
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete Trip Section */}
          <div className="pt-4 border-t-2 border-rose-100 flex justify-end">
            <button
              type="button"
              onClick={handleDeleteTrip}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-600/25 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Entire Trip</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ManageMembersModal;
