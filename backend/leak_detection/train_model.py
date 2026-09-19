import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

from .dataset_generator import JUNCTIONS, DATASET_FILE, generate_synthetic_dataset

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_FILE = os.path.join(DATA_DIR, 'leak_model.joblib')

def train_and_save_model(dataset_csv=DATASET_FILE, model_path=MODEL_FILE):
    """
    Trains a 100-tree Random Forest Classifier on the hydraulic simulation dataset.
    Exports the trained model bundle to joblib.
    """
    if not os.path.exists(dataset_csv):
        print(f"[Train] Dataset not found at {dataset_csv}. Generating...")
        generate_synthetic_dataset(output_csv=dataset_csv)
        
    df = pd.read_csv(dataset_csv)
    
    # Feature columns: 9 junction pressures + 9 pressure differences (18 total features)
    feature_cols = [f'P_{j}' for j in JUNCTIONS] + [f'dP_{j}' for j in JUNCTIONS]
    X = df[feature_cols]
    y = df['leak_node'].astype(str)
    
    # 80/20 Stratified Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print(f"[Train] Training Random Forest on {len(X_train)} samples across {len(y.unique())} classes...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"[Train] Test Accuracy: {acc * 100:.2f}%")
    
    # Feature importances
    importances = dict(zip(feature_cols, clf.feature_importances_))
    
    model_bundle = {
        'model': clf,
        'feature_names': feature_cols,
        'classes': clf.classes_.tolist(),
        'metrics': {
            'accuracy': float(acc),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
        },
        'feature_importances': {k: float(v) for k, v in importances.items()}
    }
    
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model_bundle, model_path)
    print(f"[Train] Model saved successfully to {model_path}")
    return model_bundle

if __name__ == '__main__':
    train_and_save_model()
