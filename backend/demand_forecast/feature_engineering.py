import numpy as np
import pandas as pd

def build_demand_features(df, target_col='dma_1_lps'):
    """
    Constructs rich time-series features from raw cleaned BWDF dataset.
    Includes lag features (1h, 2h, 24h, 168h), rolling statistics, cyclical time encoding, and weather signals.
    """
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    # 1. Calendar & Cyclical Temporal Encoding
    hour = df['timestamp'].dt.hour
    dow = df['timestamp'].dt.dayofweek
    
    df['hour'] = hour
    df['day_of_week'] = dow
    df['month'] = df['timestamp'].dt.month
    df['is_weekend'] = (dow >= 5).astype(int)
    
    # Sine/Cosine cyclical transformations
    df['hour_sin'] = np.sin(2 * np.pi * hour / 24.0)
    df['hour_cos'] = np.cos(2 * np.pi * hour / 24.0)
    df['dow_sin'] = np.sin(2 * np.pi * dow / 7.0)
    df['dow_cos'] = np.cos(2 * np.pi * dow / 7.0)
    
    # 2. Autoregressive Lag Features
    target = df[target_col]
    df['lag_1h'] = target.shift(1)
    df['lag_2h'] = target.shift(2)
    df['lag_24h'] = target.shift(24)       # Yesterday same hour
    df['lag_48h'] = target.shift(48)       # 2 days ago same hour
    df['lag_168h'] = target.shift(168)     # Last week same hour
    
    # 3. Rolling Window Statistics (shifted by 1 to prevent data leakage)
    shifted_target = target.shift(1)
    df['rolling_mean_6h'] = shifted_target.rolling(window=6, min_periods=1).mean()
    df['rolling_mean_24h'] = shifted_target.rolling(window=24, min_periods=1).mean()
    df['rolling_std_24h'] = shifted_target.rolling(window=24, min_periods=1).std().fillna(0)
    
    # 4. Weather Features
    if 'rainfall_mm' in df.columns:
        df['is_raining'] = (df['rainfall_mm'] > 0.1).astype(int)
    else:
        df['is_raining'] = 0
        df['rainfall_mm'] = 0.0
        
    if 'temperature_c' not in df.columns:
        df['temperature_c'] = 20.0
    if 'humidity_pct' not in df.columns:
        df['humidity_pct'] = 60.0
        
    # Drop rows where 168h lag is NaN
    df_clean = df.dropna(subset=['lag_168h']).reset_index(drop=True)
    
    feature_cols = [
        'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos',
        'is_weekend', 'month', 'temperature_c', 'rainfall_mm', 'is_raining', 'humidity_pct',
        'lag_1h', 'lag_2h', 'lag_24h', 'lag_48h', 'lag_168h',
        'rolling_mean_6h', 'rolling_mean_24h', 'rolling_std_24h'
    ]
    
    return df_clean, feature_cols
