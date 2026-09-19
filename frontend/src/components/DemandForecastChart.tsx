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
import type { DemandForecastResponse } from '../types';
import { fetchDemandForecast } from '../api';
import { TrendingUp, AlertCircle, BarChart3, Sun, Moon, Loader2, ThermometerSun } from 'lucide-react';

interface DemandForecastChartProps {
  currentTimestep: number;
  temperature?: number;
  isWeekend?: number;
}

export const DemandForecastChart: React.FC<DemandForecastChartProps> = ({
  currentTimestep,
  temperature = 22.0,
  isWeekend = 0,
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

  const chartData = forecastData?.forecast_24h.map((pt) => ({
    hour: pt.hour,
    demand: pt.forecast_demand_lps,
    upper: pt.upper_bound_lps,
    lower: pt.lower_bound_lps,
    temp: pt.temperature_c,
  })) || [];

  const currentPt = forecastData?.forecast_24h[currentTimestep];

  return (
    <div className="w-full bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              24-Hour Water Demand Forecast
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                BWDF Benchmark (98.1% R²)
              </span>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
            </h3>
            <p className="text-xs text-slate-400">
              HistGradientBoosting Model • 19,683 Historical Hourly Observations
            </p>
          </div>
        </div>

        {/* Synced Scenario Condition Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
          <ThermometerSun className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 font-bold">{temperature}°C</span>
          <span className="text-slate-600">•</span>
          <span className={isWeekend ? 'text-purple-300' : 'text-slate-400'}>
            {isWeekend ? 'Weekend Pattern' : 'Weekday Pattern'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-2.5 mb-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      {forecastData && (
        <div className="grid grid-cols-3 gap-2.5 mb-3 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[11px] block">Peak Consumption</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {forecastData.peak_demand.value_lps} L/s
              </span>
            </div>
            <Sun className="w-4 h-4 text-amber-400/60" />
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[11px] block">Min Night Flow (MNF)</span>
              <span className="font-mono font-bold text-cyan-300 text-sm">
                {forecastData.minimum_demand.value_lps} L/s
              </span>
            </div>
            <Moon className="w-4 h-4 text-cyan-400/60" />
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[11px] block">At Hour {currentTimestep}:00</span>
              <span className="font-mono font-bold text-purple-300 text-sm">
                {currentPt ? `${currentPt.forecast_demand_lps} L/s` : '--'}
              </span>
            </div>
            <BarChart3 className="w-4 h-4 text-purple-400/60" />
          </div>
        </div>
      )}

      {/* Recharts Forecast Curve */}
      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} unit=" L/s" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#1e293b',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />

            <ReferenceLine
              x={`${currentTimestep.toString().padStart(2, '0')}:00`}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
              label={{ value: 'Active', fill: '#94a3b8', fontSize: 10, position: 'insideTopLeft' }}
            />

            {/* Upper Confidence Band */}
            <Area
              type="monotone"
              dataKey="upper"
              name="95% Upper Bound"
              stroke="#a855f7"
              strokeWidth={1}
              strokeDasharray="3 3"
              fillOpacity={0}
            />

            {/* Main Forecast Curve */}
            <Area
              type="monotone"
              dataKey="demand"
              name="ML Demand Forecast"
              stroke="#c084fc"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#forecastGrad)"
            />

            {/* Lower Confidence Band */}
            <Area
              type="monotone"
              dataKey="lower"
              name="95% Lower Bound"
              stroke="#a855f7"
              strokeWidth={1}
              strokeDasharray="3 3"
              fillOpacity={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Advisory */}
      {forecastData && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-slate-800/80 mt-1">
          <span className="flex items-center gap-1.5 text-amber-300">
            <AlertCircle className="w-3.5 h-3.5" /> Peak Hour Alert: {forecastData.peak_demand.hour} (
            {forecastData.peak_demand.value_lps} L/s)
          </span>
          <span className="text-slate-500 font-mono">
            MAE: {forecastData.model_mae_lps} L/s
          </span>
        </div>
      )}
    </div>
  );
};
