import React from 'react';
import { X, ExternalLink, Activity, DollarSign, PieChart, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const MemberDetailDrawer = ({ isOpen, onClose, node, edges, isMe }) => {
  if (!isOpen || !node) return null;

  const isPos = node.net_balance > 0.01;
  const isNeg = node.net_balance < -0.01;

  // Calculate debts explicitly related to this person
  const owesList = edges.filter(e => e.from_user_id === node.id);
  const owedByList = edges.filter(e => e.to_user_id === node.id);

  const copyToClipboard = (text, platform) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${platform} username!`);
  };

  const getPaymentLink = (handleObj, type, amount) => {
    if (!handleObj) return null;
    if (type === 'venmo' && handleObj.venmo) {
      return `venmo://paycharge?txn=pay&recipients=${handleObj.venmo.replace('@', '')}&amount=${Math.abs(amount).toFixed(2)}&note=Trip%20Settlement`;
    }
    if (type === 'cashapp' && handleObj.cashapp) {
      return `https://cash.app/${handleObj.cashapp.startsWith('$') ? '' : '$'}${handleObj.cashapp}/${Math.abs(amount).toFixed(2)}`;
    }
    if (type === 'paypal' && handleObj.paypal) {
      return `https://paypal.me/${handleObj.paypal}/${Math.abs(amount).toFixed(2)}`;
    }
    return null;
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 flex flex-col">
        
        <div className="p-6 pb-0 flex items-center justify-between">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <img 
                src={node.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${node.name}`} 
                alt={node.name}
                className="w-24 h-24 rounded-3xl bg-slate-100 object-cover shadow-md"
              />
              {isMe && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm border-2 border-white">
                  You
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-slate-900">{node.name}</h2>
              <p className="text-sm font-medium text-slate-500">{node.email}</p>
            </div>

            <div className={`px-4 py-2 rounded-2xl inline-flex flex-col items-center ${
              isPos ? 'bg-emerald-100 text-emerald-800' : isNeg ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
                {isPos ? 'Gets Back' : isNeg ? 'Owes Total' : 'Settled Up'}
              </span>
              <span className="text-2xl font-black">
                {isPos && '+'}${Math.abs(node.net_balance).toFixed(2)}
              </span>
            </div>
          </div>

          {/* New Metrics from Phase 2 Backend Upgrades */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
              <DollarSign className="w-5 h-5 text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-slate-500 uppercase">Total Paid</span>
              <span className="text-lg font-black text-slate-900">${(node.total_paid || 0).toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
              <PieChart className="w-5 h-5 text-blue-500 mb-2" />
              <span className="text-xs font-bold text-slate-500 uppercase">Total Share</span>
              <span className="text-lg font-black text-slate-900">${(node.total_share || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Deep Links / Payment Handles */}
          {node.payment_handles && Object.keys(node.payment_handles).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-slate-400" />
                Payment Handles
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {node.payment_handles.venmo && (
                  <button onClick={() => copyToClipboard(node.payment_handles.venmo, 'Venmo')} className="p-3 border border-[#008CFF]/20 bg-[#008CFF]/5 hover:bg-[#008CFF]/10 rounded-xl text-left transition-colors">
                    <p className="text-[10px] font-bold text-[#008CFF] uppercase">Venmo</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{node.payment_handles.venmo}</p>
                  </button>
                )}
                {node.payment_handles.cashapp && (
                  <button onClick={() => copyToClipboard(node.payment_handles.cashapp, 'CashApp')} className="p-3 border border-[#00D632]/20 bg-[#00D632]/5 hover:bg-[#00D632]/10 rounded-xl text-left transition-colors">
                    <p className="text-[10px] font-bold text-[#00D632] uppercase">CashApp</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{node.payment_handles.cashapp}</p>
                  </button>
                )}
                {node.payment_handles.paypal && (
                  <button onClick={() => copyToClipboard(node.payment_handles.paypal, 'PayPal')} className="p-3 border border-[#00457C]/20 bg-[#00457C]/5 hover:bg-[#00457C]/10 rounded-xl text-left transition-colors">
                    <p className="text-[10px] font-bold text-[#00457C] uppercase">PayPal</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{node.payment_handles.paypal}</p>
                  </button>
                )}
                {node.payment_handles.zelle && (
                  <button onClick={() => copyToClipboard(node.payment_handles.zelle, 'Zelle')} className="p-3 border border-[#753BBD]/20 bg-[#753BBD]/5 hover:bg-[#753BBD]/10 rounded-xl text-left transition-colors">
                    <p className="text-[10px] font-bold text-[#753BBD] uppercase">Zelle</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{node.payment_handles.zelle}</p>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Debts Context */}
          <div className="space-y-6">
            {owesList.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  Currently Owes
                </h3>
                <div className="space-y-2">
                  {owesList.map((debt, i) => {
                    const venmoLink = getPaymentLink(node.payment_handles, 'venmo', debt.amount);
                    return (
                      <div key={i} className="flex items-center justify-between p-3 border border-rose-100 bg-rose-50/50 rounded-xl">
                        <span className="text-sm font-medium text-slate-700">To <span className="font-bold text-slate-900">{debt.to_user_name}</span></span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-rose-600">${debt.amount.toFixed(2)}</span>
                          {venmoLink && isMe && (
                            <a href={venmoLink} target="_blank" rel="noreferrer" className="text-xs bg-[#008CFF] text-white px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-[#0074d6] transition-colors">
                              Pay <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {owedByList.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Is Owed By
                </h3>
                <div className="space-y-2">
                  {owedByList.map((debt, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-emerald-100 bg-emerald-50/50 rounded-xl">
                      <span className="text-sm font-medium text-slate-700">From <span className="font-bold text-slate-900">{debt.from_user_name}</span></span>
                      <span className="text-sm font-black text-emerald-600">${debt.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {owesList.length === 0 && owedByList.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No active debts involving this person.</p>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default MemberDetailDrawer;
