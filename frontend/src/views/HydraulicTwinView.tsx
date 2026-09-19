import React from 'react';
import type {
  NetworkTopology,
  NetworkNode,
  NetworkLink,
  SimulationResults,
  AIAlert,
} from '../types';
import { NetworkMap } from '../components/NetworkMap';
import { PressureChart } from '../components/PressureChart';
import { LeakControlPanel } from '../components/LeakControlPanel';
import { AIAlertCard } from '../components/AIAlertCard';
import { Layers } from 'lucide-react';

interface HydraulicTwinViewProps {
  topology: NetworkTopology | null;
  baselineResults: SimulationResults | null;
  currentResults: SimulationResults | null;
  selectedNode: NetworkNode | null;
  onSelectNode: (node: NetworkNode | null) => void;
  selectedLink: NetworkLink | null;
  onSelectLink: (link: NetworkLink | null) => void;
  leakNodeId: string | null;
  currentTimestep: number;
  aiAlert: AIAlert;
  onInjectLeak: (nodeId: string, leakArea: number) => Promise<void>;
  onReset: () => Promise<void>;
  isLoading: boolean;
  onNavigateToGenAI?: () => void;
}

export const HydraulicTwinView: React.FC<HydraulicTwinViewProps> = ({
  topology,
  baselineResults,
  currentResults,
  selectedNode,
  onSelectNode,
  selectedLink,
  onSelectLink,
  leakNodeId,
  currentTimestep,
  aiAlert,
  onInjectLeak,
  onReset,
  isLoading,
  onNavigateToGenAI,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Network Map & Pressure Time-Series (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Top: SVG Network Visualizer */}
        <div className="min-h-[480px]">
          <NetworkMap
            nodes={topology?.nodes || []}
            links={topology?.links || []}
            selectedNode={selectedNode}
            onSelectNode={(node) => {
              onSelectNode(node);
              onSelectLink(null);
            }}
            selectedLink={selectedLink}
            onSelectLink={(link) => {
              onSelectLink(link);
            }}
            leakNodeId={leakNodeId}
            simulationResults={currentResults}
            currentTimestep={currentTimestep}
          />
        </div>

        {/* Bottom: Recharts Pressure Time-Series */}
        <div>
          <PressureChart
            selectedNode={selectedNode}
            baselineResults={baselineResults}
            currentResults={currentResults}
            leakNodeId={leakNodeId}
            currentTimestep={currentTimestep}
          />
        </div>
      </div>

      {/* Right Column: AI Diagnostics, Leak Sandbox & Inspector (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* AI Diagnostic Alert Card */}
        <AIAlertCard
          alert={aiAlert}
          disambiguation={currentResults?.disambiguation}
          riskAssessment={currentResults?.risk_assessment}
          onAskGPT={onNavigateToGenAI}
        />

        {/* Leak Injection Sandbox */}
        <LeakControlPanel
          junctions={topology?.nodes || []}
          onInjectLeak={onInjectLeak}
          onReset={onReset}
          activeLeakNodeId={leakNodeId}
          isLoading={isLoading}
        />

        {/* Telemetry Inspector */}
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Telemetry Inspector</h3>
              <p className="text-xs text-slate-400">Live element hydraulics at {currentTimestep}:00</p>
            </div>
          </div>

          {selectedNode ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Selected Element</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {selectedNode.type === 'junction'
                    ? `Junction J${selectedNode.id}`
                    : `${selectedNode.type.toUpperCase()} ${selectedNode.id}`}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Elevation</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {selectedNode.elevation.toFixed(1)} m
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Live Pressure</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    leakNodeId === selectedNode.id ? 'text-red-400' : 'text-emerald-300'
                  }`}
                >
                  {(
                    currentResults?.pressures[selectedNode.id]?.[currentTimestep] || 0
                  ).toFixed(2)}{' '}
                  m
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Base Demand</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {selectedNode.demand.toFixed(1)} L/s
                </span>
              </div>
            </div>
          ) : selectedLink ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Link ID</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  Pipe P{selectedLink.id} ({selectedLink.source} → {selectedLink.target})
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Flow Rate</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {(currentResults?.flows[selectedLink.id]?.[currentTimestep] || 0).toFixed(2)}{' '}
                  L/s
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Diameter</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {selectedLink.diameter.toFixed(0)} mm
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Length</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {selectedLink.length.toFixed(0)} m
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">
              Click any node or pipe on the map to inspect properties.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
