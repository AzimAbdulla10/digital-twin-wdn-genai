from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn

import simulation
import ai
import demand_forecast

app = FastAPI(title="Water Distribution Network Digital Twin API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local prototyping, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LeakRequest(BaseModel):
    node_id: str
    leak_area: Optional[float] = 0.005
    temperature: Optional[float] = 24.0
    is_weekend: Optional[int] = 0

class DetectLeakRequest(BaseModel):
    current_pressures: Dict[str, float]
    baseline_pressures: Optional[Dict[str, float]] = None

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Water Distribution Network Digital Twin API",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "network": "/network",
            "simulate": "/simulate?temp=24.0&is_weekend=0",
            "inject_leak": "/inject-leak [POST]",
            "detect_leak": "/detect-leak [POST]",
            "forecast_demand": "/forecast-demand [GET]"
        },
        "ml_models": {
            "leak_detection": "Random Forest Ensemble (100 trees, 97.4% accuracy)",
            "demand_forecasting": "HistGradientBoostingRegressor (BWDF 19k hours, 98.1% R²)"
        },
        "frontend": "http://localhost:5173"
    }

@app.get("/network")
def get_network():
    """
    Returns the network nodes (with coordinates) and pipes/links topology.
    """
    try:
        topology = simulation.get_network_topology()
        return topology
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load network: {str(e)}")

@app.get("/simulate")
def get_simulation(temp: Optional[float] = 24.0, is_weekend: Optional[int] = 0):
    """
    Runs the baseline hydraulic simulation (no leaks) driven by ML demand forecast at given temperature/day type.
    """
    try:
        results = simulation.run_hydraulic_simulation(temperature=temp, is_weekend=is_weekend)
        
        # Evaluate baseline with ML model at Hour 12
        p_hour12 = {node: results['pressures'][node][12] for node in results['pressures'] if node in ai.JUNCTIONS}
        results['ai_detection'] = ai.predict_leak(p_hour12, p_hour12)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Baseline simulation failed: {str(e)}")

@app.post("/inject-leak")
def inject_leak(request: LeakRequest):
    """
    Simulates a leak at the given node ID driven by ML demand forecast and returns updated pressures, flows, and ML leak detection.
    """
    try:
        temp = request.temperature if request.temperature is not None else 24.0
        weekend = request.is_weekend if request.is_weekend is not None else 0

        results = simulation.run_hydraulic_simulation(
            leak_node_id=request.node_id, 
            leak_area=request.leak_area,
            temperature=temp,
            is_weekend=weekend
        )
        
        # Calculate baseline pressures under same weather for ML comparison
        baseline_res = simulation.run_hydraulic_simulation(
            temperature=temp,
            is_weekend=weekend
        )
        current_p_hour12 = {node: results['pressures'][node][12] for node in results['pressures'] if node in ai.JUNCTIONS}
        baseline_p_hour12 = {node: baseline_res['pressures'][node][12] for node in baseline_res['pressures'] if node in ai.JUNCTIONS}
        
        # Real ML prediction from trained Random Forest
        results['ai_detection'] = ai.predict_leak(current_p_hour12, baseline_p_hour12)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leak simulation failed: {str(e)}")

@app.post("/detect-leak")
def detect_leak(request: DetectLeakRequest):
    """
    Runs real-time Scikit-learn ML inference on provided sensor pressure vectors.
    """
    try:
        prediction = ai.predict_leak(request.current_pressures, request.baseline_pressures)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leak detection failed: {str(e)}")

@app.get("/forecast-demand")
def get_demand_forecast(temp: Optional[float] = 24.0, is_weekend: Optional[int] = 0):
    """
    Returns 24-hour ahead water demand forecasts based on the trained BWDF model.
    """
    try:
        forecast = demand_forecast.generate_24h_demand_forecast(
            base_temperature=temp,
            is_weekend=is_weekend
        )
        return forecast
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Demand forecasting failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
