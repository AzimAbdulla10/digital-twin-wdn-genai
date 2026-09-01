from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

import simulation

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
            "inject_leak": "/inject-leak [POST]"
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
    Runs the baseline hydraulic simulation (no leaks) and returns pressures and flows.
    """
    try:
        results = simulation.run_hydraulic_simulation()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Baseline simulation failed: {str(e)}")

@app.post("/inject-leak")
def inject_leak(request: LeakRequest):
    """
    Simulates a leak at the given node ID and returns updated pressures and flows.
    """
    try:
        results = simulation.run_hydraulic_simulation(
            leak_node_id=request.node_id, 
            leak_area=request.leak_area
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leak simulation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
