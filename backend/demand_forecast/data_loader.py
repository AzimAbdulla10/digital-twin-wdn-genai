import os
import pandas as pd
import numpy as np

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
BWDF_DIR = os.path.join(os.path.dirname(BASE_DIR), 'bwdf')
DATA_DIR = os.path.join(BASE_DIR, 'data')

INFLOW_FILE = os.path.join(BWDF_DIR, 'InflowData.xlsx')
WEATHER_FILE = os.path.join(BWDF_DIR, 'WeatherData.xlsx')
CLEANED_CSV = os.path.join(DATA_DIR, 'bwdf_demand_cleaned.csv')

def load_and_clean_bwdf(inflow_path=INFLOW_FILE, weather_path=WEATHER_FILE, output_csv=CLEANED_CSV):
    """
    Loads raw BWDF Excel files (InflowData & WeatherData), cleans timestamps,
    interpolates missing readings, merges into a unified hourly time-series, and exports CSV.
    """
    print(f"[BWDF Loader] Reading raw Inflow data from: {inflow_path}")
    df_inflow = pd.read_excel(inflow_path, sheet_name=0)
    
    print(f"[BWDF Loader] Reading raw Weather data from: {weather_path}")
    df_weather = pd.read_excel(weather_path, sheet_name=0)
    
    # 1. Clean Timestamp column
    time_col_inflow = df_inflow.columns[0]
    time_col_weather = df_weather.columns[0]
    
    df_inflow['timestamp'] = pd.to_datetime(df_inflow[time_col_inflow], format='%d/%m/%Y %H:%M')
    df_weather['timestamp'] = pd.to_datetime(df_weather[time_col_weather], format='%d/%m/%Y %H:%M')
    
    df_inflow = df_inflow.drop(columns=[time_col_inflow])
    df_weather = df_weather.drop(columns=[time_col_weather])
    
    # 2. Standardize column names
    dma_cols = [f'dma_{i}_lps' for i in range(1, 11)]
    inflow_rename = {df_inflow.columns[i]: dma_cols[i] for i in range(len(dma_cols))}
    df_inflow = df_inflow.rename(columns=inflow_rename)
    
    weather_rename = {
        df_weather.columns[0]: 'rainfall_mm',
        df_weather.columns[1]: 'temperature_c',
        df_weather.columns[2]: 'humidity_pct',
        df_weather.columns[3]: 'windspeed_kmh'
    }
    df_weather = df_weather.rename(columns=weather_rename)
    
    # 3. Merge Inflow and Weather on timestamp
    df = pd.merge(df_inflow, df_weather, on='timestamp', how='inner')
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    # 4. Handle missing values via time-series interpolation and forward-fill
    for col in dma_cols + ['rainfall_mm', 'temperature_c', 'humidity_pct', 'windspeed_kmh']:
        if col in df.columns:
            # Linear interpolation for continuous physical readings
            df[col] = df[col].interpolate(method='linear').ffill().bfill()
            
    # Calculate Total Network Demand (sum of all DMAs in L/s)
    df['total_demand_lps'] = df[dma_cols].sum(axis=1)
    
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"[BWDF Loader] Cleaned dataset saved to: {output_csv} ({len(df)} hourly records).")
    return df

if __name__ == '__main__':
    load_and_clean_bwdf()
