import React from 'react';
import {
  Sun,
  CloudRain,
  Calendar,
  Thermometer,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { RiskAssessment } from '../types';

export interface ScenarioPreset {
  id: string;
  label: string;
  temp: number;
  isWeekend: number;
  icon: React.ReactNode;
  desc: string;
}

interface ScenarioControlBarProps {
  temperature: number;
  isWeekend: number;
  onScenarioChange: (temp: number, weekend: number, presetId?: string) => void;
  activePreset: string | null;
  riskAssessment?: RiskAssessment;
  isLoading: boolean;
}

const PRESETS: ScenarioPreset[] = [
  {
    id: 'nominal',
    label: 'Nominal Baseline (22°C)',
    temp: 22.0,
    isWeekend: 0,
    icon: <Sparkles className="w-3.5 h-3.5 text-zinc-400" />,
    desc: 'Standard weekday diurnal demand',
  },
  {
    id: 'heatwave',
    label: 'Summer Heatwave (36°C)',
    temp: 36.0,
    isWeekend: 0,
    icon: <Sun className="w-3.5 h-3.5 text-amber-400" />,
    desc: '+28% thermal surge & tank draw-down',
  },
  {
    id: 'cool_rain',
    label: 'Cool Rainy Day (14°C)',
    temp: 14.0,
    isWeekend: 0,
    icon: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
    desc: 'Low municipal consumption',
  },
  {
    id: 'weekend',
    label: 'Weekend Peak (26°C)',
    temp: 26.0,
    isWeekend: 1,
    icon: <Calendar className="w-3.5 h-3.5 text-purple-400" />,
    desc: 'Shifted morning residential peak',
  },
];

export const ScenarioControlBar: React.FC<ScenarioControlBarProps> = ({
  temperature,
  isWeekend,
  onScenarioChange,
  activePreset,
  riskAssessment,
  isLoading,
}) => {
  return (
    <div className="bg-[#000000]/90 border-b border-zinc-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-md">
      {/* Left: Section Title & Presets */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
          <div className="p-1 rounded-lg bg-cyan-500/10 text-zinc-400 border border-cyan-500/20">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-zinc-200 tracking-tight">
            Predictive Scenario:
          </span>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onScenarioChange(p.temp, p.isWeekend, p.id)}
                disabled={isLoading}
                title={p.desc}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                    : 'bg-[#09090b]/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {p.icon}
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Custom Environmental Controls & Quick Risk KPI */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Sliders Box */}
        <div className="flex items-center gap-3 bg-[#09090b]/90 px-3 py-1 rounded-md border border-zinc-800 text-xs">
          {/* Temperature Slider */}
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">Temp:</span>
            <input
              type="range"
              min="10"
              max="42"
              step="1"
              value={temperature}
              onChange={(e) => onScenarioChange(parseFloat(e.target.value), isWeekend, 'custom')}
              className="w-20 accent-amber-400 bg-zinc-800 rounded-lg h-1.5 cursor-pointer"
            />
            <span className="font-mono font-bold text-amber-300 w-9">{temperature}°C</span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Weekend Toggle */}
          <button
            onClick={() => onScenarioChange(temperature, isWeekend === 1 ? 0 : 1, 'custom')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
              isWeekend === 1
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isWeekend === 1 ? 'Weekend' : 'Weekday'}
          </button>
        </div>

        {/* 24h Risk Badge */}
        {riskAssessment && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#09090b] border border-zinc-800 text-zinc-300 font-mono flex items-center gap-1.5">
              <span className="text-zinc-500">Min P:</span>
              <span
                className={
                  riskAssessment.min_pressure.status === 'ELEVATED_STRESS'
                    ? 'text-amber-400 font-bold'
                    : 'text-emerald-400 font-bold'
                }
              >
                J{riskAssessment.min_pressure.node} ({riskAssessment.min_pressure.pressure_m}m @ {riskAssessment.min_pressure.hour})
              </span>
            </span>

            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#09090b] border border-zinc-800 text-zinc-300 font-mono flex items-center gap-1.5">
              <span className="text-zinc-500">Tank 2:</span>
              <span
                className={
                  riskAssessment.tank_reserve.status === 'DEPLETION_RISK'
                    ? 'text-red-400 font-bold'
                    : 'text-zinc-400 font-bold'
                }
              >
                {riskAssessment.tank_reserve.capacity_pct}% reserve
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
