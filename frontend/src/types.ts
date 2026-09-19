export type NodeType = 'junction' | 'reservoir' | 'tank';
export type LinkType = 'pipe' | 'pump' | 'valve';

export interface NetworkNode {
  id: string;
  type: NodeType;
  elevation: number;
  demand: number;
  x: number;
  y: number;
}

export interface NetworkLink {
  id: string;
  type: LinkType;
  source: string;
  target: string;
  length: number;
  diameter: number;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface TopAffectedNode {
  node: string;
  drop: number;
}

export interface MLPrediction {
  is_leak: boolean;
  leak_probability: number;
  localized_node: string;
  severity: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  max_pressure_drop: number;
  top_affected_nodes: TopAffectedNode[];
  model_type: string;
  model_accuracy: number;
}

export interface DisambiguationInfo {
  status: 'NOMINAL' | 'WEATHER_DEMAND_SURGE' | 'ANOMALOUS_LEAK_CONFIRMED';
  category: string;
  severity: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  confidence: number;
  localized_node: string | null;
  title: string;
  reason: string;
  action_required: string;
}

export interface RiskAssessment {
  min_pressure: {
    node: string;
    hour: string;
    pressure_m: number;
    status: 'NOMINAL' | 'ELEVATED_STRESS';
  };
  tank_reserve: {
    tank_id: string;
    min_level_m: number;
    min_hour: string;
    capacity_pct: number;
    status: 'NOMINAL' | 'DEPLETION_RISK';
  };
  low_pressure_events_count: number;
  total_delivered_m3: number;
}

export interface SimulationResults {
  times: number[];
  pressures: Record<string, number[]>;
  flows: Record<string, number[]>;
  tank_levels?: Record<string, number[]>;
  leak_demands?: Record<string, number[]>;
  ai_detection?: MLPrediction;
  forecast?: DemandForecastResponse;
  risk_assessment?: RiskAssessment;
  disambiguation?: DisambiguationInfo;
}

export interface AIAlert {
  isLeakDetected: boolean;
  probability: number;
  severity: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedNode: string | null;
  timestamp: string;
  pressureDrop: number;
  message: string;
  modelType?: string;
  modelAccuracy?: number;
  topSensors?: TopAffectedNode[];
}

export interface HourlyForecastPoint {
  hour: string;
  hour_int: number;
  forecast_demand_lps: number;
  upper_bound_lps: number;
  lower_bound_lps: number;
  temperature_c: number;
  is_peak: boolean;
  junction_demands: Record<string, number>;
}

export interface DemandForecastResponse {
  status: string;
  dataset_source: string;
  model_type: string;
  model_r2_score: number;
  model_mae_lps: number;
  peak_demand: {
    hour: string;
    value_lps: number;
    warning: string;
  };
  minimum_demand: {
    hour: string;
    value_lps: number;
    status: string;
  };
  forecast_24h: HourlyForecastPoint[];
}
