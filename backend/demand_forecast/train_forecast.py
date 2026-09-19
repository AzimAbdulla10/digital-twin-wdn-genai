import os
import pandas as pd
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import joblib

from .data_loader import CLEANED_CSV, load_and_clean_bwdf, DATA_DIR
from .feature_engineering import build_demand_features

MODEL_FILE = os.path.join(DATA_DIR, 'demand_forecast_model.joblib')

def train_forecast_model(data_csv=CLEANED_CSV, target_col='total_demand_lps', model_path=MODEL_FILE):
    """
    Trains a HistGradientBoostingRegressor on the BWDF time-series dataset.
    Uses strict chronological train/test splitting (80% train, 20% test).
    """
    if not os.path.exists(data_csv):
        print(f"[Train Forecast] Dataset not found at {data_csv}. Loading raw BWDF...")
        load_and_clean_bwdf(output_csv=data_csv)
        
    df = pd.read_csv(data_csv)
    df_feat, feature_cols = build_demand_features(df, target_col=target_col)
    
    # Chronological 80/20 Train/Test Split (NO random shuffling to prevent time leakage)
    split_idx = int(len(df_feat) * 0.80)
    train_df = df_feat.iloc[:split_idx]
    test_df = df_feat.iloc[split_idx:]
    
    X_train = train_df[feature_cols]
    y_train = train_df[target_col]
    X_test = test_df[feature_cols]
    y_test = test_df[target_col]
    
    print(f"[Train Forecast] Training on {len(X_train)} hours ({train_df['timestamp'].min()} to {train_df['timestamp'].max()})...")
    print(f"[Train Forecast] Testing on {len(X_test)} hours ({test_df['timestamp'].min()} to {test_df['timestamp'].max()})...")
    
    model = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_depth=8,
        min_samples_leaf=20,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mape = np.mean(np.abs((y_test - y_pred) / np.maximum(y_test, 1e-3))) * 100.0
    
    print("\n" + "=" * 50)
    print("DEMAND FORECASTING EVALUATION RESULTS (TEST SET)")
    print("=" * 50)
    print(f"R² Score:            {r2:.4f} ({r2 * 100:.2f}%)")
    print(f"Mean Absolute Error: {mae:.2f} L/s")
    print(f"Root Mean Sq Error:  {rmse:.2f} L/s")
    print(f"Mean Absolute % Err: {mape:.2f}%")
    print("=" * 50)
    
    # Calculate residual standard deviation for 95% confidence intervals (approx 1.96 * sigma)
    residuals = y_test - y_pred
    residual_std = float(np.std(residuals))
    
    model_bundle = {
        'model': model,
        'feature_cols': feature_cols,
        'target_col': target_col,
        'metrics': {
            'r2': float(r2),
            'mae': float(mae),
            'rmse': float(rmse),
            'mape': float(mape),
            'residual_std': residual_std,
            'train_size': len(X_train),
            'test_size': len(X_test),
        },
        'latest_history': df_feat.tail(200).to_dict(orient='records')
    }
    
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model_bundle, model_path)
    print(f"[Train Forecast] Model saved to {model_path}")
    return model_bundle

if __name__ == '__main__':
    train_forecast_model()
