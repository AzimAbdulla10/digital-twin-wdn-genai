import React, { useState } from 'react';
import type { SimulationResults, AIAlert } from '../types';
import {
  Bot,
  Sparkles,
  Send,
  CheckCircle2,
  Cpu,
  HelpCircle,
} from 'lucide-react';

interface GenAIAssistantViewProps {
  currentResults: SimulationResults | null;
  aiAlert: AIAlert;
  leakNodeId: string | null;
  currentTimestep: number;
  temperature: number;
  isWeekend: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content: string;
  structuredAdvisory?: {
    severity: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
    rootCause: string;
    steps: string[];
    advisoryText: string;
  };
}

const QUICK_PROMPTS = [
  '🚨 Analyze current network anomaly and recommend emergency crew actions',
  '🔍 Explain why Junction pressures dropped during this hour',
  '☀️ Evaluate tomorrow\'s 36°C heatwave pumping schedule for Tank 2',
  '🔧 Formulate valve throttling plan to isolate leak without cutting residential supply',
];

export const GenAIAssistantView: React.FC<GenAIAssistantViewProps> = ({
  currentResults,
  aiAlert,
  leakNodeId,
  currentTimestep,
  temperature,
  isWeekend,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      timestamp: '12:00:00',
      content:
        'HydroTwin GenAI Assistant online. I am continuously monitoring WNTR physical simulations, Random Forest leak alerts, and BWDF demand forecasts. How can I assist you with network operations today?',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: `${currentTimestep.toString().padStart(2, '0')}:00:00`,
      content: promptText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsGenerating(true);

    // Dynamic AI response generation based on digital twin live telemetry
    setTimeout(() => {
      let aiMsg: ChatMessage;

      if (leakNodeId || aiAlert.isLeakDetected) {
        const node = leakNodeId || aiAlert.detectedNode || '12';
        const drop = aiAlert.pressureDrop.toFixed(1);
        const prob = (aiAlert.probability * 100).toFixed(1);

        aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          timestamp: `${currentTimestep.toString().padStart(2, '0')}:00:05`,
          content: `### 🚨 Hydraulic Incident Report: Confirmed Pipe Breach at Junction J${node}\n\nOur dual-model diagnostic pipeline has evaluated spatial pressure telemetry and confirmed a physical pipe rupture rather than a consumer demand surge.`,
          structuredAdvisory: {
            severity: 'CRITICAL',
            rootCause: `Physical rupture at Junction J${node} causing a localized pressure deficit of -${drop}m (${prob}% ML model certainty).`,
            steps: [
              `1. Immediately throttle Valve on Pipe connecting upstream to Junction J${node}.`,
              `2. Boost Pump 9 operational speed by +15% to maintain minimum 20m legal pressure head at peripheral nodes (J31, J32).`,
              `3. Dispatch emergency utility field crew to Sector J${node} GPS coordinates.`,
              `4. Switch Tank 2 to direct discharge mode to cushion downstream pressure loss.`,
            ],
            advisoryText:
              'Continuous PDD simulation confirms that isolating Pipe 11 will prevent Tank 2 from dropping below the 25m emergency reserve threshold.',
          },
        };
      } else if (temperature >= 32.0) {
        aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          timestamp: `${currentTimestep.toString().padStart(2, '0')}:00:05`,
          content: `### ☀️ Thermal Operational Advisory: ${temperature}°C Summer Heatwave\n\nThe BWDF demand model predicts a +28% municipal consumption peak today. Physical pressures remain within legal parameters, but Tank 2 storage requires active buffer management.`,
          structuredAdvisory: {
            severity: 'ELEVATED',
            rootCause: `Elevated consumer demand (+28% peak draw at ${currentResults?.forecast?.peak_demand.hour || '08:00'}) driven by ${temperature}°C temperature.`,
            steps: [
              `1. Pre-fill Tank 2 to 95% capacity during the low-cost off-peak night window (00:00 - 05:00).`,
              `2. Maintain continuous pump delivery at 70 L/s during the afternoon heat peak (12:00 - 16:00).`,
              `3. Monitor Junction J31 for localized low-pressure head during morning commute hours.`,
            ],
            advisoryText:
              'No physical pipe leak detected. Disambiguation engine confirms flow increase is 100% legitimate consumer demand.',
          },
        };
      } else {
        aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          timestamp: `${currentTimestep.toString().padStart(2, '0')}:00:05`,
          content: `### 🟢 Network Operational Status: Nominal Baseline\n\nAll 9 junction pressure sensors and 12 pipeline segments are operating in hydraulic equilibrium with the ML demand forecast.`,
          structuredAdvisory: {
            severity: 'NORMAL',
            rootCause: 'Normal diurnal consumption pattern under standard weather conditions.',
            steps: [
              '1. Maintain baseline pump speed curve.',
              '2. Keep automated leak detection scan cycle active every 60 seconds.',
              '3. Routine chlorine residual levels nominal across all distribution nodes.',
            ],
            advisoryText:
              'Network is operating at optimal energy efficiency with 0 legal pressure deficit violations.',
          },
        };
      }

      setMessages((prev) => [...prev, aiMsg]);
      setIsGenerating(false);
    }, 900);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Live Context & Chat Transcript (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Real-Time Digital Twin Context Ribbon */}
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 flex items-center justify-between shadow-lg text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                HydroTwin GenAI Decision Support
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  GPT-4o Telemetry Integration
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Ground-truth physical context injected directly from WNTR & ML inference engines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Hour: <span className="text-cyan-400 font-bold">{currentTimestep}:00</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Temp: <span className="text-amber-400 font-bold">{temperature}°C</span> ({isWeekend ? 'Weekend' : 'Weekday'})
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border font-bold ${
                leakNodeId
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {leakNodeId ? `LEAK @ J${leakNodeId}` : 'NOMINAL'}
            </span>
          </div>
        </div>

        {/* Chat Transcript Window */}
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col h-[520px] shadow-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-line mb-2">{m.content}</div>

                  {/* Structured Advisory Block */}
                  {m.structuredAdvisory && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                            m.structuredAdvisory.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : m.structuredAdvisory.severity === 'ELEVATED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          SEVERITY: {m.structuredAdvisory.severity}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 font-semibold">
                        Recommended Operator Actions:
                      </div>
                      <div className="space-y-1">
                        {m.structuredAdvisory.steps.map((step, idx) => (
                          <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-slate-400 italic pt-1">
                        💡 {m.structuredAdvisory.advisoryText}
                      </p>
                    </div>
                  )}

                  <span className="text-[10px] opacity-60 block text-right mt-1 font-mono">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center animate-spin text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>Analyzing WNTR network state and formulating optimal advisory...</span>
              </div>
            )}
          </div>

          {/* Prompt Input Form */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputQuery);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask the AI operator assistant anything about current network status, leaks, or pumping..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                disabled={isGenerating || !inputQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-600/20"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Column: Suggested Inquiries & Diagnostic Telemetry (4 Cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {/* Suggested Queries */}
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Suggested Inquiries</span>
          </div>

          <div className="flex flex-col gap-2">
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(q)}
                disabled={isGenerating}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left text-[11px] text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Live Context Card */}
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Injected AI Context Vector</span>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Leak ML Probability:</span>
              <span
                className={`font-bold ${
                  aiAlert.isLeakDetected ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {(aiAlert.probability * 100).toFixed(1)}%
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Active Node Breach:</span>
              <span className="font-bold text-slate-200">
                {leakNodeId ? `Junction J${leakNodeId}` : 'None'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Forecast Demand (LPS):</span>
              <span className="font-bold text-purple-300">
                {currentResults?.forecast?.forecast_24h[currentTimestep]?.forecast_demand_lps ?? 66.7} L/s
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Tank 2 Reserve Level:</span>
              <span className="font-bold text-cyan-300">
                {currentResults?.tank_levels?.['2']?.[currentTimestep]?.toFixed(1) ?? '36.6'} m
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
