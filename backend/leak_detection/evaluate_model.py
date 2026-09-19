import os
import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

from .dataset_generator import JUNCTIONS, DATASET_FILE
from .train_model import MODEL_FILE, train_and_save_model

def evaluate_model(dataset_csv=DATASET_FILE, model_path=MODEL_FILE, plot_output=None):
    """
    Evaluates the trained Random Forest model on the dataset and prints detailed metrics.
    """
    if not os.path.exists(model_path):
        train_and_save_model(dataset_csv, model_path)
        
    bundle = joblib.load(model_path)
    clf = bundle['model']
    feature_cols = bundle['feature_names']
    classes = bundle['classes']
    
    df = pd.read_csv(dataset_csv)
    X = df[feature_cols]
    y = df['leak_node'].astype(str)
    
    y_pred = clf.predict(X)
    acc = accuracy_score(y, y_pred)
    report = classification_report(y, y_pred, target_names=classes)
    cm = confusion_matrix(y, y_pred, labels=classes)
    
    print("\n" + "=" * 50)
    print("LEAK DETECTION & LOCALIZATION EVALUATION REPORT")
    print("=" * 50)
    print(f"Overall Dataset Accuracy: {acc * 100:.2f}%\n")
    print("Classification Metrics per Class:\n")
    print(report)
    
    print("\nConfusion Matrix (Classes:", classes, "):")
    print(cm)
    
    print("\nTop 5 Most Important Sensor Features:")
    sorted_importances = sorted(bundle['feature_importances'].items(), key=lambda x: x[1], reverse=True)
    for feat, imp in sorted_importances[:5]:
        print(f"  • {feat}: {imp * 100:.2f}%")
        
    return {
        "accuracy": acc,
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "top_features": sorted_importances[:5],
    }

if __name__ == '__main__':
    evaluate_model()
