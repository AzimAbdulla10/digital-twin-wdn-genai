import os
import random
import numpy as np
import pandas as pd
import wntr

# Default paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
INP_FILE = os.path.join(DATA_DIR, 'Net1.inp')
DATASET_FILE = os.path.join(DATA_DIR, 'leak_dataset.csv')

# 9 Junction nodes in EPANET Net1
JUNCTIONS = ['10', '11', '12', '13', '21', '22', '23', '31', '32']

def generate_synthetic_dataset(num_samples=5000, output_csv=DATASET_FILE):
    """
    Generates a 5,000-sample synthetic hydraulic dataset using WNTR simulations.
    Simulates normal operating conditions and multi-junction pipe leak scenarios.
    """
    print(f"[Dataset Generator] Generating {num_samples} hydraulic simulation samples...")
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    
    # 1. Run baseline simulation to obtain nominal pressure envelopes
    wn_base = wntr.network.WaterNetworkModel(INP_FILE)
    wn_base.options.time.duration = 24 * 3600
    wn_base.options.hydraulic.demand_model = 'PDD'
    sim_base = wntr.sim.WNTRSimulator(wn_base)
    res_base = sim_base.run_sim()
    
    # Baseline pressures across 24 hours: dict of arrays
    base_pressures = {j: res_base.node['pressure'][j].values for j in JUNCTIONS}
    
    samples = []
    normal_target = int(num_samples * 0.3)
    leak_target = num_samples - normal_target
    samples_per_junction = leak_target // len(JUNCTIONS)
    
    # --- A. Normal Operating Conditions (No Leak) ---
    for _ in range(normal_target):
        hour = random.randint(0, 24)
        demand_factor = random.uniform(0.7, 1.3)
        
        row = {}
        for j in JUNCTIONS:
            p_base = base_pressures[j][hour]
            p_sim = p_base * (1.0 - (demand_factor - 1.0) * 0.08)
            p_noisy = float(p_sim + np.random.normal(0, 0.4))
            p_noisy = max(0.0, p_noisy)
            
            row[f'P_{j}'] = p_noisy
            row[f'dP_{j}'] = float(p_base - p_noisy)
            
        row['is_leak'] = 0
        row['leak_node'] = 'Normal'
        row['leak_area'] = 0.0
        row['hour'] = hour
        samples.append(row)
        
    # --- B. Leak Scenarios across all 9 Junctions ---
    for target_j in JUNCTIONS:
        leak_sizes = [0.001, 0.003, 0.005, 0.008, 0.012]
        cached_leak_runs = []
        
        for size in leak_sizes:
            wn_l = wntr.network.WaterNetworkModel(INP_FILE)
            wn_l.options.time.duration = 24 * 3600
            wn_l.options.hydraulic.demand_model = 'PDD'
            node = wn_l.get_node(target_j)
            node.add_leak(wn_l, area=size, start_time=4 * 3600)
            sim_l = wntr.sim.WNTRSimulator(wn_l)
            res_l = sim_l.run_sim()
            cached_leak_runs.append({
                'size': size,
                'pressures': {j: res_l.node['pressure'][j].values for j in JUNCTIONS}
            })
            
        for _ in range(samples_per_junction):
            run_idx = random.randint(0, len(cached_leak_runs) - 1)
            cached_run = cached_leak_runs[run_idx]
            
            hour = random.randint(4, 24)
            size_jitter = random.uniform(0.8, 1.2)
            eff_size = cached_run['size'] * size_jitter
            
            row = {}
            for j in JUNCTIONS:
                p_base = base_pressures[j][hour]
                p_leak_cached = cached_run['pressures'][j][hour]
                drop_cached = p_base - p_leak_cached
                
                scaled_drop = drop_cached * size_jitter
                p_sim = max(0.0, p_base - scaled_drop)
                p_noisy = float(p_sim + np.random.normal(0, 0.4))
                p_noisy = max(0.0, p_noisy)
                
                row[f'P_{j}'] = p_noisy
                row[f'dP_{j}'] = float(p_base - p_noisy)
                
            row['is_leak'] = 1
            row['leak_node'] = target_j
            row['leak_area'] = float(eff_size)
            row['hour'] = hour
            samples.append(row)
            
    df = pd.DataFrame(samples).sample(frac=1.0, random_state=42).reset_index(drop=True)
    df.to_csv(output_csv, index=False)
    print(f"[Dataset Generator] Saved {len(df)} samples to {output_csv}")
    return df

if __name__ == '__main__':
    generate_synthetic_dataset()
