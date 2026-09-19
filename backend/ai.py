"""
Backward-compatible wrapper for the leak_detection package.
"""

from leak_detection.inference import predict_leak, get_model, JUNCTIONS
from leak_detection.train_model import train_and_save_model
from leak_detection.dataset_generator import generate_synthetic_dataset
from leak_detection.evaluate_model import evaluate_model

__all__ = [
    "predict_leak",
    "get_model",
    "JUNCTIONS",
    "train_and_save_model",
    "generate_synthetic_dataset",
    "evaluate_model",
]

if __name__ == '__main__':
    train_and_save_model()
