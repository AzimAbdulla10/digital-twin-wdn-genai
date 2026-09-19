import React from 'react';
import type { AIAlert } from '../types';
import { ShieldCheck, AlertTriangle, Cpu, ArrowUpRight, Zap, Target } from 'lucide-react';

interface AIAlertCardProps {
  alert: AIAlert | null;
  onAskGPT?: () => void;
}

export const AIAlertCard: React.FC<AIAlertCardProps> = ({ alert, onAskGPT }) => {
  const isLeak = alert?.isLeakDetected;

  return (
    <div
      className={`w-full rounded-2xl border p-5 flex flex-col shadow-xl transition-all duration-300 ${
        isLeak
          ? 'bg-gradient-to-b from-red-950/40 to-slate-950/90 border-red-500/40 shadow-red-950/30'
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
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">AI Diagnostic Engine</h3>
            <p className="text-[11px] text-slate-400">
              {alert?.modelType || 'Random Forest Ensemble (100 Trees)'}{' '}
              {alert?.modelAccuracy ? `• ${(alert.modelAccuracy * 100).toFixed(1)}% Acc` : ''}
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
            alert?.severity === 'CRITICAL'
              ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
              : alert?.severity === 'HIGH'
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
              : alert?.severity === 'MEDIUM'
              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {alert?.severity || 'NORMAL'}
        </span>
      </div>

      {/* Main Metric Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-3">
        <div className="flex items-center gap-3">
          {isLeak ? (
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
          )}

          <div>
            <div className="text-xs text-slate-400">ML Leak Probability</div>
            <div
              className={`text-2xl font-black font-mono tracking-tight ${
                isLeak ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {((alert?.probability || 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
            <Target className="w-3 h-3 text-cyan-400" /> Localized Node
          </div>
          <div className="text-base font-mono font-bold text-slate-200">
            {alert?.detectedNode && alert.detectedNode !== 'Normal'
              ? `Junction ${alert.detectedNode}`
              : 'None (Stable)'}
          </div>
        </div>
      </div>

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

      {/* Message summary */}
      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {alert?.message ||
          'All sensor pressures within nominal thresholds. Continuous monitoring active across 9 distribution junctions.'}
      </p>

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
