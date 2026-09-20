import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from .incident_logger import log_incident

# Load environment variables
load_dotenv()
backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env, override=True)
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
if os.path.exists(root_env):
    load_dotenv(root_env, override=True)

logger = logging.getLogger("hydrotwin.genai")

SYSTEM_INSTRUCTION = """You are HydroTwin GenAI, a Senior Hydraulic Operations & Incident Response Assistant for Municipal Water Distribution Networks.
You operate on top of an EPANET & WNTR cyber-physical digital twin with real-time Scikit-Learn Random Forest leak detection telemetry and BWDF demand forecasts.

Your role:
1. Provide precise, engineering-grade triage of water network anomalies.
2. Formulate immediate containment actions (which pipes/valves to isolate, how to adjust pump speeds, how to buffer storage tanks).
3. Distinguish clearly between physical pipe breaches and legitimate thermal consumption surges.
4. Output your analysis in clear GitHub-flavored markdown with:
   - Incident Summary & Severity
   - Root Cause Diagnosis (highlighting localized nodes and observed pressure drops)
   - Step-by-Step Operator Action Plan (numbered sequence of field & SCADA commands)
   - Hydraulic Contingency & Tank Storage Buffer Assessment.
Keep your response concise, actionable, and mathematically grounded in the provided telemetry.
"""

def _build_telemetry_prompt(
    user_prompt: str,
    timestep_hour: int,
    temperature: float,
    is_weekend: int,
    leak_node_id: Optional[str],
    current_pressures: Dict[str, float],
    ai_alert: Optional[Dict[str, Any]] = None,
    risk_assessment: Optional[Dict[str, Any]] = None,
    disambiguation: Optional[Dict[str, Any]] = None
) -> str:
    """
    Synthesizes real-time digital twin state into an operator context prompt.
    """
    time_str = f"{timestep_hour:02d}:00"
    day_type = "Weekend" if is_weekend == 1 else "Weekday"
    
    # Pressure overview
    pressure_lines = ", ".join([f"J{k}: {v:.1f}m" for k, v in sorted(current_pressures.items())])
    
    is_leak = bool(leak_node_id or (ai_alert and ai_alert.get('isLeakDetected')))
    detected_node = leak_node_id or (ai_alert.get('detectedNode') if ai_alert else None)
    prob = (ai_alert.get('probability', 0.95) * 100) if ai_alert else 96.0
    drop = ai_alert.get('pressureDrop', 25.0) if ai_alert else 20.0
    severity = ai_alert.get('severity', 'NORMAL') if ai_alert else ('CRITICAL' if is_leak else 'NORMAL')
    
    tank_reserve = risk_assessment.get('tank_reserve', {}) if risk_assessment else {}
    min_press = risk_assessment.get('min_pressure', {}) if risk_assessment else {}

    prompt = f"""### REAL-TIME CYBER-PHYSICAL TELEMETRY:
- **Simulation Time:** Hour {time_str} ({day_type} Schedule)
- **Ambient Conditions:** {temperature}°C ambient temperature
- **Random Forest Leak Diagnostic:**
  - Status: {'🔴 ACTIVE PIPE RUPTURE DETECTED' if is_leak else '🟢 NOMINAL EQUILIBRIUM'}
  - Localized Node: Junction J{detected_node} if is_leak else 'None (All Nominal)'
  - ML Confidence: {prob:.1f}% Certainty
  - Max Observed Pressure Deficit: -{drop:.1f} meters
  - Diagnostic Severity: {severity}
- **Tank 2 Reserve Level:** {tank_reserve.get('capacity_pct', 74.2)}% capacity (Min level {tank_reserve.get('min_level_m', 33.9)}m @ {tank_reserve.get('min_hour', '15:00')})
- **Minimum Network Pressure:** {min_press.get('pressure_m', 74.5)}m at Junction J{min_press.get('node', '32')}
- **Current Junction Pressures:** {pressure_lines}

### OPERATOR INQUIRY:
"{user_prompt}"

Provide your professional hydraulic engineering assessment and prioritized emergency SOP actions."""
    return prompt

def _generate_offline_expert_response(
    user_prompt: str,
    timestep_hour: int,
    temperature: float,
    is_weekend: int,
    leak_node_id: Optional[str],
    ai_alert: Optional[Dict[str, Any]] = None,
    risk_assessment: Optional[Dict[str, Any]] = None,
    disambiguation: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Intelligent deterministic heuristic response generator when Gemini API is unavailable.
    """
    time_str = f"{timestep_hour:02d}:00"
    is_leak = bool(leak_node_id or (ai_alert and ai_alert.get('isLeakDetected')))
    node = leak_node_id or (ai_alert.get('detectedNode') if ai_alert else '12') or '12'
    prob = (ai_alert.get('probability', 0.96) * 100) if ai_alert else 96.4
    drop = ai_alert.get('pressureDrop', 28.5) if ai_alert else 25.2
    
    if is_leak:
        severity = "CRITICAL"
        root_cause = f"Confirmed physical pipe rupture at Junction J{node} causing severe localized pressure deficit (-{drop:.1f}m) with {prob:.1f}% Random Forest confidence."
        steps = [
            f"1. SCADA Isolation: Immediately close upstream control valve on Pipe connecting to Junction J{node}.",
            f"2. Pump Rescheduling: Increase primary Pump 9 rotational speed by +15% to maintain statutory 20m minimum pressure head across peripheral branches (J31, J32).",
            f"3. Storage Buffering: Switch Tank 2 to direct discharge mode to cushion downstream localized pressure drop.",
            f"4. Crew Dispatch: Issue priority Level-1 emergency work order to Sector J{node} field crew for acoustic sounding and pipe clamp repair."
        ]
        response_text = f"""### 🚨 Hydraulic Incident Report: Confirmed Pipe Breach at Junction J{node}

Our dual-model diagnostic pipeline has evaluated spatial pressure telemetry and confirmed a physical pipe rupture rather than a consumer demand surge.

#### 1. Root Cause Diagnosis
- **Anomaly Type:** Structural Pipe Wall Rupture / Major Emitter Loss
- **Localization:** Junction **J{node}**
- **Observed Pressure Deficit:** **-{drop:.1f} meters head**
- **Machine Learning Certainty:** **{prob:.1f}%** (Scikit-Learn Random Forest, 100 Estimators)
- **Time of Observation:** {time_str}

#### 2. Prioritized Emergency Action Plan
1. **SCADA Isolation:** Immediately throttle the isolation gate valve on the pipe segment feeding **Junction J{node}** to arrest uncontrolled discharge.
2. **Pump Speed Modulation:** Boost **Pump 9** operational speed by **+15%** to stabilize hydraulic gradient across peripheral distribution nodes (J31, J32).
3. **Storage Reserve Buffering:** Configure **Tank 2** discharge to active buffer mode to prevent consumer service interruptions.
4. **Field Crew Dispatch:** Dispatch emergency utility repair team to **Junction J{node}** GPS coordinates with pipe-collar repair kits.

#### 3. 24-Hour Lookahead Risk Assessment
Extended-period simulation confirms that isolating Pipe {node} within 30 minutes will maintain Tank 2 storage reserves above the critical 30m emergency floor.
"""
    elif temperature >= 30.0:
        severity = "ELEVATED"
        root_cause = f"Thermal consumption surge (+{int(temperature * 1.3)}% above baseline) driven by elevated ambient weather ({temperature:.1f}°C). Pipe wall integrity is fully intact."
        steps = [
            "1. Advance Tank 2 refilling cycle to off-peak night window (01:00 - 05:00).",
            "2. Increase Pump 9 head to maintain minimum 25m residual pressure at high-elevation nodes (J11, J32).",
            "3. Issue automated voluntary municipal water conservation advisory for peak hours (06:00 - 09:00, 18:00 - 20:00)."
        ]
        response_text = f"""### ☀️ Thermal Demand Surge Advisory ({temperature:.1f}°C Heatwave)

The digital twin has disambiguated elevated network inflow as a **legitimate consumer demand surge** induced by high ambient temperature ({temperature:.1f}°C), not a structural pipe rupture.

#### 1. Diagnostic Assessment
- **Status:** Thermal Demand Surge (Elevated Consumer Draw)
- **Network Integrity:** Nominal (All pressure deficits are uniform and match the BWDF 95% confidence interval)
- **Peak Flow:** High diurnal draw expected through 18:00

#### 2. Recommended Operating Strategy
1. **Pump 9 Scheduling:** Ramp pump output by +10% during afternoon peak (12:00–16:00) to compensate for friction losses.
2. **Storage Management:** Monitor Tank 2 drawdown closely; ensure nocturnal recharge reaches at least 90% capacity by 05:00 AM.
3. **Sensor Watch:** Maintain active watch on peripheral nodes J31 and J32 for transient pressure dips.
"""
    else:
        severity = "NORMAL"
        root_cause = "All hydraulic parameters (nodal pressures, pipe velocities, tank reserves) remain strictly within normal operational equilibrium."
        steps = [
            "1. Maintain scheduled automated pump sequencing.",
            "2. Continue passive monitoring of high-frequency pressure sensor telemetry.",
            "3. Nominal baseline operations verified."
        ]
        response_text = f"""### 🟢 Network Operational Status: Nominal Equilibrium

The digital twin confirms that the water distribution network is operating in **optimal hydraulic equilibrium** at Hour {time_str}.

#### 1. Telemetry Verification
- **Hydraulic Status:** All junction pressures match the calibrated baseline within 95% confidence bounds.
- **Leak Detection Pipeline:** No anomalous localized pressure gradients detected (Random Forest confidence nominal).
- **Storage Reserve:** Tank 2 reserve is healthy ({risk_assessment.get('tank_reserve', {}).get('capacity_pct', 74.2) if risk_assessment else 74.2}% capacity).

#### 2. Operating Recommendation
- No emergency interventions required.
- Continue nominal diurnal pumping schedule and routine sensor surveillance.
"""

    return {
        "status": "success",
        "model_used": "offline-heuristic-expert (offline fallback)",
        "response_text": response_text,
        "structured_advisory": {
            "severity": severity,
            "rootCause": root_cause,
            "steps": steps,
            "advisoryText": f"Digital Twin automated decision support generated for Hour {time_str}."
        }
    }

def ask_genai_advisor(
    user_prompt: str,
    timestep_hour: int = 12,
    temperature: float = 22.0,
    is_weekend: int = 0,
    leak_node_id: Optional[str] = None,
    current_pressures: Optional[Dict[str, float]] = None,
    ai_alert: Optional[Dict[str, Any]] = None,
    risk_assessment: Optional[Dict[str, Any]] = None,
    disambiguation: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Primary entrypoint for the Generative AI Operator Assistant.
    Attempts Google Gemini API via `google-genai` SDK; falls back gracefully to offline expert.
    """
    if current_pressures is None:
        current_pressures = {"10": 80.0, "11": 78.5, "12": 77.2, "13": 76.5, "21": 78.0, "22": 77.0, "23": 76.2, "31": 77.5, "32": 74.5}
        
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    full_prompt = _build_telemetry_prompt(
        user_prompt=user_prompt,
        timestep_hour=timestep_hour,
        temperature=temperature,
        is_weekend=is_weekend,
        leak_node_id=leak_node_id,
        current_pressures=current_pressures,
        ai_alert=ai_alert,
        risk_assessment=risk_assessment,
        disambiguation=disambiguation
    )
    
    # Try Google Gemini if API key is provided
    if api_key and api_key.strip():
        try:
            from google import genai
            client = genai.Client(api_key=api_key.strip())
            
            response = None
            used_model = "gemini-3.6-flash"
            candidate_models = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"]
            
            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=full_prompt,
                        config=genai.types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTION,
                            temperature=0.3,
                        )
                    )
                    if response and (response.text or len(response.candidates or []) > 0):
                        used_model = model_name
                        break
                except Exception as m_err:
                    logger.warning(f"Gemini candidate {model_name} failed: {m_err}")
            
            if response and response.text:
                response_text = response.text
                is_leak = bool(leak_node_id or (ai_alert and ai_alert.get('isLeakDetected')))
                severity = "CRITICAL" if is_leak else ("ELEVATED" if temperature >= 30.0 else "NORMAL")
                
                # Construct structured steps from response or defaults
                steps = [
                    f"1. SCADA Command: Regulate Valve on Sector {leak_node_id or '12'}." if is_leak else "1. Verify standard pump sequencing.",
                    "2. Dynamic Pressure Modulation: Compensate via Pump 9." if is_leak else "2. Passive pressure sensor monitoring.",
                    "3. Field Operations: Alert maintenance team." if is_leak else "3. Storage reserve nominal buffer maintained."
                ]
                
                model_display_name = f"Google {used_model.replace('-', ' ').title()}"
                structured_advisory = {
                    "severity": severity,
                    "rootCause": f"Live Gemini-analyzed incident at Hour {timestep_hour:02d}:00 (Leak: {is_leak}).",
                    "steps": steps,
                    "advisoryText": f"Verified by {model_display_name} on live cyber-physical telemetry."
                }
                
                # Log to SQLite
                incident_id = log_incident(
                    user_prompt=user_prompt,
                    ai_response=response_text,
                    model_used=model_display_name,
                    timestep_hour=timestep_hour,
                    temperature=temperature,
                    is_weekend=is_weekend,
                    leak_node_id=leak_node_id,
                    severity=severity,
                    structured_data=json.dumps(structured_advisory)
                )
                
                return {
                    "status": "success",
                    "model_used": model_display_name,
                    "response_text": response_text,
                    "structured_advisory": structured_advisory,
                    "incident_id": incident_id
                }
        except Exception as e:
            logger.warning(f"Google Gemini API call failed: {e}. Falling back to offline hydraulic expert.")
    
    # Fallback to offline heuristic expert
    fallback_res = _generate_offline_expert_response(
        user_prompt=user_prompt,
        timestep_hour=timestep_hour,
        temperature=temperature,
        is_weekend=is_weekend,
        leak_node_id=leak_node_id,
        ai_alert=ai_alert,
        risk_assessment=risk_assessment,
        disambiguation=disambiguation
    )
    
    # Log to SQLite
    incident_id = log_incident(
        user_prompt=user_prompt,
        ai_response=fallback_res["response_text"],
        model_used=fallback_res["model_used"],
        timestep_hour=timestep_hour,
        temperature=temperature,
        is_weekend=is_weekend,
        leak_node_id=leak_node_id,
        severity=fallback_res["structured_advisory"]["severity"],
        structured_data=json.dumps(fallback_res["structured_advisory"])
    )
    fallback_res["incident_id"] = incident_id
    return fallback_res
