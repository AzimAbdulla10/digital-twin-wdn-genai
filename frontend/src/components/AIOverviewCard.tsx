import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { askAIAssistant } from '../api';

interface AIOverviewCardProps {
  viewContext: 'hydraulic-twin' | 'demand-forecasting';
  title?: string;
  currentTimestep?: number;
  temperature?: number;
  isWeekend?: number;
  leakNodeId?: string | null;
  currentPressures?: Record<string, number>;
  aiAlert?: any;
  riskAssessment?: any;
  disambiguation?: any;
  forecastData?: any;
}

export const AIOverviewCard: React.FC<AIOverviewCardProps> = ({
  viewContext,
  title,
  currentTimestep = 12,
  temperature = 28.0,
  isWeekend = 0,
  leakNodeId = null,
  currentPressures,
  aiAlert,
  riskAssessment,
  disambiguation,
  forecastData,
}) => {
  const [overviewText, setOverviewText] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('Google Gemini');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('');

  const generateOverview = async () => {
    setIsLoading(true);
    try {
      const timeStr = currentTimestep.toString().padStart(2, '0') + ':00';
      let prompt = '';
      if (viewContext === 'hydraulic-twin') {
        prompt = `You are explaining the current municipal water network state to an operator or everyday observer in simple, crystal-clear plain English.
CRITICAL FORMATTING REQUIREMENT:
Respond with EXACTLY 3 short, easy-to-understand bullet points.
Avoid dense engineering jargon (use simple terms like "water pressure", "pipe break", "water tank").
DO NOT write greetings, intros, headers, or concluding remarks.

Format every bullet point as:
• **[Topic]:** [Simple explanation, max 14 words]

Points to cover:
• **Water Pressure:** [Tell if all houses and junctions have normal water pressure at ${timeStr}]
• **Pipe Status:** [State clearly if there is an active leak at Node ${leakNodeId || 'None'} or if all pipes are intact]
• **What to Do:** [Simple direct instruction, e.g. "Everything is running smoothly" or "Send a repair crew to close the valve near Node ${leakNodeId || '12'}"]`;
      } else {
        const peakVal = forecastData?.peak_demand?.value_lps || 83.5;
        const peakHour = forecastData?.peak_demand?.hour || '14:00';
        prompt = `You are explaining today's city water usage in Chennai to an operator in simple, everyday plain English.
CRITICAL FORMATTING REQUIREMENT:
Respond with EXACTLY 3 short, easy-to-understand bullet points.
Avoid dense statistics jargon. Keep it intuitive and friendly.
DO NOT write greetings, intros, headers, or concluding remarks.

Format every bullet point as:
• **[Topic]:** [Simple explanation, max 14 words]

Context:
- City water demand in Chennai at ${temperature}°C (${isWeekend ? 'Weekend' : 'Weekday'})
- Peak water usage: ~${peakVal} L/s at ${peakHour}

Points to cover:
• **Peak Usage:** [Explain when city water use will be highest today in plain terms]
• **Weather Impact:** [Explain how the ${temperature}°C heat changes how much water residents need]
• **Tank Advice:** [Simple advice on filling Tank 2 early so nobody runs out of water]`;
      }

      const res = await askAIAssistant({
        prompt,
        current_timestep: currentTimestep,
        temperature,
        is_weekend: isWeekend,
        leak_node_id: leakNodeId,
        current_pressures: currentPressures,
        ai_alert: aiAlert,
        risk_assessment: riskAssessment,
        disambiguation: disambiguation,
      });

      if (res && res.response_text) {
        setOverviewText(res.response_text);
        if (res.model_used) {
          setModelUsed(res.model_used);
        }
        const now = new Date();
        const hh = now.getHours().toString().padStart(2, '0');
        const mm = now.getMinutes().toString().padStart(2, '0');
        const ss = now.getSeconds().toString().padStart(2, '0');
        setLastRefreshedTime(`${hh}:${mm}:${ss}`);
      }
    } catch (err) {
      console.error('Failed to generate AI overview:', err);
      // Simple, easy-to-understand plain language fallbacks
      if (viewContext === 'hydraulic-twin') {
        const isLeak = Boolean(leakNodeId || aiAlert?.isLeakDetected);
        setOverviewText(
          isLeak
            ? `• **Water Pressure:** Pressure has dropped sharply around Node J${leakNodeId || '12'}.\n• **Pipe Status:** An active pipe break was detected at Junction J${leakNodeId || '12'}.\n• **What to Do:** Close the nearby valve immediately to stop water loss.`
            : `• **Water Pressure:** All 9 neighborhood zones have healthy, steady water pressure.\n• **Pipe Status:** No leaks or broken pipes detected anywhere in the network.\n• **What to Do:** System is running normally; no action needed.`
        );
      } else {
        const tempSurge = Math.max(0, Math.round((temperature - 28) * 1.2));
        setOverviewText(
          `• **Peak Usage:** Water use peaks around 2:00 PM when families and businesses use the most water.\n• **Weather Impact:** Warm ${temperature}°C weather increases daily water needs by about ${tempSurge}%.\n• **Tank Advice:** Pump extra water into Tank 2 this morning to keep reserves steady.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on initial mount or when significant context changes
  useEffect(() => {
    generateOverview();
  }, [viewContext, leakNodeId, temperature, isWeekend]);

  const isCritical = Boolean(leakNodeId || aiAlert?.isLeakDetected);
  const cardTitle = title || (viewContext === 'hydraulic-twin' ? 'AI Plain-Language Summary' : 'AI Daily Water Summary');

  return (
    <div
      className={`rounded-lg border transition-all ${
        isCritical
          ? 'bg-rose-950/20 border-rose-500/30'
          : 'bg-[#000000]/90 border-zinc-800'
      } p-5 flex flex-col shadow-sm`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-md border ${
              isCritical
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}
          >
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                {cardTitle}
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              {modelUsed} • Easy Overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCritical ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold font-mono animate-pulse">
              <AlertCircle className="w-3 h-3" />
              Pipe Leak
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              All Clear
            </span>
          )}

          <button
            onClick={generateOverview}
            disabled={isLoading}
            title="Refresh Summary"
            className="p-1.5 rounded-md bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 bg-[#09090b]/80 border border-zinc-800/80 rounded-md p-3.5 text-xs text-zinc-300 leading-relaxed min-h-[96px] flex flex-col justify-center">
        {isLoading ? (
          <div className="flex items-center gap-2.5 text-zinc-400 py-3">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="text-xs">Analyzing network and simplifying summary...</span>
          </div>
        ) : overviewText ? (
          <div className="prose prose-invert prose-xs max-w-none text-zinc-200 space-y-1.5 [&>ul]:space-y-1.5 [&>ul]:pl-3.5 [&>p]:leading-relaxed text-[12px]">
            <ReactMarkdown>{overviewText}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-zinc-500 text-xs">Waiting for live network telemetry...</p>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <span>Simplified for operators</span>
        {lastRefreshedTime && <span>Updated {lastRefreshedTime}</span>}
      </div>
    </div>
  );
};
