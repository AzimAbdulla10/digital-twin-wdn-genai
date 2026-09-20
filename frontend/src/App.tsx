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
import { HydraulicTwinView } from './views/HydraulicTwinView';
import { DemandForecastingView } from './views/DemandForecastingView';
import { GenAIAssistantView } from './views/GenAIAssistantView';
import { ScenarioControlBar } from './components/ScenarioControlBar';
import {
  Droplet,
  RefreshCw,
  Clock,
  Activity,
  TrendingUp,
  Bot,
  Sparkles,
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
  
  // Top-Level Navigation View: 'twin' | 'forecast' | 'genai'
  const [currentView, setCurrentView] = useState<'twin' | 'forecast' | 'genai'>('twin');

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
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Main Navigation Header Bar */}
      <header className="sticky top-0 z-50 bg-[#000000]/90 backdrop-blur-xl border-b border-zinc-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center  shadow-cyan-500/20">
            <Droplet className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-100 tracking-tight m-0">
                HydroTwin AI
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-cyan-500/10 text-zinc-400 border border-cyan-500/30">
                v1.0 Digital Twin
              </span>
            </div>
            <p className="text-xs text-zinc-400 m-0">
              AI-Driven Water Distribution Twin • WNTR + EPANET + Scikit-Learn
            </p>
          </div>
        </div>

        {/* Top-Level Navigation Modules */}
        <nav className="flex items-center gap-1.5 bg-[#09090b]/90 p-1 rounded-md border border-zinc-800 ">
          <button
            onClick={() => setCurrentView('twin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'twin'
                ? 'bg-white text-black border border-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Hydraulic Twin & Leak Detection</span>
          </button>

          <button
            onClick={() => setCurrentView('forecast')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'forecast'
                ? 'bg-white text-black border border-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Urban Demand Forecasting (BWDF)</span>
          </button>

          <button
            onClick={() => setCurrentView('genai')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'genai'
                ? 'bg-white text-black border border-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Bot className={`w-4 h-4 ${currentView === "genai" ? "text-black" : "text-zinc-400"}`} />
            <span>GenAI Operator Assistant</span>
            <Sparkles className={`w-3 h-3 ${currentView === "genai" ? "text-black" : "text-zinc-500"}`} />
          </button>
        </nav>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-4">
          {/* 24-Hour Timeline Scrubber */}
          <div className="flex items-center gap-2.5 bg-[#09090b]/90 border border-zinc-800 px-3 py-1.5 rounded-md ">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-300 font-medium">Timeline:</span>
            <input
              type="range"
              min="0"
              max="24"
              value={currentTimestep}
              onChange={(e) => setCurrentTimestep(parseInt(e.target.value))}
              className="w-24 accent-cyan-400 bg-zinc-800 rounded-lg h-1.5 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-cyan-300 w-11">
              {currentTimestep.toString().padStart(2, '0')}:00
            </span>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-all active:scale-95 cursor-pointer"
            title="Reset to baseline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      {/* Scenario Control Toolbar (Shown strictly on Demand Forecasting view) */}
      {currentView === 'forecast' && (
        <ScenarioControlBar
          temperature={temperature}
          isWeekend={isWeekend}
          onScenarioChange={handleScenarioChange}
          activePreset={activePreset}
          riskAssessment={currentResults?.risk_assessment}
          isLoading={isLoading}
        />
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-950/50 border border-red-500/40 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs underline hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Hydraulic Twin & Leak Detection View */}
        {currentView === 'twin' && (
          <HydraulicTwinView
            topology={topology}
            baselineResults={baselineResults}
            currentResults={currentResults}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            selectedLink={selectedLink}
            onSelectLink={setSelectedLink}
            leakNodeId={leakNodeId}
            currentTimestep={currentTimestep}
            aiAlert={aiAlert}
            onInjectLeak={handleInjectLeak}
            onReset={handleReset}
            isLoading={isLoading}
            onNavigateToGenAI={() => setCurrentView('genai')}
          />
        )}

        {/* Tab 2: Urban Demand Forecasting View */}
        {currentView === 'forecast' && (
          <DemandForecastingView
            currentTimestep={currentTimestep}
            temperature={temperature}
            isWeekend={isWeekend}
            riskAssessment={currentResults?.risk_assessment}
          />
        )}

        {/* Tab 3: GenAI Decision Support Assistant View */}
        {currentView === 'genai' && (
          <GenAIAssistantView
            currentResults={currentResults}
            aiAlert={aiAlert}
            leakNodeId={leakNodeId}
            currentTimestep={currentTimestep}
            temperature={temperature}
            isWeekend={isWeekend}
          />
        )}
      </main>
    </div>
  );
};

export default App;
