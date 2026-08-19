import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const UserNode = ({ data, isConnectable }) => {
  const isPositive = data.net_balance > 0.01;
  const isNegative = data.net_balance < -0.01;

  return (
    <div
      className={`relative px-4 py-3.5 rounded-3xl shadow-xl border-2 transition-all duration-300 min-w-[180px] backdrop-blur-xl cursor-grab active:cursor-grabbing hover:scale-105 ${
        isPositive
          ? 'bg-white/90 border-emerald-400 shadow-emerald-500/15 ring-4 ring-emerald-200/50'
          : isNegative
            ? 'bg-white/90 border-red-400 shadow-red-400/15 ring-4 ring-rose-200/50'
            : 'bg-white/85 border-slate-300 shadow-slate-400/20'
      }`}
    >
      {/* Handles on 4 sides */}
      <Handle type="target" position={Position.Top} id="t" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} id="b" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !bg-red-400 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} id="l" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} id="r" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !bg-red-400 !border-2 !border-white" />

      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`}
            alt={data.name}
            className={`w-11 h-11 rounded-2xl border-2 object-cover p-0.5 bg-slate-50 ${
              isPositive ? 'border-emerald-400' : isNegative ? 'border-red-400' : 'border-slate-300'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">{data.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full inline-block ${
                isPositive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : isNegative
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isPositive && '+'}
              ${Math.abs(data.net_balance).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-medium">Status:</span>
        <span className={isPositive ? 'text-emerald-700 font-black' : isNegative ? 'text-rose-700 font-black' : 'text-slate-500 font-bold'}>
          {isPositive ? 'Gets Back' : isNegative ? 'Owes Money' : 'All Settled'}
        </span>
      </div>
    </div>
  );
};

export default memo(UserNode);
