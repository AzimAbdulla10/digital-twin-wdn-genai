import type { NetworkTopology, SimulationResults, MLPrediction, DemandForecastResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchNetworkTopology(): Promise<NetworkTopology> {
  const res = await fetch(`${API_BASE_URL}/network`);
  if (!res.ok) {
    throw new Error(`Failed to load network topology: ${res.statusText}`);
  }
  return res.json();
}

export async function runBaselineSimulation(): Promise<SimulationResults> {
  const res = await fetch(`${API_BASE_URL}/simulate`);
  if (!res.ok) {
    throw new Error(`Failed to run baseline simulation: ${res.statusText}`);
  }
  return res.json();
}

export async function injectLeak(nodeId: string, leakArea: number = 0.005): Promise<SimulationResults> {
  const res = await fetch(`${API_BASE_URL}/inject-leak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      node_id: nodeId,
      leak_area: leakArea,
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
