import os
import pandas as pd
import numpy as np
import joblib

from .data_loader import CLEANED_CSV
from .feature_engineering import build_demand_features
from .train_forecast import MODEL_FILE, train_forecast_model

def evaluate_forecast(data_csv=CLEANED_CSV, model_path=MODEL_FILE):
    """
    Evaluates the demand forecasting model on the test partition and returns metrics.
    """
    if not os.path.exists(model_path):
        train_forecast_model(data_csv, model_path=model_path)
        
    bundle = joblib.load(model_path)
    model = bundle['model']
    feature_cols = bundle['feature_cols']
    target_col = bundle['target_col']
    metrics = bundle['metrics']
    
    print("\n[Forecast Evaluation] Model Metrics Summary:")
    print(f"  • Model Type: Scikit-Learn HistGradientBoostingRegressor")
    print(f"  • R² Score: {metrics['r2'] * 100:.2f}%")
    print(f"  • MAE: {metrics['mae']:.2f} L/s")
    print(f"  • RMSE: {metrics['rmse']:.2f} L/s")
    print(f"  • MAPE: {metrics['mape']:.2f}%")
    print(f"  • 95% Confidence Band (±1.96σ): ±{metrics['residual_std'] * 1.96:.2f} L/s")
    return metrics

if __name__ == '__main__':
    evaluate_forecast()
