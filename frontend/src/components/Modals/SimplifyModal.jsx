import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';

const SimplifyModal = ({ isOpen, onClose, simplifyData, groupId, onSettled }) => {
  const [settlingIndex, setSettlingIndex] = useState(null);
  const [settledSet, setSettledSet] = useState(new Set());

  if (!isOpen || !simplifyData) return null;

  const handleRecordSettlement = async (proposal, index) => {
    try {
      setSettlingIndex(index);
      await axiosInstance.post(API_PATHS.SETTLEMENTS.RECORD, {
        group_id: groupId,
        from_user_id: proposal.from_user_id,
        to_user_id: proposal.to_user_id,
        amount: proposal.amount,
        notes: "Settled via FinGraph Simplifier",
      });

      setSettledSet((prev) => new Set(prev).add(index));
      toast.success(`💸 Payment of $${proposal.amount.toFixed(2)} recorded!`);

      // Trigger Confetti effect
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      if (onSettled) onSettled();
    } catch (error) {
      console.error(error);
      toast.error('Failed to record settlement.');
    } finally {
      setSettlingIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-950/40 via-slate-900 to-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-400 to-emerald-400 flex items-center justify-center text-white shadow-lg text-lg">
              ✨
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Debt Network Simplification</h3>
              <p className="text-xs text-slate-400">Net Settlement Engine ⚡️</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Efficiency Metric Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/60 border border-rose-800/20 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-rose-300 mb-1">💸 Raw Transfers</p>
              <p className="text-2xl font-black text-red-400">{simplifyData.original_edge_count}</p>
            </div>
            <div className="bg-slate-950/60 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-300 mb-1">✨ Clean Steps</p>
              <p className="text-2xl font-black text-emerald-400">{simplifyData.simplified_settlement_count}</p>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-400/30 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-300 mb-1">✨ Reduced</p>
              <p className="text-2xl font-black text-emerald-300">{simplifyData.reduction_percentage}%</p>
            </div>
          </div>

          {/* List of Simplified Transactions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Optimal Direct Settlements
            </h4>

            {simplifyData.settlements.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-950/40 rounded-2xl border border-white/5">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-white text-base">All balances are completely settled!</p>
                <p className="text-xs text-slate-400 mt-1">Every debt loop was cancelled out. ✅</p>
              </div>
            ) : (
              simplifyData.settlements.map((item, idx) => {
                const isSettled = settledSet.has(idx);
                const isLoading = settlingIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                      isSettled
                        ? 'bg-emerald-950/20 border-emerald-500/30 opacity-70'
                        : 'bg-slate-950/60 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-rose-300 text-sm">{item.from_user_name}</span>
                      <div className="flex items-center gap-1 text-slate-500">
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="font-bold text-emerald-300 text-sm">{item.to_user_name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-white">${item.amount.toFixed(2)}</span>
                      <button
                        onClick={() => handleRecordSettlement(item, idx)}
                        disabled={isSettled || isLoading}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isSettled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                        }`}
                      >
                        {isSettled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Settled ✅
                          </>
                        ) : isLoading ? (
                          'Recording...'
                        ) : (
                          'Pay & Settle 💸'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-2xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplifyModal;
