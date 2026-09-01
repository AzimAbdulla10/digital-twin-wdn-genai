import os
import wntr
import pandas as pd
import numpy as np

# Path to the EPANET network file
INP_FILE = os.path.join(os.path.dirname(__file__), 'data', 'Net1.inp')

def get_network_topology():
    """
    Loads the EPANET network and returns nodes and links with coordinates.
    """
    wn = wntr.network.WaterNetworkModel(INP_FILE)
    
    nodes = []
    for name, node in wn.nodes():
        node_type = node.node_type
        # Extract coordinates
        x, y = node.coordinates
        
        # Get elevation and base demand if applicable
        elevation = getattr(node, 'elevation', 0.0)
        demand = 0.0
        
        if node_type == 'Junction':
            # Base demand in EPANET/WNTR is typically in m^3/s (or GPM depending on units)
            # WNTR internally converts flow units to m^3/s
            # Let's convert it to L/s for user readability: 1 m^3/s = 1000 L/s
            if len(node.demand_timeseries_list) > 0:
                demand = node.demand_timeseries_list[0].base_value * 1000.0
        
        nodes.append({
            "id": name,
            "type": node_type.lower(),
            "elevation": float(elevation),
            "demand": float(demand),
            "x": float(x) if not np.isnan(x) else 0.0,
            "y": float(y) if not np.isnan(y) else 0.0
        })
        
    links = []
    for name, link in wn.links():
        link_type = link.link_type
        start_node = link.start_node_name
        end_node = link.end_node_name
        
        length = getattr(link, 'length', 0.0)
        diameter = getattr(link, 'diameter', 0.0)
        
        # Convert diameter from meters to mm for display (if standard SI unit)
        # EPANET Net1 uses US Units (GPM, feet, inches). WNTR automatically converts units.
        # Length is converted to meters, diameter to meters.
        # Let's convert diameter to mm (diameter * 1000)
        diameter_mm = float(diameter) * 1000.0 if diameter else 0.0
        
        links.append({
            "id": name,
            "type": link_type.lower(),
            "source": start_node,
            "target": end_node,
            "length": float(length),
            "diameter": float(diameter_mm)
        })
        
    return {"nodes": nodes, "links": links}

def run_hydraulic_simulation(leak_node_id=None, leak_area=0.005):
    """
    Runs a 24-hour simulation using WNTR's PDD simulator.
    If leak_node_id is provided, injects a leak at that junction node.
    """
    wn = wntr.network.WaterNetworkModel(INP_FILE)
    
    # Configure simulation time step to hourly (3600 seconds) for 24 hours
    wn.options.time.duration = 24 * 3600
    wn.options.time.report_timestep = 3600
    wn.options.time.hydraulic_timestep = 3600
    
    # Inject leak if specified
    if leak_node_id and leak_node_id in wn.junction_name_list:
        node = wn.get_node(leak_node_id)
        # WNTR simulates leaks by adding an active leak with an area (m^2)
        # and a discharge coefficient (default 0.75)
        # We start the leak at hour 4 (14400 seconds) to show a distinct drop in graphs
        node.add_leak(wn, area=leak_area, start_time=4 * 3600)
        
    # Use Pressure Dependent Demand (PDD) simulation
    wn.options.hydraulic.demand_model = 'PDD'
    
    sim = wntr.sim.WNTRSimulator(wn)
    results = sim.run_sim()
    
    # Extract times (in hours)
    times = [int(t // 3600) for t in results.node['pressure'].index]
    
    # Format node pressures: { node_id: [p0, p1, ..., p23] }
    # Convert pressure head from meters to psi or keep in meters. Let's keep in meters.
    pressures = {}
    for node_name in results.node['pressure'].columns:
        pressures[node_name] = results.node['pressure'][node_name].fillna(0.0).tolist()
        
    # Format link flows: { link_id: [f0, f1, ..., f23] }
    # WNTR flow is in m^3/s. Let's convert it to L/s (multiply by 1000) for UI display.
    flows = {}
    for link_name in results.link['flowrate'].columns:
        flows[link_name] = (results.link['flowrate'][link_name].fillna(0.0) * 1000.0).tolist()
        
    # Check if leak demand is present
    leak_demands = {}
    if 'leak_demand' in results.node:
        for node_name in results.node['leak_demand'].columns:
            leak_val = (results.node['leak_demand'][node_name].fillna(0.0) * 1000.0).tolist()
            if sum(leak_val) > 0:
                leak_demands[node_name] = leak_val
                
    return {
        "times": times,
        "pressures": pressures,
        "flows": flows,
        "leak_demands": leak_demands
    }
