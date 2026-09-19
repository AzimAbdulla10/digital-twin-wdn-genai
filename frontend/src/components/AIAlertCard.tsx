import React from 'react';
import type { AIAlert, DisambiguationInfo, RiskAssessment } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  Cpu,
  ArrowUpRight,
  Zap,
  Target,
  ThermometerSun,
  Activity,
  Droplet,
} from 'lucide-react';

interface AIAlertCardProps {
  alert: AIAlert | null;
  disambiguation?: DisambiguationInfo;
  riskAssessment?: RiskAssessment;
  onAskGPT?: () => void;
}

export const AIAlertCard: React.FC<AIAlertCardProps> = ({
  alert,
  disambiguation,
  riskAssessment,
  onAskGPT,
}) => {
  const isLeak = alert?.isLeakDetected || disambiguation?.status === 'ANOMALOUS_LEAK_CONFIRMED';
  const isDemandSurge = disambiguation?.status === 'WEATHER_DEMAND_SURGE';

  return (
    <div
      className={`w-full rounded-2xl border p-5 flex flex-col shadow-xl transition-all duration-300 ${
        isLeak
          ? 'bg-gradient-to-b from-red-950/40 to-slate-950/90 border-red-500/40 shadow-red-950/30'
          : isDemandSurge
          ? 'bg-gradient-to-b from-amber-950/30 to-slate-950/90 border-amber-500/30 shadow-amber-950/20'
          : 'bg-gradient-to-b from-emerald-950/20 to-slate-950/90 border-emerald-500/30 shadow-emerald-950/20'
      }`}
    >
      {/* Header with Model Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg border ${
              isLeak
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : isDemandSurge
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">AI Diagnostic & Disambiguation</h3>
            <p className="text-[11px] text-slate-400">
              {alert?.modelType || 'Random Forest + HistGradientBoosting'} • Dual-Model Pipeline
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
            isLeak
              ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
              : isDemandSurge
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {isLeak ? 'PIPE BREACH' : isDemandSurge ? 'DEMAND SURGE' : 'NOMINAL'}
        </span>
      </div>

      {/* Main Metric Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-3">
        <div className="flex items-center gap-3">
          {isLeak ? (
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
          ) : isDemandSurge ? (
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ThermometerSun className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
          )}

          <div>
            <div className="text-xs text-slate-400">
              {isLeak ? 'Leak Certainty' : isDemandSurge ? 'Forecast Confidence' : 'System Stability'}
            </div>
            <div
              className={`text-2xl font-black font-mono tracking-tight ${
                isLeak ? 'text-red-400' : isDemandSurge ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {isLeak
                ? `${((alert?.probability || 0.96) * 100).toFixed(1)}%`
                : isDemandSurge
                ? `${((disambiguation?.confidence || 0.94) * 100).toFixed(0)}%`
                : '100%'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
            <Target className="w-3 h-3 text-cyan-400" /> Disambiguation
          </div>
          <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
            {isLeak ? (
              <span className="text-red-400">Leak Confirmed (J{alert?.detectedNode || disambiguation?.localized_node})</span>
            ) : isDemandSurge ? (
              <span className="text-amber-300">Normal Thermal Surge</span>
            ) : (
              <span className="text-emerald-300">Baseline Nominal</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Disambiguation Explanatory Callout */}
      {disambiguation && (
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs mb-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{disambiguation.title}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {disambiguation.reason}
          </p>
          <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-cyan-300 font-mono">
            <Droplet className="w-3 h-3 text-cyan-400" />
            <span>Action: {disambiguation.action_required}</span>
          </div>
        </div>
      )}

      {/* 24-Hour Lookahead Risk Summary */}
      {riskAssessment && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-slate-900/70 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block">24h Predicted Min Head</span>
            <span
              className={`font-mono font-bold text-xs ${
                riskAssessment.min_pressure.status === 'ELEVATED_STRESS'
                  ? 'text-amber-400'
                  : 'text-slate-200'
              }`}
            >
              J{riskAssessment.min_pressure.node}: {riskAssessment.min_pressure.pressure_m} m ({riskAssessment.min_pressure.hour})
            </span>
          </div>

          <div className="bg-slate-900/70 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Tank 2 Reserve Forecast</span>
            <span
              className={`font-mono font-bold text-xs ${
                riskAssessment.tank_reserve.status === 'DEPLETION_RISK'
                  ? 'text-red-400'
                  : 'text-cyan-300'
              }`}
            >
              {riskAssessment.tank_reserve.capacity_pct}% ({riskAssessment.tank_reserve.min_level_m}m)
            </span>
          </div>
        </div>
      )}

      {/* Top Affected Sensors Breakdown */}
      {isLeak && alert?.topSensors && alert.topSensors.length > 0 && (
        <div className="mb-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs">
          <span className="text-slate-400 block mb-1.5 font-medium text-[11px]">
            Sensor Anomaly Signatures:
          </span>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
            {alert.topSensors.map((s) => (
              <div
                key={s.node}
                className="bg-slate-950 px-2 py-1 rounded border border-slate-800 flex items-center justify-between"
              >
                <span className="text-slate-400">J{s.node}</span>
                <span className="text-red-400 font-semibold">-{s.drop.toFixed(1)}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GenAI CTA Trigger */}
      {isLeak && onAskGPT && (
        <button
          onClick={onAskGPT}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all group cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generate GPT Explanation & Advisory</span>
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
