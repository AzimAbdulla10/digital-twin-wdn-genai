import React, { useMemo } from 'react';
import type { NetworkNode, NetworkLink, SimulationResults } from '../types';
import { Waves, Activity } from 'lucide-react';

interface NetworkMapProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  selectedNode: NetworkNode | null;
  onSelectNode: (node: NetworkNode) => void;
  selectedLink: NetworkLink | null;
  onSelectLink: (link: NetworkLink) => void;
  leakNodeId: string | null;
  simulationResults: SimulationResults | null;
  currentTimestep: number;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  nodes,
  links,
  selectedNode,
  onSelectNode,
  selectedLink,
  onSelectLink,
  leakNodeId,
  simulationResults,
  currentTimestep,
}) => {
  // Compute coordinate bounds
  const { minX, maxX, minY, maxY, width, height, nodeMap } = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 800, height: 600, nodeMap: new Map() };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const map = new Map<string, NetworkNode>();

    nodes.forEach((n) => {
      map.set(n.id, n);
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: 900,
      height: 520,
      nodeMap: map,
    };
  }, [nodes]);

  // Coordinate conversion: EPANET has (0,0) at bottom-left, SVG has (0,0) at top-left
  const pad = 70;
  const scaleX = (width - pad * 2) / (maxX - minX || 1);
  const scaleY = (height - pad * 2) / (maxY - minY || 1);

  const getSvgCoords = (x: number, y: number) => {
    return {
      cx: pad + (x - minX) * scaleX,
      cy: height - (pad + (y - minY) * scaleY),
    };
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-950 rounded-2xl border border-slate-800/80 p-4 flex flex-col shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Header info badge */}
      <div className="flex items-center justify-between z-10 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-wide">Network Topology Visualizer</h3>
            <p className="text-xs text-slate-400">EPANET Net1 Digital Twin Model</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-500/50"></span>
            <span>Reservoir (Source)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block shadow-sm shadow-indigo-500/50"></span>
            <span>Tank</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-500/50"></span>
            <span>Junction</span>
          </div>
          {leakNodeId && (
            <div className="flex items-center gap-1.5 animate-pulse text-red-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-lg shadow-red-500"></span>
              <span>Active Leak</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          style={{ filter: 'drop-shadow(0 0 20px rgba(14, 165, 233, 0.05))' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
            </pattern>
            {/* Pipe Glow Filter */}
            <filter id="glow-leak" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Pipes / Links */}
          <g className="links">
            {links.map((link) => {
              const src = nodeMap.get(link.source);
              const tgt = nodeMap.get(link.target);
              if (!src || !tgt) return null;

              const p1 = getSvgCoords(src.x, src.y);
              const p2 = getSvgCoords(tgt.x, tgt.y);
              const isSelected = selectedLink?.id === link.id;

              // Calculate flow rate at current timestep
              const flowSeries = simulationResults?.flows[link.id];
              const currentFlow = flowSeries ? flowSeries[currentTimestep] || 0 : 0;
              const hasLeakNear = link.source === leakNodeId || link.target === leakNodeId;

              // Pipe midpoint for label
              const midX = (p1.cx + p2.cx) / 2;
              const midY = (p1.cy + p2.cy) / 2;

              return (
                <g
                  key={link.id}
                  onClick={() => onSelectLink(link)}
                  className="cursor-pointer group"
                >
                  {/* Invisible wide stroke for easy clicking */}
                  <line
                    x1={p1.cx}
                    y1={p1.cy}
                    x2={p2.cx}
                    y2={p2.cy}
                    stroke="transparent"
                    strokeWidth="18"
                  />

                  {/* Main Pipe Line */}
                  <line
                    x1={p1.cx}
                    y1={p1.cy}
                    x2={p2.cx}
                    y2={p2.cy}
                    stroke={
                      isSelected
                        ? '#38bdf8'
                        : hasLeakNear
                        ? '#f87171'
                        : link.type === 'pump'
                        ? '#facc15'
                        : '#334155'
                    }
                    strokeWidth={isSelected ? '4' : link.type === 'pump' ? '3.5' : '2.5'}
                    strokeDasharray={link.type === 'pump' ? '6 4' : undefined}
                    className="transition-colors duration-200"
                  />

                  {/* Animated flow pulse if simulated */}
                  {simulationResults && Math.abs(currentFlow) > 0.1 && (
                    <line
                      x1={p1.cx}
                      y1={p1.cy}
                      x2={p2.cx}
                      y2={p2.cy}
                      stroke={hasLeakNear ? '#ef4444' : '#0284c7'}
                      strokeWidth={isSelected ? '3' : '2'}
                      strokeDasharray="4 12"
                      className="animate-[dash_1.5s_linear_infinite]"
                    />
                  )}

                  {/* Pipe ID / Flow label */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-18"
                      y="-10"
                      width="36"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke={isSelected ? '#38bdf8' : '#1e293b'}
                      strokeWidth="1"
                      className="group-hover:stroke-cyan-400 transition-colors"
                    />
                    <text
                      y="3"
                      textAnchor="middle"
                      fill={isSelected ? '#38bdf8' : '#94a3b8'}
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      P{link.id}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node) => {
              const { cx, cy } = getSvgCoords(node.x, node.y);
              const isSelected = selectedNode?.id === node.id;
              const isLeak = leakNodeId === node.id;

              const pressureSeries = simulationResults?.pressures[node.id];
              const currentPressure = pressureSeries ? pressureSeries[currentTimestep] || 0 : null;

              return (
                <g
                  key={node.id}
                  transform={`translate(${cx}, ${cy})`}
                  onClick={() => onSelectNode(node)}
                  className="cursor-pointer group"
                >
                  {/* Leak Radar Ping Animation */}
                  {isLeak && (
                    <>
                      <circle
                        r="24"
                        fill="rgba(239, 68, 68, 0.15)"
                        className="animate-ping origin-center"
                      />
                      <circle
                        r="32"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        opacity="0.4"
                        className="animate-pulse"
                      />
                    </>
                  )}

                  {/* Selection Ring */}
                  {isSelected && (
                    <circle
                      r="20"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      className="animate-[spin_6s_linear_infinite] origin-center"
                    />
                  )}

                  {/* Node Shape based on Type */}
                  {node.type === 'reservoir' ? (
                    // Reservoir: Diamond / Rounded Square
                    <rect
                      x="-14"
                      y="-14"
                      width="28"
                      height="28"
                      rx="6"
                      fill="#064e3b"
                      stroke="#34d399"
                      strokeWidth="2.5"
                      className="group-hover:brightness-125 transition-all shadow-lg"
                    />
                  ) : node.type === 'tank' ? (
                    // Tank: Cylinder / Rounded Rect
                    <rect
                      x="-12"
                      y="-16"
                      width="24"
                      height="32"
                      rx="5"
                      fill="#312e81"
                      stroke="#818cf8"
                      strokeWidth="2.5"
                      className="group-hover:brightness-125 transition-all shadow-lg"
                    />
                  ) : (
                    // Junction: Circle
                    <circle
                      r={isLeak ? "13" : "10"}
                      fill={isLeak ? "#7f1d1d" : "#082f49"}
                      stroke={isLeak ? "#ef4444" : isSelected ? "#38bdf8" : "#0284c7"}
                      strokeWidth={isLeak ? "3" : "2.5"}
                      filter={isLeak ? "url(#glow-leak)" : undefined}
                      className="group-hover:scale-110 transition-transform duration-150"
                    />
                  )}

                  {/* Inner glyph icon */}
                  {node.type === 'reservoir' && (
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      RES
                    </text>
                  )}
                  {node.type === 'tank' && (
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#818cf8"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      TK
                    </text>
                  )}
                  {node.type === 'junction' && (
                    <text
                      y="3"
                      textAnchor="middle"
                      fill={isLeak ? "#fca5a5" : "#e0f2fe"}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.id}
                    </text>
                  )}

                  {/* Top Label (Node Name & Pressure) */}
                  <g transform={`translate(0, ${node.type === 'tank' ? -24 : -18})`}>
                    <rect
                      x="-22"
                      y="-12"
                      width="44"
                      height="16"
                      rx="4"
                      fill="#030712"
                      fillOpacity="0.85"
                      stroke={isLeak ? '#ef4444' : isSelected ? '#38bdf8' : '#1e293b'}
                      strokeWidth="1"
                    />
                    <text
                      y="-1"
                      textAnchor="middle"
                      fill={isLeak ? '#ef4444' : '#f8fafc'}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {node.type === 'junction' ? `J${node.id}` : node.type.toUpperCase()}
                    </text>
                  </g>

                  {/* Bottom Real-time Pressure Value */}
                  {currentPressure !== null && (
                    <g transform="translate(0, 24)">
                      <rect
                        x="-26"
                        y="-10"
                        width="52"
                        height="16"
                        rx="4"
                        fill="#090d16"
                        stroke={isLeak ? '#ef4444' : '#0ea5e9'}
                        strokeWidth="0.8"
                      />
                      <text
                        y="1"
                        textAnchor="middle"
                        fill={isLeak ? '#f87171' : '#38bdf8'}
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        {currentPressure.toFixed(1)} m
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Footer controls hint */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60 z-10">
        <span className="flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-cyan-400" /> Click any node or pipe to inspect live hydraulic parameters
        </span>
        <span>Time: Hour {currentTimestep}:00</span>
      </div>
    </div>
  );
};
