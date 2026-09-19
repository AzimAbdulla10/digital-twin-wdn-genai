import React, { useEffect, useState, useMemo } from 'react';
import type {
  NetworkTopology,
  NetworkNode,
  NetworkLink,
  SimulationResults,
  AIAlert,
  MLPrediction,
} from './types';
import { fetchNetworkTopology, runBaselineSimulation, injectLeak, detectLeak } from './api';
import { NetworkMap } from './components/NetworkMap';
import { PressureChart } from './components/PressureChart';
import { DemandForecastChart } from './components/DemandForecastChart';
import { LeakControlPanel } from './components/LeakControlPanel';
import { AIAlertCard } from './components/AIAlertCard';
import { ScenarioControlBar } from './components/ScenarioControlBar';
import {
  Droplet,
  RefreshCw,
  Clock,
  Layers,
  Activity,
  TrendingUp,
} from 'lucide-react';

export const App: React.FC = () => {
  const [topology, setTopology] = useState<NetworkTopology | null>(null);
  const [baselineResults, setBaselineResults] = useState<SimulationResults | null>(null);
  const [currentResults, setCurrentResults] = useState<SimulationResults | null>(null);
  const [liveMLPrediction, setLiveMLPrediction] = useState<MLPrediction | null>(null);

  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<NetworkLink | null>(null);
  const [leakNodeId, setLeakNodeId] = useState<string | null>(null);
  const [currentTimestep, setCurrentTimestep] = useState<number>(12); // Hour 12:00 noon
  const [activeTab, setActiveTab] = useState<'pressure' | 'demand'>('pressure');

  // Scenario and Environmental States
  const [temperature, setTemperature] = useState<number>(22.0);
  const [isWeekend, setIsWeekend] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<string | null>('nominal');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load: Fetch topology and run baseline simulation
  useEffect(() => {
    async function initData() {
      try {
        setIsLoading(true);
        setError(null);
        const net = await fetchNetworkTopology();
        setTopology(net);

        // Select junction 11 by default
        const defaultNode = net.nodes.find((n) => n.id === '11') || net.nodes[0];
        setSelectedNode(defaultNode);

        const sim = await runBaselineSimulation(22.0, 0);
        setBaselineResults(sim);
        setCurrentResults(sim);
        if (sim.ai_detection) {
          setLiveMLPrediction(sim.ai_detection);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect to backend.');
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  // Update ML inference dynamically when currentTimestep or currentResults change
  useEffect(() => {
    if (!currentResults || !baselineResults) return;

    const junctions = ['10', '11', '12', '13', '21', '22', '23', '31', '32'];
    const currentP: Record<string, number> = {};
    const baselineP: Record<string, number> = {};

    junctions.forEach((j) => {
      currentP[j] = currentResults.pressures[j]?.[currentTimestep] ?? 80.0;
      baselineP[j] = baselineResults.pressures[j]?.[currentTimestep] ?? 80.0;
    });

    detectLeak(currentP, baselineP)
      .then((pred) => setLiveMLPrediction(pred))
      .catch((e) => console.warn('Real-time ML inference warning:', e));
  }, [currentTimestep, currentResults, baselineResults]);

  // Format AI Alert from Scikit-learn Prediction
  const aiAlert = useMemo<AIAlert>(() => {
    if (!liveMLPrediction || !liveMLPrediction.is_leak) {
      return {
        isLeakDetected: false,
        probability: liveMLPrediction ? liveMLPrediction.leak_probability : 0.02,
        severity: 'NORMAL',
        detectedNode: null,
        timestamp: `${currentTimestep.toString().padStart(2, '0')}:00:00`,
        pressureDrop: 0,
        message: 'Hydraulic equilibrium nominal. All sensor pressures within normal operational baseline.',
        modelType: liveMLPrediction?.model_type,
        modelAccuracy: liveMLPrediction?.model_accuracy,
        topSensors: [],
      };
    }

    const drop = liveMLPrediction.max_pressure_drop;
    const node = liveMLPrediction.localized_node;

    return {
      isLeakDetected: true,
      probability: liveMLPrediction.leak_probability,
      severity: liveMLPrediction.severity,
      detectedNode: node,
      timestamp: `${currentTimestep.toString().padStart(2, '0')}:00:00`,
      pressureDrop: drop,
      message: `Scikit-learn Random Forest detected an active pipe breach localized at Junction ${node}. Max observed pressure drop is ${drop.toFixed(
        1
      )} m with ${((liveMLPrediction.confidence || 0.9) * 100).toFixed(0)}% model certainty.`,
      modelType: liveMLPrediction.model_type,
      modelAccuracy: liveMLPrediction.model_accuracy,
      topSensors: liveMLPrediction.top_affected_nodes,
    };
  }, [liveMLPrediction, currentTimestep]);

  // Handler: Change Scenario / Weather Conditions
  const handleScenarioChange = async (newTemp: number, newWeekend: number, presetId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setTemperature(newTemp);
      setIsWeekend(newWeekend);
      if (presetId) setActivePreset(presetId);

      // Run baseline under new weather condition
      const baselineSim = await runBaselineSimulation(newTemp, newWeekend);
      setBaselineResults(baselineSim);

      if (leakNodeId) {
        // If leak active, re-simulate leak under new weather condition
        const leakSim = await injectLeak(leakNodeId, 0.005, newTemp, newWeekend);
        setCurrentResults(leakSim);
        if (leakSim.ai_detection) setLiveMLPrediction(leakSim.ai_detection);
      } else {
        setCurrentResults(baselineSim);
        if (baselineSim.ai_detection) setLiveMLPrediction(baselineSim.ai_detection);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update scenario.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Inject Leak
  const handleInjectLeak = async (nodeId: string, leakArea: number) => {
    try {
      setIsLoading(true);
      setError(null);
      setLeakNodeId(nodeId);

      // Auto-select the leak node on the map
      const node = topology?.nodes.find((n) => n.id === nodeId);
      if (node) setSelectedNode(node);

      const sim = await injectLeak(nodeId, leakArea, temperature, isWeekend);
      setCurrentResults(sim);
      if (sim.ai_detection) {
        setLiveMLPrediction(sim.ai_detection);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run leak simulation.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Reset Simulation
  const handleReset = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLeakNodeId(null);
      const sim = await runBaselineSimulation(temperature, isWeekend);
      setBaselineResults(sim);
      setCurrentResults(sim);
      if (sim.ai_detection) {
        setLiveMLPrediction(sim.ai_detection);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Droplet className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight m-0">
                HydroTwin AI
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                v1.0 Digital Twin
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">
              AI-Driven Water Distribution Twin • WNTR + EPANET + Scikit-Learn
            </p>
          </div>
        </div>

        {/* Timestep Scrubber & Global Status */}
        <div className="flex items-center gap-6">
          {/* 24-Hour Timeline Scrubber */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-inner">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-slate-300">Timeline:</span>
            <input
              type="range"
              min="0"
              max="24"
              value={currentTimestep}
              onChange={(e) => setCurrentTimestep(parseInt(e.target.value))}
              className="w-28 accent-cyan-400 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-cyan-300 w-12">
              {currentTimestep.toString().padStart(2, '0')}:00
            </span>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-mono">Backend: 8000</span>
          </div>

          {/* Reset / Reload button */}
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      {/* Predictive Scenario Control Toolbar */}
      <ScenarioControlBar
        temperature={temperature}
        isWeekend={isWeekend}
        onScenarioChange={handleScenarioChange}
        activePreset={activePreset}
        riskAssessment={currentResults?.risk_assessment}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        {/* Error Alert if any */}
        {error && (
          <div className="lg:col-span-12 p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs underline hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Left Column: Network Map & Pressure Charts (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Top: SVG Network Visualizer */}
          <div className="flex-1 min-h-[480px]">
            <NetworkMap
              nodes={topology?.nodes || []}
              links={topology?.links || []}
              selectedNode={selectedNode}
              onSelectNode={(node) => {
                setSelectedNode(node);
                setSelectedLink(null);
              }}
              selectedLink={selectedLink}
              onSelectLink={(link) => {
                setSelectedLink(link);
              }}
              leakNodeId={leakNodeId}
              simulationResults={currentResults}
              currentTimestep={currentTimestep}
            />
          </div>

          {/* Bottom: Analytics Tabs & Charts */}
          <div className="flex flex-col gap-3">
            {/* Chart Mode Switcher */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 p-1.5 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('pressure')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'pressure'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Hydraulic Pressure Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('demand')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'demand'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>24h Demand Forecast (BWDF)</span>
              </button>
            </div>

            {/* Active Chart View */}
            {activeTab === 'pressure' ? (
              <PressureChart
                selectedNode={selectedNode}
                baselineResults={baselineResults}
                currentResults={currentResults}
                leakNodeId={leakNodeId}
                currentTimestep={currentTimestep}
              />
            ) : (
              <DemandForecastChart
                currentTimestep={currentTimestep}
                temperature={temperature}
                isWeekend={isWeekend}
                onScenarioChange={handleScenarioChange}
              />
            )}
          </div>
        </div>

        {/* Right Column: AI Diagnostics, Leak Controls & Inspectors (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* AI Alert Card */}
          <AIAlertCard
            alert={aiAlert}
            disambiguation={currentResults?.disambiguation}
            riskAssessment={currentResults?.risk_assessment}
            onAskGPT={() => {
              alert(
                `Phase 4 Preview: Passing ML Telemetry to GPT:\n• Localized Node: Junction ${aiAlert.detectedNode}\n• ML Probability: ${(aiAlert.probability * 100).toFixed(1)}%\n• Max Pressure Drop: ${aiAlert.pressureDrop.toFixed(1)} m\n• Top Affected Sensors: ${aiAlert.topSensors?.map(s => `J${s.node} (-${s.drop}m)`).join(', ')}`
              );
            }}
          />

          {/* Leak Injection Sandbox */}
          <LeakControlPanel
            junctions={topology?.nodes || []}
            onInjectLeak={handleInjectLeak}
            onReset={handleReset}
            activeLeakNodeId={leakNodeId}
            isLoading={isLoading}
          />

          {/* Node & Pipe Inspector */}
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
                    {(currentResults?.flows[selectedLink.id]?.[currentTimestep] || 0).toFixed(
                      2
                    )}{' '}
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
      </main>
    </div>
  );
};

export default App;
