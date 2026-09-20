import type { NetworkTopology, SimulationResults, MLPrediction, DemandForecastResponse, AskAIResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchNetworkTopology(): Promise<NetworkTopology> {
  const res = await fetch(`${API_BASE_URL}/network`);
  if (!res.ok) {
    throw new Error(`Failed to load network topology: ${res.statusText}`);
  }
  return res.json();
}

export async function runBaselineSimulation(temp: number = 24.0, isWeekend: number = 0): Promise<SimulationResults> {
  const res = await fetch(`${API_BASE_URL}/simulate?temp=${temp}&is_weekend=${isWeekend}`);
  if (!res.ok) {
    throw new Error(`Failed to run baseline simulation: ${res.statusText}`);
  }
  return res.json();
}

export async function injectLeak(
  nodeId: string,
  leakArea: number = 0.005,
  temp: number = 24.0,
  isWeekend: number = 0
): Promise<SimulationResults> {
  const res = await fetch(`${API_BASE_URL}/inject-leak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      node_id: nodeId,
      leak_area: leakArea,
      temperature: temp,
      is_weekend: isWeekend,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to inject leak: ${res.statusText}`);
  }
  return res.json();
}

export async function detectLeak(
  currentPressures: Record<string, number>,
  baselinePressures?: Record<string, number>
): Promise<MLPrediction> {
  const res = await fetch(`${API_BASE_URL}/detect-leak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      current_pressures: currentPressures,
      baseline_pressures: baselinePressures,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to run ML detection: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchDemandForecast(temp: number = 24.0, isWeekend: number = 0): Promise<DemandForecastResponse> {
  const res = await fetch(`${API_BASE_URL}/forecast-demand?temp=${temp}&is_weekend=${isWeekend}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch demand forecast: ${res.statusText}`);
  }
  return res.json();
}

export async function askAIAssistant(payload: {
  prompt: string;
  current_timestep?: number;
  temperature?: number;
  is_weekend?: number;
  leak_node_id?: string | null;
  current_pressures?: Record<string, number>;
  ai_alert?: any;
  risk_assessment?: any;
  disambiguation?: any;
}): Promise<AskAIResponse> {
  const res = await fetch(`${API_BASE_URL}/ask-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to consult GenAI Assistant: ${res.statusText}`);
  }
  return res.json();
}
