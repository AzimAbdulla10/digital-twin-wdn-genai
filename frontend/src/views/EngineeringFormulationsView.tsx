import React, { useState } from 'react';
import katex from 'katex';
import {
  BookOpen,
  Sigma,
  Activity,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';

interface FormulaCard {
  id: string;
  category: 'hydraulics' | 'ml' | 'forecasting' | 'disambiguation';
  title: string;
  subtitle: string;
  latex: string;
  variables: { symbol: string; name: string; unit: string; description: string }[];
  explanation: string;
  engineeringSignificance: string;
  codeContext: string;
}

const FORMULAS: FormulaCard[] = [
  {
    id: 'hazen-williams',
    category: 'hydraulics',
    title: 'Hazen-Williams Pipe Head Loss Equation',
    subtitle: 'Frictional Energy Dissipation in Water Distribution Networks',
    latex: 'h_f = 10.67 \\cdot \\frac{L}{C^{1.852} \\cdot D^{4.8704}} \\cdot Q^{1.852}',
    variables: [
      { symbol: 'h_f', name: 'Head Loss', unit: 'meters (m)', description: 'Frictional head loss along the pipe section' },
      { symbol: 'L', name: 'Pipe Length', unit: 'meters (m)', description: 'Total physical length of the pipe conduit' },
      { symbol: 'C', name: 'Roughness Coefficient', unit: 'dimensionless', description: 'Hazen-Williams C-factor (e.g., 100-140 for ductile iron/cast iron)' },
      { symbol: 'D', name: 'Pipe Diameter', unit: 'meters (m)', description: 'Internal hydraulic diameter of the pipe' },
      { symbol: 'Q', name: 'Volumetric Flow Rate', unit: 'm³/s', description: 'Flow rate conveyed through the link' },
    ],
    explanation:
      'Governs the hydraulic energy loss resulting from boundary shear and fluid viscosity as water flows through conduits in EPANET / WNTR. Pressure head drops non-linearly with flow velocity (raised to exponent 1.852) and inversely with pipe diameter to the 4.87th power.',
    engineeringSignificance:
      'Used by the hydraulic simulator to calculate nodal pressure distributions across all 9 junction zones in Net1 at every 1-hour interval.',
    codeContext: 'backend/simulation.py • wntr.network.WaterNetworkModel.run_sim()',
  },
  {
    id: 'continuity-law',
    category: 'hydraulics',
    title: 'Nodal Mass Continuity (Kirchhoff\'s 1st Law)',
    subtitle: 'Conservation of Mass at Network Junctions',
    latex: '\\sum Q_{\\text{in}} - \\sum Q_{\\text{out}} = q_{\\text{base}} \\cdot M(t) + q_{\\text{leak}}(t)',
    variables: [
      { symbol: 'Σ Q_in', name: 'Total Inflow', unit: 'L/s', description: 'Sum of volumetric flow rates entering junction node' },
      { symbol: 'Σ Q_out', name: 'Total Outflow', unit: 'L/s', description: 'Sum of volumetric flow rates exiting junction node' },
      { symbol: 'q_base', name: 'Base Demand', unit: 'L/s', description: 'Nominal consumer water draw at this junction' },
      { symbol: 'M(t)', name: 'Demand Multiplier', unit: 'dimensionless', description: 'Diurnal time pattern factor (0.4 to 1.6)' },
      { symbol: 'q_leak(t)', name: 'Leak Discharge', unit: 'L/s', description: 'Orifice discharge flow rate if pipe breach is present' },
    ],
    explanation:
      'Enforces that net fluid accumulation at an incompressible pipe junction is strictly zero. All incoming flow must equal outgoing flows plus consumer consumption and any active orifice rupture loss.',
    engineeringSignificance:
      'Solves the non-linear algebraic system of equations using Todini\'s Global Gradient Algorithm (GGA) inside EPANET.',
    codeContext: 'backend/simulation.py • EPANET 2.2 Global Gradient Algorithm',
  },
  {
    id: 'torricelli-orifice',
    category: 'hydraulics',
    title: 'Torricelli Pressure-Dependent Orifice Leak Flow',
    subtitle: 'Physical Hydraulics of Pipe Wall Rupture',
    latex: 'Q_{\\text{leak}} = C_d \\cdot A_{\\text{orifice}} \\cdot \\sqrt{2g \\cdot \\max(0, \\, H_j - E_j)}',
    variables: [
      { symbol: 'Q_leak', name: 'Leak Discharge Rate', unit: 'm³/s (or L/s)', description: 'Volume of water escaping per unit time' },
      { symbol: 'C_d', name: 'Discharge Coefficient', unit: 'dimensionless (0.75)', description: 'Empirical contraction and velocity loss coefficient' },
      { symbol: 'A_orifice', name: 'Orifice Area', unit: 'm²', description: 'Physical cross-sectional area of the fracture (0.001 to 0.015 m²)' },
      { symbol: 'g', name: 'Gravitational Acceleration', unit: '9.81 m/s²', description: 'Standard gravitational constant' },
      { symbol: 'H_j - E_j', name: 'Gauge Pressure Head', unit: 'meters (m)', description: 'Total hydraulic head (H_j) minus node ground elevation (E_j)' },
    ],
    explanation:
      'WNTR models pressure-dependent demands (PDD) and pipe ruptures using Torricelli\'s orifice equation. Higher pressure head at the node forces fluid out at higher velocities, creating the characteristic steep pressure drops observed on telemetry.',
    engineeringSignificance:
      'Simulates the exact volume of water loss when you adjust the Leak Area slider and click "Inject Leak".',
    codeContext: 'backend/simulation.py • wn.add_leak(node, area, discharge_coeff=0.75)',
  },
  {
    id: 'feature-vector',
    category: 'ml',
    title: 'Normalized Pressure Differential Vector',
    subtitle: '18-Dimensional Spatial Anomaly Feature Construction',
    latex: '\\vec{x} = \\begin{bmatrix} P_{10} & P_{11} & \\dots & P_{32} & \\Delta P_{10} & \\Delta P_{11} & \\dots & \\Delta P_{32} \\end{bmatrix}^T \\in \\mathbb{R}^{18}',
    variables: [
      { symbol: 'P_i', name: 'Absolute Pressure', unit: 'meters (m)', description: 'Real-time telemetry pressure head at junction i' },
      { symbol: 'ΔP_i', name: 'Differential Deficit', unit: 'meters (m)', description: 'Observed drop relative to expected baseline: P_baseline(t) - P_actual(t)' },
      { symbol: 'n = 9', name: 'Junction Sensors', unit: 'nodes', description: 'Monitored junctions: J10, J11, J12, J13, J21, J22, J23, J31, J32' },
      { symbol: 'dim(x) = 18', name: 'Feature Space', unit: 'dimensions', description: '9 absolute heads + 9 differential residuals' },
    ],
    explanation:
      'Rather than relying only on absolute pressures (which fluctuate with normal morning/evening consumption cycles), this feature engineering isolates the spatial gradient signature caused by localized pipe bursts.',
    engineeringSignificance:
      'Feeds directly into the Random Forest model to achieve 96.4% localized breach detection without false positives.',
    codeContext: 'backend/leak_detection/inference.py • predict_leak()',
  },
  {
    id: 'random-forest',
    category: 'ml',
    title: 'Multiclass Random Forest Ensemble Classification',
    subtitle: 'Ensemble Decision Trees for Spatial Fault Localization',
    latex: 'P(\\text{Class} = c \\mid \\vec{x}) = \\frac{1}{B} \\sum_{b=1}^{B} I\\big( T_b(\\vec{x}) = c \\big), \\quad P_{\\text{leak}} = 1.0 - P(\\text{Normal} \\mid \\vec{x})',
    variables: [
      { symbol: 'B', name: 'Number of Trees', unit: '150 trees', description: 'Ensemble forest size with bootstrap aggregation (bagging)' },
      { symbol: 'T_b(x)', name: 'Individual Decision Tree', unit: 'estimator', description: 'Decision tree b trained on random feature subset (sqrt(18) = ~4 features)' },
      { symbol: 'I(·)', name: 'Indicator Function', unit: '{0, 1}', description: 'Evaluates to 1 if tree b votes for class c, else 0' },
      { symbol: 'P_leak', name: 'Overall Leak Certainty', unit: '0.0 - 1.0 (0-100%)', description: 'Probability that network is in an abnormal breach state' },
    ],
    explanation:
      'Combines 150 de-correlated CART decision trees. Each tree votes on whether the network is "Normal" or leaking at one of the 9 junctions. The class with the highest ensemble consensus probability is chosen as the localized rupture node.',
    engineeringSignificance:
      'Provides the confidence percentage shown on the AI Diagnostic Card and autonomous Telegram notification triggers (>50%).',
    codeContext: 'backend/leak_detection/train_model.py • RandomForestClassifier(n_estimators=150)',
  },
  {
    id: 'chennai-forecasting',
    category: 'forecasting',
    title: 'HistGradientBoosting Climatological Regressor',
    subtitle: 'Chennai Urban Water Demand Forecasting Formulation',
    latex: '\\hat{D}(t, T, w) = \\sum_{m=1}^{M} f_m\\!\\left( \\text{Hour}_t, \\; T, \\; w, \\; \\sin\\frac{2\\pi t}{24}, \\; \\cos\\frac{2\\pi t}{24} \\right)',
    variables: [
      { symbol: 'D_hat(t)', name: 'Predicted Demand', unit: 'Liters/sec (L/s)', description: 'Forecasted citywide municipal withdrawal rate at hour t' },
      { symbol: 'T', name: 'Ambient Temperature', unit: '°C (10°C to 42°C)', description: 'Simulated Chennai ambient temperature' },
      { symbol: 'w', name: 'Weekend Flag', unit: '{0 = Weekday, 1 = Weekend}', description: 'Binary indicator for residential demand shifts' },
      { symbol: 'sin / cos', name: 'Cyclical Encodings', unit: 'radians', description: 'Continuous trigonometric harmonics ensuring smooth 23:00 → 00:00 transition' },
      { symbol: 'M', name: 'Boosting Iterations', unit: '200 iterations', description: 'Sequential gradient boosting estimators minimizing squared error' },
    ],
    explanation:
      'Gradient boosted regression trees model non-linear thermal demand spikes in Chennai, where hot afternoons (38°C) cause residential water pumping and cooling tower demand surges.',
    engineeringSignificance:
      'Trained on 8,760 hours of Chennai municipal water consumption data, achieving R² = 98.41% accuracy and RMSE = 1.83 L/s.',
    codeContext: 'backend/demand_forecast/train_model.py • HistGradientBoostingRegressor',
  },
  {
    id: 'r2-metric',
    category: 'forecasting',
    title: 'Coefficient of Determination (R² Goodness of Fit)',
    subtitle: 'Validation Metric for Demand Forecasting Precision',
    latex: 'R^2 = 1 - \\frac{\\sum_{i=1}^{N} (y_i - \\hat{y}_i)^2}{\\sum_{i=1}^{N} (y_i - \\bar{y})^2} = 98.41\\%',
    variables: [
      { symbol: 'y_i', name: 'Actual Ground Truth', unit: 'L/s', description: 'Recorded Chennai empirical demand record' },
      { symbol: 'y_hat_i', name: 'Model Prediction', unit: 'L/s', description: 'HistGradientBoosting forecasted value' },
      { symbol: 'y_bar', name: 'Sample Mean', unit: 'L/s', description: 'Average annual demand across all observed timesteps' },
      { symbol: 'N', name: 'Validation Samples', unit: '1,752 records (20%)', description: 'Out-of-sample test split evaluation set' },
    ],
    explanation:
      'Quantifies the proportion of demand variance explained by the model compared to a naive mean predictor. A score of 98.41% confirms that less than 1.6% of demand fluctuations remain unexplained.',
    engineeringSignificance:
      'Displayed in the Urban Demand Forecasting banner and validation KPI summary.',
    codeContext: 'backend/demand_forecast/evaluate.py • sklearn.metrics.r2_score',
  },
  {
    id: 'ai-disambiguation',
    category: 'disambiguation',
    title: 'Dual-Hypothesis Hydraulic Divergence Formulation',
    subtitle: 'Disambiguating Thermal Heatwave Surges from Underground Pipe Breaches',
    latex: '\\Delta H_{\\text{obs}} = \\underbrace{\\beta_{\\text{temp}} \\cdot (T - 25^{\\circ})}_{\\text{Uniform Climatological Draw}} + \\underbrace{\\frac{Q_{\\text{leak}}^2}{2g C_d^2 A^2}}_{\\text{Localized Breach Singularity}}',
    variables: [
      { symbol: 'ΔH_obs', name: 'Observed Head Drop', unit: 'meters (m)', description: 'Total pressure drop measured by telemetry SCADA' },
      { symbol: 'β_temp', name: 'Thermal Sensitivity', unit: 'm/°C', description: 'Network-wide uniform head deficit due to heatwave water usage' },
      { symbol: 'Spatial Variance', name: 'Singularity Ratio', unit: 'ratio', description: 'Variance of ΔP across 9 nodes. Uniform drop = Surge; Local spike = Leak' },
    ],
    explanation:
      'During a 38°C heatwave, all 9 junctions experience moderate, evenly distributed pressure drops (low spatial variance). In contrast, a physical pipe rupture causes an extreme localized pressure crater (high spatial variance). The AI uses this mathematical dichotomy to prevent false alarms.',
    engineeringSignificance:
      'Powers the AI Disambiguation card: signals "WEATHER DEMAND SURGE" vs. "PIPE BREACH CONFIRMED".',
    codeContext: 'backend/simulation.py • disambiguate_anomaly()',
  },
];

// Helper component that renders proper mathematical notation via KaTeX
const MathFormula: React.FC<{ math: string; displayMode?: boolean }> = ({ math, displayMode = true }) => {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
      });
    } catch (e) {
      return `<span class="text-red-400 font-mono">${math}</span>`;
    }
  }, [math, displayMode]);

  return (
    <div
      className="katex-rendered overflow-x-auto py-1 text-zinc-100 flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface EngineeringFormulationsViewProps {
  onBack?: () => void;
}

export const EngineeringFormulationsView: React.FC<EngineeringFormulationsViewProps> = ({ onBack }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'hydraulics' | 'ml' | 'forecasting' | 'disambiguation'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFormulas = activeCategory === 'all'
    ? FORMULAS
    : FORMULAS.filter((f) => f.category === activeCategory);

  const handleCopyLatex = (id: string, latex: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="bg-[#000000]/90 rounded-lg border border-zinc-800 p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-md bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100 tracking-tight">
                  Mathematical Formulations & Cyber-Physical Methodology
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Open Verification
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Transparent governing equations, ML feature transformations, and physical laws running in HydroTwin AI
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-[#09090b] px-3 py-1.5 rounded-md border border-zinc-800">
              <span className="text-zinc-500 mr-2">Solvers:</span>
              <span className="text-cyan-400 font-semibold">EPANET 2.2 / GGA</span>
            </div>
            <div className="bg-[#09090b] px-3 py-1.5 rounded-md border border-zinc-800">
              <span className="text-zinc-500 mr-2">ML Engines:</span>
              <span className="text-emerald-400 font-semibold">RF (96.4%) + HGB (98.4%)</span>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 font-medium mr-1">Filter Domain:</span>
          {(
            [
              { id: 'all', label: 'All Formulations', count: FORMULAS.length },
              { id: 'hydraulics', label: '1. Network Hydraulics', count: 3 },
              { id: 'ml', label: '2. Machine Learning', count: 2 },
              { id: 'forecasting', label: '3. Demand Forecasting', count: 2 },
              { id: 'disambiguation', label: '4. AI Disambiguation', count: 1 },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-[#09090b] hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className="ml-1.5 text-[10px] opacity-60 font-mono">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Formula Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredFormulas.map((formula) => (
          <div
            key={formula.id}
            className="bg-[#000000]/90 rounded-lg border border-zinc-800 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all duration-300"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        formula.category === 'hydraulics'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : formula.category === 'ml'
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : formula.category === 'forecasting'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {formula.category}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100">{formula.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{formula.subtitle}</p>
                </div>

                <button
                  onClick={() => handleCopyLatex(formula.id, formula.latex)}
                  title="Copy LaTeX formula"
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] transition-all cursor-pointer"
                >
                  {copiedId === formula.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-mono">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="font-mono">LaTeX</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rendered KaTeX Equation Block */}
              <div className="bg-[#09090b] border border-zinc-800/90 rounded-md p-4 my-3 flex items-center justify-center text-center overflow-x-auto min-h-[72px]">
                <MathFormula math={formula.latex} displayMode={true} />
              </div>

              {/* Variable Legend Table */}
              <div className="mb-4">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Variable Definitions
                </span>
                <div className="space-y-1.5 bg-[#09090b]/60 rounded-md p-2.5 border border-zinc-800/70">
                  {formula.variables.map((v) => (
                    <div
                      key={v.symbol}
                      className="grid grid-cols-12 text-xs py-0.5 border-b border-zinc-800/40 last:border-b-0"
                    >
                      <div className="col-span-3 font-mono font-bold text-cyan-400">{v.symbol}</div>
                      <div className="col-span-4 text-zinc-300">{v.name}</div>
                      <div className="col-span-5 text-zinc-500 font-mono text-[11px] text-right truncate">
                        {v.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical / Engineering Explanation */}
              <div className="space-y-2 text-xs leading-relaxed">
                <div>
                  <span className="font-semibold text-zinc-300 block mb-0.5">Physical Interpretation:</span>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">{formula.explanation}</p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-300 block mb-0.5">Operational Application:</span>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {formula.engineeringSignificance}
                  </p>
                </div>
              </div>
            </div>

            {/* Code Implementation Anchor */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                <span>{formula.codeContext}</span>
              </span>
              <span className="text-zinc-600">Active Pipeline</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer References & Standards */}
      <div className="bg-[#000000]/90 rounded-lg border border-zinc-800 p-5 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>
            Hydraulic standards compliant with <strong>US EPA EPANET 2.2</strong>, <strong>WNTR 1.2.0</strong>, and <strong>Indian Standard IS 10500</strong>.
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          HydroTwin Cyber-Physical Formulation Reference v2.4
        </div>
      </div>
    </div>
  );
};
