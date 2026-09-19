import os
import numpy as np
import joblib

from .dataset_generator import JUNCTIONS
from .train_model import MODEL_FILE, train_and_save_model

_CACHED_MODEL_BUNDLE = None

def get_model():
    """
    Returns the loaded model bundle from memory or loads from disk.
    """
    global _CACHED_MODEL_BUNDLE
    if _CACHED_MODEL_BUNDLE is None:
        if not os.path.exists(MODEL_FILE):
            _CACHED_MODEL_BUNDLE = train_and_save_model()
        else:
            _CACHED_MODEL_BUNDLE = joblib.load(MODEL_FILE)
    return _CACHED_MODEL_BUNDLE

def predict_leak(current_pressures_dict, baseline_pressures_dict=None):
    """
    Executes real-time ML inference given a mapping of current junction pressures.
    """
    bundle = get_model()
    clf = bundle['model']
    classes = bundle['classes']
    
    # 1. Construct 18-element feature vector [P_10..P_32, dP_10..dP_32]
    features = []
    for j in JUNCTIONS:
        val = float(current_pressures_dict.get(j, 80.0))
        features.append(val)
        
    for j in JUNCTIONS:
        curr = float(current_pressures_dict.get(j, 80.0))
        base = float(baseline_pressures_dict.get(j, curr)) if baseline_pressures_dict else curr
        features.append(float(base - curr))
        
    X_sample = np.array([features])
    
    # 2. Probability distribution over all classes
    probabilities = clf.predict_proba(X_sample)[0]
    pred_idx = np.argmax(probabilities)
    pred_class = classes[pred_idx]
    
    # 3. Overall Leak Probability (1.0 - Normal probability)
    normal_idx = classes.index('Normal') if 'Normal' in classes else -1
    prob_normal = probabilities[normal_idx] if normal_idx >= 0 else 0.0
    leak_probability = float(1.0 - prob_normal)
    
    is_leak = pred_class != 'Normal' and leak_probability > 0.40
    
    # 4. Calculate pressure drops and top affected sensor signatures
    max_drop = 0.0
    drop_breakdown = []
    for j in JUNCTIONS:
        curr = float(current_pressures_dict.get(j, 80.0))
        base = float(baseline_pressures_dict.get(j, curr)) if baseline_pressures_dict else curr
        d = float(base - curr)
        if d > max_drop:
            max_drop = d
        drop_breakdown.append({"node": j, "drop": round(d, 2)})
        
    drop_breakdown.sort(key=lambda x: x['drop'], reverse=True)
    
    # 5. Severity classification
    if not is_leak or leak_probability < 0.30:
        severity = "NORMAL"
    elif leak_probability >= 0.85 or max_drop > 25.0:
        severity = "CRITICAL"
    elif leak_probability >= 0.65 or max_drop > 12.0:
        severity = "HIGH"
    else:
        severity = "MEDIUM"
        
    return {
        "is_leak": bool(is_leak),
        "leak_probability": round(leak_probability, 4),
        "localized_node": pred_class if is_leak else "Normal",
        "severity": severity,
        "confidence": round(float(probabilities[pred_idx]), 4),
        "max_pressure_drop": round(max_drop, 2),
        "top_affected_nodes": drop_breakdown[:3],
        "model_type": "Scikit-Learn Random Forest (100 Trees)",
        "model_accuracy": bundle['metrics']['accuracy']
    }
