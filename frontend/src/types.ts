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

export interface SimulationResults {
  times: number[];
  pressures: Record<string, number[]>;
  flows: Record<string, number[]>;
  leak_demands?: Record<string, number[]>;
}

export interface AIAlert {
  isLeakDetected: boolean;
  probability: number;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  detectedNode: string | null;
  timestamp: string;
  pressureDrop: number;
  message: string;
}
