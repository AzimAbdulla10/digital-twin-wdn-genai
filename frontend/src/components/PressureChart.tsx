import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { NetworkNode, SimulationResults } from '../types';
import { Gauge, TrendingDown } from 'lucide-react';

interface PressureChartProps {
  selectedNode: NetworkNode | null;
  baselineResults: SimulationResults | null;
  currentResults: SimulationResults | null;
  leakNodeId: string | null;
  currentTimestep: number;
}

export const PressureChart: React.FC<PressureChartProps> = ({
  selectedNode,
  baselineResults,
  currentResults,
  leakNodeId,
  currentTimestep,
}) => {
  if (!selectedNode) {
    return (
      <div className="w-full h-72 bg-slate-950/80 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center text-slate-500">
        <Gauge className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
        <p className="text-sm">Select a junction or node on the map to inspect pressure history</p>
      </div>
    );
  }

  const times = baselineResults?.times || currentResults?.times || Array.from({ length: 25 }, (_, i) => i);
  const baselinePressures = baselineResults?.pressures[selectedNode.id] || [];
  const currentPressures = currentResults?.pressures[selectedNode.id] || [];

  const chartData = times.map((t, idx) => ({
    hour: `${t}:00`,
    time: t,
    baseline: baselinePressures[idx] !== undefined ? Number(baselinePressures[idx].toFixed(2)) : null,
    simulated: currentPressures[idx] !== undefined ? Number(currentPressures[idx].toFixed(2)) : null,
  }));

  const activeBaseline = baselinePressures[currentTimestep] || 0;
  const activeCurrent = currentPressures[currentTimestep] || 0;
  const deltaPressure = activeCurrent - activeBaseline;
  const isDrop = deltaPressure < -1;

  return (
    <div className="w-full bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Pressure Profile: <span className="text-cyan-400 font-mono">Node {selectedNode.id}</span>
              {leakNodeId === selectedNode.id && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Leak Injected
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">24-Hour Pressure Head (m) Hydraulic Response</p>
          </div>
        </div>

        {/* Current Delta Badge */}
        {currentResults && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-400">At Hour {currentTimestep}:00</span>
              <div className="text-sm font-mono font-bold text-slate-200">
                {activeCurrent.toFixed(1)} m
              </div>
            </div>
            {isDrop && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-mono font-semibold animate-pulse">
                <TrendingDown className="w-3.5 h-3.5" />
                {deltaPressure.toFixed(1)} m
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="simulatedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={leakNodeId ? "#ef4444" : "#10b981"} stopOpacity={0.4} />
                <stop offset="95%" stopColor={leakNodeId ? "#ef4444" : "#10b981"} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} unit="m" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#1e293b',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

            <ReferenceLine
              x={`${currentTimestep}:00`}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
              label={{ value: 'Current', fill: '#94a3b8', fontSize: 10, position: 'insideTopLeft' }}
            />

            {/* Baseline Area */}
            <Area
              type="monotone"
              dataKey="baseline"
              name="Baseline Normal"
              stroke="#0ea5e9"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#baselineGrad)"
            />

            {/* Simulated / Leak Area */}
            {currentResults && (
              <Area
                type="monotone"
                dataKey="simulated"
                name={leakNodeId ? "With Leak" : "Live Simulation"}
                stroke={leakNodeId ? "#ef4444" : "#10b981"}
                strokeWidth={2.5}
                strokeDasharray={leakNodeId ? "4 2" : undefined}
                fillOpacity={1}
                fill="url(#simulatedGrad)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
