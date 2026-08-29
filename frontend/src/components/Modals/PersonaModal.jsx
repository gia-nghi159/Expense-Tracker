import React from 'react';
import { X, UserCheck } from 'lucide-react';

const PersonaModal = ({ isOpen, onClose, nodes, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white border-2 border-emerald-100 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Who are you?</h2>
            <p className="text-sm font-medium text-slate-500">Select your name so we can remember you.</p>
          </div>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {nodes.map(node => (
            <button
              key={node.id}
              onClick={() => onSelect(node.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-300 transition-all group text-left shadow-sm"
            >
              <img 
                src={node.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${node.name}`} 
                alt={node.name}
                className="w-10 h-10 rounded-xl bg-slate-100 object-cover"
              />
              <span className="font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
                {node.name}
              </span>
            </button>
          ))}
          {nodes.length === 0 && (
            <p className="text-sm font-semibold text-slate-500 text-center py-4">No members found.</p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t-2 border-slate-100">
          <button
            onClick={onClose}
            className="w-full text-center text-sm font-bold text-slate-500 hover:text-red-500 transition-colors"
          >
            I'm just watching (Spectator mode)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaModal;
