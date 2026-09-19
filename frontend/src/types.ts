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

export interface SimulationResults {
  times: number[];
  pressures: Record<string, number[]>;
  flows: Record<string, number[]>;
  leak_demands?: Record<string, number[]>;
  ai_detection?: MLPrediction;
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
