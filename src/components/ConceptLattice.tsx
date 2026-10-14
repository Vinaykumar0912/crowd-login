import React, { useState, useEffect } from 'react';
import { Network, Cpu, GitFork } from 'lucide-react';
import { apiService } from '../services/api';

interface ConceptNode {
  id: string;
  label: string;
  extent: string[];  // Objects (Cameras/Zones)
  intent: string[];  // Attributes (Crowd conditions)
  x: number;
  y: number;
  formula: string;
  action: string;
  confidence: number;
}

export const ConceptLattice: React.FC = () => {
  const [nodes, setNodes] = useState<ConceptNode[]>([
    { 
      id: 'c1', 
      label: 'Concept 1 (General Ambient)', 
      extent: ['Gate A', 'Gate B', 'Main Concourse'], 
      intent: ['Human Detections', 'Standard Velocity'], 
      x: 250, 
      y: 40,
      formula: '({All Monitored Feeds}, {Detections, Standard Velocity})',
      action: 'Maintain general situational surveillance.',
      confidence: 99
    }
  ]);

  const [connections, setConnections] = useState<{ from: string; to: string }[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('c1');

  const fetchLattice = async () => {
    try {
      const data = await apiService.getFCALattice();
      if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
        setNodes(data.nodes);
        setConnections(data.links || []);
        if (!selectedNode || !data.nodes.some((n: any) => n.id === selectedNode)) {
          setSelectedNode(data.nodes[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load FCA lattice:', e);
    }
  };

  useEffect(() => {
    fetchLattice();
    const interval = setInterval(fetchLattice, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeNode = nodes.find(n => n.id === selectedNode) || nodes[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Interactive Concept Lattice Render (SVG) */}
      <div className="lg:col-span-7 cyber-glass p-5 rounded-xl border border-blue-500/10 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Interactive Formal Concept Lattice
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mb-6">
            Click on concept nodes to inspect the generated mathematical intents/extents.
          </p>
        </div>

        {/* Lattice SVG */}
        <div className="relative flex justify-center bg-slate-950/40 rounded-xl p-4 border border-slate-900 overflow-hidden h-96">
          {/* Scanning line for high-tech aesthetic */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-1/2 w-full animate-scan pointer-events-none" />
          
          <svg viewBox="0 0 500 400" className="w-full h-full max-w-[450px]">
            <defs>
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Connection Lines */}
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from)!;
              const toNode = nodes.find(n => n.id === conn.to)!;
              const isSelected = selectedNode === conn.from || selectedNode === conn.to;
              
              return (
                <line
                  key={idx}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={isSelected ? '#06B6D4' : '#1e293b'}
                  strokeWidth={isSelected ? '2' : '1.5'}
                  strokeDasharray={isSelected ? '0' : '3,3'}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* Concept Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isDanger = node.id === 'c4';
              
              let fill = isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(13, 20, 35, 0.9)';
              let stroke = isDanger ? '#EF4444' : '#3B82F6';
              if (isSelected) stroke = '#06B6D4';

              return (
                <g 
                  key={node.id} 
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedNode(node.id)}
                >
                  {/* Outer glow on hover/selected */}
                  <circle
                    r="16"
                    fill="transparent"
                    stroke={isSelected ? '#06B6D4' : 'transparent'}
                    strokeWidth="2"
                    filter={isDanger ? 'url(#glow-red)' : isSelected ? 'url(#glow-cyan)' : ''}
                    className="opacity-70 transition-all duration-300 group-hover:stroke-cyan-400 group-hover:scale-110"
                  />
                  {/* Main Circle */}
                  <circle
                    r="10"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                    className="transition-all duration-300"
                  />
                  {/* Label Text */}
                  <text
                    y="-15"
                    textAnchor="middle"
                    fill={isSelected ? '#06B6D4' : '#94a3b8'}
                    fontSize="9"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="font-sans select-none pointer-events-none transition-colors"
                  >
                    {node.id.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between text-[9px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-blue-500 bg-slate-950" /> General State
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-cyan-500 bg-cyan-950/20" /> Active Concept
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-red-500 bg-red-950/20 animate-pulse" /> Critical Risk State
          </span>
        </div>
      </div>

      {/* Selected Node Concept Attributes Detail */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Concept Inspector Card */}
        <div className="cyber-glass p-5 rounded-xl border border-cyan-500/20 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-cyber-border/20 pb-3">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Concept Inspector
                </h4>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20">
                {activeNode.id.toUpperCase()}
              </span>
            </div>

            {/* Extent (Objects / Cameras) */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                EXTENT (Context Cameras/Zones)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeNode.extent.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">Empty set (Bottom concept)</span>
                ) : (
                  activeNode.extent.map((ext, i) => (
                    <span key={i} className="text-xs px-2 py-0.8 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {ext}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Intent (Attributes / Detections) */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                INTENT (Identified Attributes)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeNode.intent.map((int, i) => (
                  <span key={i} className="text-xs px-2 py-0.8 rounded bg-cyan-950/20 text-cyan-300 border border-cyan-500/20">
                    {int}
                  </span>
                ))}
              </div>
            </div>

            {/* Formula Expression */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-900 space-y-1">
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block font-mono">
                Formal Concept Definition
              </span>
              <code className="text-xs text-blue-300 block font-mono truncate leading-normal">
                {activeNode.formula}
              </code>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-900/60 mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Decision Rules mapping
              </span>
              <span className="text-cyan-400 font-semibold font-mono">
                Conf: {activeNode.confidence}%
              </span>
            </div>
            <p className="text-xs text-white leading-relaxed font-semibold bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              {activeNode.action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
