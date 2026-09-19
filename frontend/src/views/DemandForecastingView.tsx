import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { DemandForecastResponse, RiskAssessment } from '../types';
import { fetchDemandForecast } from '../api';
import {
  TrendingUp,
  Sun,
  Moon,
  Loader2,
  Database,
  Award,
  Calendar,
  Layers,
  Thermometer,
  Zap,
} from 'lucide-react';

interface DemandForecastingViewProps {
  currentTimestep: number;
  temperature: number;
  isWeekend: number;
  onScenarioChange: (temp: number, weekend: number, presetId?: string) => void;
  riskAssessment?: RiskAssessment;
}

export const DemandForecastingView: React.FC<DemandForecastingViewProps> = ({
  currentTimestep,
  temperature,
  isWeekend,
  onScenarioChange,
  riskAssessment,
}) => {
  const [forecastData, setForecastData] = useState<DemandForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForecast() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchDemandForecast(temperature, isWeekend);
        setForecastData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load demand forecast.');
      } finally {
        setIsLoading(false);
      }
    }
    loadForecast();
  }, [temperature, isWeekend]);

  const chartData =
    forecastData?.forecast_24h.map((pt) => ({
      hour: pt.hour,
      demand: pt.forecast_demand_lps,
      upper: pt.upper_bound_lps,
      lower: pt.lower_bound_lps,
      temp: pt.temperature_c,
    })) || [];

  const currentPt = forecastData?.forecast_24h[currentTimestep];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Stats Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peak Demand Card */}
        <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Peak Consumption</span>
            <div className="text-xl font-bold font-mono text-amber-300">
              {forecastData?.peak_demand.value_lps ?? '--'} L/s
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Peak Hour: {forecastData?.peak_demand.hour ?? '--'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sun className="w-5 h-5" />
          </div>
        </div>

        {/* Min Night Flow Card */}
        <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Min Night Flow (MNF)</span>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {forecastData?.minimum_demand.value_lps ?? '--'} L/s
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Base Leakage Nominal
            </span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Moon className="w-5 h-5" />
          </div>
        </div>

        {/* Model Accuracy Card */}
        <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Model Accuracy (Test Set)</span>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {forecastData ? `${(forecastData.model_r2_score * 100).toFixed(1)}% R²` : '--'}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block font-mono">
              MAE: {forecastData?.model_mae_lps ?? '--'} L/s
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Dataset Provenance Card */}
        <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Benchmark Dataset</span>
            <div className="text-base font-bold text-purple-300 truncate">
              BWDF Real Inflow
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block font-mono">
              19,683 Continuous Hours
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Full-Width Forecast Chart */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-6 flex flex-col shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                24-Hour Predictive Municipal Demand Curve
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  HistGradientBoostingRegressor
                </span>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
              </h2>
              <p className="text-xs text-slate-400">
                Weather-correlated time-series regression with 95% confidence intervals
              </p>
            </div>
          </div>

          {/* Interactive Scenario Sliders */}
          <div className="flex items-center gap-3 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Temperature:</span>
              <input
                type="range"
                min="10"
                max="42"
                step="1"
                value={temperature}
                onChange={(e) => onScenarioChange(parseFloat(e.target.value), isWeekend, 'custom')}
                className="w-24 accent-amber-400 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
              <span className="font-mono font-bold text-amber-300 w-10">{temperature}°C</span>
            </div>

            <span className="text-slate-700">|</span>

            <button
              onClick={() => onScenarioChange(temperature, isWeekend === 1 ? 0 : 1, 'custom')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isWeekend === 1
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isWeekend === 1 ? 'Weekend Mode' : 'Weekday Mode'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Recharts Area */}
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGradLarge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                domain={['auto', 'auto']}
                unit=" L/s"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />

              <ReferenceLine
                x={`${currentTimestep.toString().padStart(2, '0')}:00`}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                label={{
                  value: `Timeline: ${currentTimestep}:00`,
                  fill: '#94a3b8',
                  fontSize: 11,
                  position: 'insideTopLeft',
                }}
              />

              {/* Upper Confidence Band */}
              <Area
                type="monotone"
                dataKey="upper"
                name="95% Upper Confidence Bound"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={0}
              />

              {/* Main Forecast Curve */}
              <Area
                type="monotone"
                dataKey="demand"
                name="ML Predicted Demand"
                stroke="#c084fc"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#forecastGradLarge)"
              />

              {/* Lower Confidence Band */}
              <Area
                type="monotone"
                dataKey="lower"
                name="95% Lower Confidence Bound"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom 2-Column Analytical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Distributed Junction Demand Grid (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Distributed Spatial Demands
                </h3>
                <p className="text-xs text-slate-400">
                  Hourly nodal allocation across 9 junction nodes at {currentTimestep}:00
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
              Total: {currentPt?.forecast_demand_lps ?? '--'} L/s
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {currentPt?.junction_demands &&
              Object.entries(currentPt.junction_demands).map(([nodeId, val]) => (
                <div
                  key={nodeId}
                  className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-slate-400 font-mono text-xs">Junction J{nodeId}</span>
                  <span className="font-mono font-bold text-slate-200 text-sm">{val} L/s</span>
                </div>
              ))}
          </div>
        </div>

        {/* Right: 24h Hydraulic Impact & Storage Buffer Forecast (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  24-Hour Forward Hydraulic Risk Assessment
                </h3>
                <p className="text-xs text-slate-400">
                  Predicted physical network stresses under forecasted consumption
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px]">Lowest Predicted Head</span>
                <span className="text-base font-bold font-mono text-amber-300">
                  J{riskAssessment?.min_pressure.node ?? '31'}:{' '}
                  {riskAssessment?.min_pressure.pressure_m ?? '76.5'} m
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Expected at {riskAssessment?.min_pressure.hour ?? '08:00'} (Morning Rush)
                </span>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px]">Tank 2 Reserve Drawdown</span>
                <span className="text-base font-bold font-mono text-cyan-300">
                  {riskAssessment?.tank_reserve.capacity_pct ?? '74.0'}% Minimum
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Level {riskAssessment?.tank_reserve.min_level_m ?? '33.8'}m @{' '}
                  {riskAssessment?.tank_reserve.min_hour ?? '16:00'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Total Delivered 24h Volume:</span>
            <span className="text-slate-200 font-bold">
              {riskAssessment?.total_delivered_m3 ?? 5780} m³
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
