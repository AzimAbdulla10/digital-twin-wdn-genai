"""
Demand Forecasting Module for Water Distribution Digital Twins.
Trained on the official Battle of Water Demand Forecasting (BWDF) benchmark dataset.
"""

from .data_loader import load_and_clean_bwdf
from .feature_engineering import build_demand_features
from .train_forecast import train_forecast_model
from .evaluate_forecast import evaluate_forecast
from .inference import generate_24h_demand_forecast, get_forecast_model

__all__ = [
    "load_and_clean_bwdf",
    "build_demand_features",
    "train_forecast_model",
    "evaluate_forecast",
    "generate_24h_demand_forecast",
    "get_forecast_model",
]
