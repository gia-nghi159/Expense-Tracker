import React, { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Layers, Sparkles } from 'lucide-react';
import UserNode from './UserNode';
import FloatingEdge from './FloatingEdge';

const nodeTypes = {
  userNode: UserNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

const NetworkGraph = ({
  nodes = [],
  edges = [],
  simplifiedSettlements = [],
  activePersona,
  onNodeClick,
}) => {
  const [viewMode, setViewMode] = useState('RAW'); // 'RAW' or 'SIMPLIFIED'

  // Initial circular layout
  const initialNodes = useMemo(() => {
    const total = nodes.length;
    if (total === 0) return [];

    const centerX = 360;
    const centerY = 280;
    const radius = Math.max(220, total * 55);

    return nodes.map((node, index) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 90;
      const y = centerY + radius * Math.sin(angle) - 45;

      return {
        id: node.id,
        type: 'userNode',
        position: { x, y },
        draggable: true,
        data: {
          name: node.name,
          email: node.email,
          net_balance: node.net_balance,
          avatar_url: node.avatar_url,
          isMe: node.id === activePersona,
        },
      };
    });
  }, [nodes, activePersona]);

  // Edges styling with high-contrast light pastel badges
  const activeEdgesData = useMemo(() => {
    if (viewMode === 'SIMPLIFIED' && simplifiedSettlements.length > 0) {
      return simplifiedSettlements.map((s, index) => ({
        id: `simp-${s.from_user_id}-${s.to_user_id}-${index}`,
        source: s.from_user_id,
        target: s.to_user_id,
        label: `pays $${s.amount.toFixed(2)}`,
        animated: true,
        type: 'floating',
        style: {
          stroke: '#059669',
          strokeWidth: 3.5,
        },
        labelStyle: {
          fill: '#064e3b',
          fontWeight: 800,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: '#ecfdf5',
          stroke: '#6ee7b7',
          strokeWidth: 1.5,
          rx: 8,
          ry: 8,
        },
        labelBgPadding: [10, 6],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#059669',
          width: 22,
          height: 22,
        },
      }));
    }

    // Raw Debt Web (Vibrant Strawberry Rose)
    return edges.map((edge, index) => ({
      id: `raw-${edge.from_user_id}-${edge.to_user_id}-${index}`,
      source: edge.from_user_id,
      target: edge.to_user_id,
      label: `owes $${edge.amount.toFixed(2)}`,
      animated: true,
      type: 'floating',
      style: {
        stroke: '#e11d48',
        strokeWidth: Math.min(4, Math.max(1.8, edge.amount / 35)),
      },
      labelStyle: {
        fill: '#881337',
        fontWeight: 800,
        fontSize: 11,
      },
      labelBgStyle: {
        fill: '#fff1f2',
        stroke: '#fda4af',
        strokeWidth: 1.5,
        rx: 8,
        ry: 8,
      },
      labelBgPadding: [8, 5],
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#e11d48',
        width: 18,
        height: 18,
      },
    }));
  }, [viewMode, edges, simplifiedSettlements]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(activeEdgesData);

  useEffect(() => {
    setFlowNodes(initialNodes);
  }, [initialNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(activeEdgesData);
  }, [activeEdgesData, setFlowEdges]);

  return (
    <div className="w-full h-[590px] rounded-3xl overflow-hidden border-2 border-emerald-200/80 bg-white/80 backdrop-blur-xl shadow-lg relative">
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
          <p className="text-sm font-semibold">No active group members found. Invite your friends! </p>
        </div>
      ) : (
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.4}
          maxZoom={1.8}
        >
          <Background color="#cbd5e1" gap={26} size={1} />
          <Controls showInteractive={false} className="!bg-white/90 !border-slate-200 !text-slate-800 !rounded-2xl overflow-hidden shadow-md" />
          <MiniMap
            nodeColor={(n) => {
              const bal = n.data?.net_balance || 0;
              return bal > 0 ? '#10b981' : bal < 0 ? '#f43f5e' : '#94a3b8';
            }}
            maskColor="rgba(255, 255, 255, 0.7)"
            className="!bg-white/90 !border-slate-200 rounded-2xl overflow-hidden shadow-md"
          />
        </ReactFlow>
      )}

      {/* Top Left: Interactive View Toggle */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-xl border border-white/90 p-1.5 rounded-2xl shadow-lg">
        <button
          onClick={() => setViewMode('RAW')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition ${
            viewMode === 'RAW'
              ? 'bg-red-400 text-white shadow-md shadow-red-400/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Raw Web ({edges.length})</span>
        </button>

        <button
          onClick={() => setViewMode('SIMPLIFIED')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition ${
            viewMode === 'SIMPLIFIED'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Clean Net Flow ({simplifiedSettlements.length || 'Optimal'})</span>
        </button>
      </div>

      {/* Top Right: Status Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xl border border-white/90 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-4 text-slate-800 pointer-events-none z-10 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400"></span>
          <span className="font-extrabold text-emerald-800">Gets Back </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 shadow-sm shadow-red-400"></span>
          <span className="font-extrabold text-rose-500">Owes Money </span>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
