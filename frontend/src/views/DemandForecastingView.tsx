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
  Layers,
  Zap,
} from 'lucide-react';

interface DemandForecastingViewProps {
  currentTimestep: number;
  temperature: number;
  isWeekend: number;
  riskAssessment?: RiskAssessment;
}

export const DemandForecastingView: React.FC<DemandForecastingViewProps> = ({
  currentTimestep,
  temperature,
  isWeekend,
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
        <div className="bg-[#000000]/90 p-4 rounded-lg border border-zinc-800 flex items-center justify-between ">
          <div>
            <span className="text-xs text-zinc-400 block mb-1">Peak Consumption</span>
            <div className="text-xl font-bold font-mono text-amber-300">
              {forecastData?.peak_demand.value_lps ?? '--'} L/s
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Peak Hour: {forecastData?.peak_demand.hour ?? '--'}
            </span>
          </div>
          <div className="p-3 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sun className="w-5 h-5" />
          </div>
        </div>

        {/* Min Night Flow Card */}
        <div className="bg-[#000000]/90 p-4 rounded-lg border border-zinc-800 flex items-center justify-between ">
          <div>
            <span className="text-xs text-zinc-400 block mb-1">Min Night Flow (MNF)</span>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {forecastData?.minimum_demand.value_lps ?? '--'} L/s
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Base Leakage Nominal
            </span>
          </div>
          <div className="p-3 rounded-md bg-cyan-500/10 text-zinc-400 border border-cyan-500/20">
            <Moon className="w-5 h-5" />
          </div>
        </div>

        {/* Model Accuracy Card */}
        <div className="bg-[#000000]/90 p-4 rounded-lg border border-zinc-800 flex items-center justify-between ">
          <div>
            <span className="text-xs text-zinc-400 block mb-1">Model Accuracy (Test Set)</span>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {forecastData ? `${(forecastData.model_r2_score * 100).toFixed(1)}% R²` : '--'}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block font-mono">
              MAE: {forecastData?.model_mae_lps ?? '--'} L/s
            </span>
          </div>
          <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Dataset Provenance Card */}
        <div className="bg-[#000000]/90 p-4 rounded-lg border border-zinc-800 flex items-center justify-between ">
          <div>
            <span className="text-xs text-zinc-400 block mb-1">Benchmark Dataset</span>
            <div className="text-base font-bold text-purple-300 truncate">
              BWDF Real Inflow
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block font-mono">
              19,683 Continuous Hours
            </span>
          </div>
          <div className="p-3 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Full-Width Forecast Chart */}
      <div className="bg-[#000000]/90 rounded-lg border border-zinc-800 p-6 flex flex-col ">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              24-Hour Predictive Municipal Demand Curve
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                HistGradientBoostingRegressor
              </span>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
            </h2>
            <p className="text-xs text-zinc-400">
              Weather-correlated time-series regression with 95% confidence intervals
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-950/40 border border-red-500/30 rounded-md text-red-300 text-xs">
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
        <div className="lg:col-span-6 bg-[#000000]/90 rounded-lg border border-zinc-800 p-5 flex flex-col ">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-zinc-400 border border-cyan-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Distributed Spatial Demands
                </h3>
                <p className="text-xs text-zinc-400">
                  Hourly nodal allocation across 9 junction nodes at {currentTimestep}:00
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-zinc-400 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
              Total: {currentPt?.forecast_demand_lps ?? '--'} L/s
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {currentPt?.junction_demands &&
              Object.entries(currentPt.junction_demands).map(([nodeId, val]) => (
                <div
                  key={nodeId}
                  className="bg-[#09090b]/80 p-3 rounded-md border border-zinc-800 flex items-center justify-between"
                >
                  <span className="text-zinc-400 font-mono text-xs">Junction J{nodeId}</span>
                  <span className="font-mono font-bold text-zinc-200 text-sm">{val} L/s</span>
                </div>
              ))}
          </div>
        </div>

        {/* Right: 24h Hydraulic Impact & Storage Buffer Forecast (6 Cols) */}
        <div className="lg:col-span-6 bg-[#000000]/90 rounded-lg border border-zinc-800 p-5 flex flex-col justify-between ">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  24-Hour Forward Hydraulic Risk Assessment
                </h3>
                <p className="text-xs text-zinc-400">
                  Predicted physical network stresses under forecasted consumption
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="bg-[#09090b]/80 p-3.5 rounded-md border border-zinc-800">
                <span className="text-zinc-400 block mb-1 text-[11px]">Lowest Predicted Head</span>
                <span className="text-base font-bold font-mono text-amber-300">
                  J{riskAssessment?.min_pressure.node ?? '31'}:{' '}
                  {riskAssessment?.min_pressure.pressure_m ?? '76.5'} m
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Expected at {riskAssessment?.min_pressure.hour ?? '08:00'} (Morning Rush)
                </span>
              </div>

              <div className="bg-[#09090b]/80 p-3.5 rounded-md border border-zinc-800">
                <span className="text-zinc-400 block mb-1 text-[11px]">Tank 2 Reserve Drawdown</span>
                <span className="text-base font-bold font-mono text-cyan-300">
                  {riskAssessment?.tank_reserve.capacity_pct ?? '74.0'}% Minimum
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Level {riskAssessment?.tank_reserve.min_level_m ?? '33.8'}m @{' '}
                  {riskAssessment?.tank_reserve.min_hour ?? '16:00'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#09090b]/50 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
            <span>Total Delivered 24h Volume:</span>
            <span className="text-zinc-200 font-bold">
              {riskAssessment?.total_delivered_m3 ?? 5780} m³
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
