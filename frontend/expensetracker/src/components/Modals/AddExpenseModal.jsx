import React, { useState, useEffect, useMemo } from 'react';
import { Check, DollarSign, Receipt, Split, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';

const AddExpenseModal = ({ isOpen, onClose, group, onExpenseAdded, initialExpense }) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [splitMode, setSplitMode] = useState('EQUAL_SELECTED');
  const [customAmounts, setCustomAmounts] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialExpense && isOpen) {
      setDescription(initialExpense.description || '');
      setCategory(initialExpense.category || 'Other');
      setTotalAmount(initialExpense.total_amount?.toString() || '');
      setPaidByUserId(initialExpense.paid_by_user_id || group?.members?.[0]?.id || '');
      
      const uids = new Set(initialExpense.splits.map(s => s.user_id));
      setSelectedUserIds(uids);

      setSplitMode('EXACT');
      const exactAmounts = {};
      initialExpense.splits.forEach(s => {
        exactAmounts[s.user_id] = s.amount;
      });
      setCustomAmounts(exactAmounts);
    } else if (group && group.members && group.members.length > 0 && isOpen) {
      setPaidByUserId(group.members[0].id);
      setSelectedUserIds(new Set(group.members.map((m) => m.id)));
      setCustomAmounts({});
      setDescription('');
      setCategory('Other');
      setTotalAmount('');
      setSplitMode('EQUAL_SELECTED');
    }
  }, [group, isOpen, initialExpense]);

  const parsedTotal = parseFloat(totalAmount) || 0;
  const selectedCount = selectedUserIds.size;

  const equalShare = useMemo(() => {
    if (parsedTotal <= 0 || selectedCount === 0) return 0;
    return Math.round((parsedTotal / selectedCount) * 100) / 100;
  }, [parsedTotal, selectedCount]);

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        if (next.size === 1) {
          toast.error('At least 1 person must be included.');
          return prev;
        }
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!group?.members) return;
    setSelectedUserIds(new Set(group.members.map((m) => m.id)));
  };

  const calculateSplits = () => {
    if (splitMode === 'EQUAL_SELECTED') {
      const list = [];
      let runningSum = 0;
      const ids = Array.from(selectedUserIds);
      ids.forEach((uid, index) => {
        if (index === ids.length - 1) {
          const remainder = Math.round((parsedTotal - runningSum) * 100) / 100;
          list.push({ user_id: uid, amount: remainder });
        } else {
          list.push({ user_id: uid, amount: equalShare });
          runningSum += equalShare;
        }
      });
      return list;
    } else {
      return Array.from(selectedUserIds).map((uid) => ({
        user_id: uid,
        amount: parseFloat(customAmounts[uid]) || 0,
      }));
    }
  };

  const currentSplits = calculateSplits();
  const currentSplitsSum = currentSplits.reduce((acc, curr) => acc + curr.amount, 0);
  const remainingToAllocate = Math.round((parsedTotal - currentSplitsSum) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) { toast.error('Please enter a description.'); return; }
    if (parsedTotal <= 0) { toast.error('Please enter a valid amount.'); return; }
    if (!paidByUserId) { toast.error('Please select who paid.'); return; }
    if (selectedCount === 0) { toast.error('Please select at least 1 person.'); return; }

    const splits = calculateSplits();
    const sum = splits.reduce((acc, curr) => acc + curr.amount, 0);
    if (Math.abs(sum - parsedTotal) > 0.05) {
      toast.error(`Splits sum ($${sum.toFixed(2)}) must equal total ($${parsedTotal.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        group_id: group.id,
        description: description.trim(),
        category,
        total_amount: parsedTotal,
        paid_by_user_id: paidByUserId,
        splits,
      };

      if (initialExpense) {
        await axiosInstance.put(API_PATHS.EXPENSES.EDIT(initialExpense.id), payload);
        toast.success('✨ Expense updated & graph healed!');
      } else {
        const idempotencyKey = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await axiosInstance.post(API_PATHS.EXPENSES.INGEST, payload, { headers: { 'Idempotency-Key': idempotencyKey } });
        toast.success('✨ Expense recorded & graph updated!');
      }

      toast.success('✨ Expense recorded & graph updated!');
      if (!initialExpense) {
        setDescription('');
        setTotalAmount('');
      }
      onClose();
      if (onExpenseAdded) onExpenseAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 border-2 border-white/90 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-rose-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-red-400 flex items-center justify-center text-white text-lg shadow-md">
              🧾
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{initialExpense ? 'Edit Expense' : 'Add Split Expense'}</h3>
              <p className="text-xs font-semibold text-slate-600">{group.name} · {group.members.length} members</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Description */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Dinner, Gas, Ski Pass"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-emerald-400 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-3 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:border-emerald-400 transition cursor-pointer"
              >
                <option value="Food">🍔 Food</option>
                <option value="Transport">🚗 Transport</option>
                <option value="Lodging">🏠 Lodging</option>
                <option value="Activities">🎟️ Activities</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>
          </div>

          {/* Amount + Paid By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Total Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm font-bold focus:outline-none focus:border-emerald-400 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Paid By
              </label>
              <select
                value={paidByUserId}
                onChange={(e) => setPaidByUserId(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:border-emerald-400 transition cursor-pointer"
              >
                {group.members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white text-slate-900">{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Strategy */}
          <div className="pt-2 border-t-2 border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Split With ({selectedCount} of {group.members.length})</span>
              </div>
              <button type="button" onClick={selectAll} className="text-[11px] text-emerald-700 hover:text-emerald-900 font-black underline underline-offset-2">
                Select All
              </button>
            </div>

            {/* Split Mode Tabs */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs border border-slate-200">
              <button
                type="button"
                onClick={() => setSplitMode('EQUAL_SELECTED')}
                className={`py-2 px-2 rounded-xl font-black transition flex items-center justify-center gap-1.5 ${
                  splitMode === 'EQUAL_SELECTED'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Split Equally ({selectedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('EXACT')}
                className={`py-2 px-2 rounded-xl font-black transition flex items-center justify-center gap-1.5 ${
                  splitMode === 'EXACT'
                    ? 'bg-red-400 text-white shadow-md shadow-red-400/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Custom Amounts</span>
              </button>
            </div>

            {/* Participant Checklist */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 max-h-[200px] overflow-y-auto">
              {group.members.map((m) => {
                const isSelected = selectedUserIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleUser(m.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-white border-emerald-300 shadow-sm'
                        : 'bg-white/50 border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition ${
                        isSelected ? 'bg-emerald-500' : 'border-2 border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                      <img
                        src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                        alt={m.name}
                        className="w-6 h-6 rounded-full bg-slate-200"
                      />
                      <span className="text-xs font-bold text-slate-900 truncate">{m.name}</span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                      {splitMode === 'EQUAL_SELECTED' ? (
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          isSelected ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' : 'text-slate-400'
                        }`}>
                          {isSelected ? `$${equalShare.toFixed(2)}` : '$0.00'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-xs font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={!isSelected}
                            value={customAmounts[m.id] ?? ''}
                            onChange={(e) => setCustomAmounts({ ...customAmounts, [m.id]: e.target.value })}
                            placeholder="0.00"
                            className="w-20 bg-white border-2 border-slate-300 rounded-lg px-2 py-0.5 text-right text-slate-900 text-xs font-bold focus:outline-none focus:border-emerald-400 disabled:opacity-30"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Calc Helper */}
            <div className="px-1 flex items-center justify-between text-xs bg-slate-100 rounded-2xl px-4 py-2.5 border border-slate-200">
              <span className="font-semibold text-slate-700">
                {splitMode === 'EQUAL_SELECTED' ? (
                  <>Splitting <strong className="text-slate-900">${parsedTotal.toFixed(2)}</strong> among <strong className="text-emerald-700">{selectedCount} members</strong> (≈${equalShare.toFixed(2)} each)</>
                ) : (
                  <>Allocated: <strong className="text-slate-900">${currentSplitsSum.toFixed(2)}</strong> of ${parsedTotal.toFixed(2)}</>
                )}
              </span>
              {splitMode === 'EXACT' && (
                <span className={`font-black ${remainingToAllocate === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {remainingToAllocate === 0 ? '✓ Balanced' : `Left: $${remainingToAllocate.toFixed(2)}`}
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              <span>{isSubmitting ? 'Saving...' : initialExpense ? 'Save Changes' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
