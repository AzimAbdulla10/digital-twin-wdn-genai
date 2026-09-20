import React, { useState } from 'react';
import type { NetworkNode } from '../types';
import { Play, RotateCcw, Flame, Sliders } from 'lucide-react';

interface LeakControlPanelProps {
  junctions: NetworkNode[];
  onInjectLeak: (nodeId: string, leakArea: number) => Promise<void>;
  onReset: () => Promise<void>;
  activeLeakNodeId: string | null;
  isLoading: boolean;
}

export const LeakControlPanel: React.FC<LeakControlPanelProps> = ({
  junctions,
  onInjectLeak,
  onReset,
  activeLeakNodeId,
  isLoading,
}) => {
  const [selectedJunction, setSelectedJunction] = useState<string>('11');
  const [leakArea, setLeakArea] = useState<number>(0.005);

  const handleInject = () => {
    if (!selectedJunction) return;
    onInjectLeak(selectedJunction, leakArea);
  };

  const presets = ['11', '12', '22', '31'];

  return (
    <div className="w-full bg-[#000000]/90 rounded-lg border border-zinc-800 p-5 flex flex-col ">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Leak Injection Sandbox</h3>
            <p className="text-xs text-zinc-400">Simulate pipe burst anomalies via WNTR</p>
          </div>
        </div>

        {activeLeakNodeId && (
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-semibold animate-pulse">
            Active: Node {activeLeakNodeId}
          </span>
        )}
      </div>

      {/* Preset Quick Buttons */}
      <div className="mb-4">
        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Quick Presets</label>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => {
                setSelectedJunction(p);
                onInjectLeak(p, leakArea);
              }}
              disabled={isLoading}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition-all border ${
                activeLeakNodeId === p
                  ? 'bg-red-600/30 border-red-500 text-red-200'
                  : selectedJunction === p
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-[#09090b] border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
              }`}
            >
              J{p} Leak
            </button>
          ))}
        </div>
      </div>

      {/* Target Junction Selector & Leak Area Slider */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs font-medium text-zinc-400 mb-1 block">Target Junction</label>
          <select
            value={selectedJunction}
            onChange={(e) => setSelectedJunction(e.target.value)}
            disabled={isLoading}
            className="w-full bg-[#09090b] border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {junctions
              .filter((j) => j.type === 'junction')
              .map((j) => (
                <option key={j.id} value={j.id}>
                  Junction J{j.id} (Elev: {j.elevation.toFixed(1)}m, Base Demand: {j.demand.toFixed(1)} L/s)
                </option>
              ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-400 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" /> Leak Orifice Area
            </span>
            <span className="font-mono text-cyan-300">{leakArea.toFixed(4)} m²</span>
          </div>
          <input
            type="range"
            min="0.001"
            max="0.015"
            step="0.001"
            value={leakArea}
            onChange={(e) => setLeakArea(parseFloat(e.target.value))}
            disabled={isLoading}
            className="w-full accent-zinc-400 bg-zinc-800 rounded-lg h-1.5 cursor-pointer"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleInject}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black border border-white font-medium py-2 px-4 rounded-md text-sm transition-all   disabled:opacity-50 active:scale-95 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          <span>Inject Leak at J{selectedJunction}</span>
        </button>

        <button
          onClick={onReset}
          disabled={isLoading || !activeLeakNodeId}
          title="Reset to Baseline"
          className="flex items-center justify-center gap-1.5 bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-medium py-2 px-3.5 rounded-md text-sm transition-all disabled:opacity-30 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
