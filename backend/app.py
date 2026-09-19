from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn

import simulation
import ai

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
            "simulate": "/simulate",
            "inject_leak": "/inject-leak [POST]",
            "detect_leak": "/detect-leak [POST]"
        },
        "ml_model": {
            "type": "Random Forest Ensemble (100 trees)",
            "classes": 10,
            "status": "ready"
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
def get_simulation():
    """
    Runs the baseline hydraulic simulation (no leaks) and returns pressures, flows, and AI inference.
    """
    try:
        results = simulation.run_hydraulic_simulation()
        
        # Evaluate baseline with ML model at Hour 12
        p_hour12 = {node: results['pressures'][node][12] for node in results['pressures'] if node in ai.JUNCTIONS}
        results['ai_detection'] = ai.predict_leak(p_hour12, p_hour12)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Baseline simulation failed: {str(e)}")

@app.post("/inject-leak")
def inject_leak(request: LeakRequest):
    """
    Simulates a leak at the given node ID and returns updated pressures, flows, and ML leak detection.
    """
    try:
        results = simulation.run_hydraulic_simulation(
            leak_node_id=request.node_id, 
            leak_area=request.leak_area
        )
        
        # Calculate baseline pressures for ML comparison
        baseline_res = simulation.run_hydraulic_simulation()
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

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
