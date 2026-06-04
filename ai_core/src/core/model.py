"""
Module quản lý mô hình LSTM cho VietSign AI.
"""
import os
import logging
import numpy as np
from tensorflow.keras.models import load_model as keras_load_model
from src.core.config import MODEL_PATH, ACTIONS, SEQUENCE_LENGTH, FEATURE_SIZE, CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)

_model = None


def load_ai_model():
    global _model
    if os.path.exists(MODEL_PATH):
        try:
            _model = keras_load_model(MODEL_PATH)
            logger.info(f"✅ Đã tải mô hình thành công từ: {MODEL_PATH}")
        except Exception as e:
            logger.error(f"❌ Lỗi tải mô hình: {e}")
            _model = None
    else:
        logger.warning(f"⚠️  Chưa có file mô hình tại: {MODEL_PATH}")
        logger.warning("    → Hãy thu thập dữ liệu và huấn luyện trước!")
    return _model


def get_model():
    return _model


def predict_sequence(sequence: np.ndarray) -> dict:
    """
    Dự đoán cử chỉ từ chuỗi frames.
    Args:
        sequence: numpy array shape (30, 126)
    Returns:
        dict với 'gesture', 'confidence', 'all_scores'
    """
    global _model
    if _model is None:
        return {"error": "Chưa có mô hình. Hãy thu thập dữ liệu và huấn luyện trước!"}

    expected_shape = (SEQUENCE_LENGTH, FEATURE_SIZE)
    if sequence.shape != expected_shape:
        return {"error": f"Sai shape: cần {expected_shape}, nhận {sequence.shape}"}

    try:
        input_data = np.expand_dims(sequence, axis=0)
        predictions = _model.predict(input_data, verbose=0)[0]

        action_idx = int(np.argmax(predictions))
        confidence = float(predictions[action_idx])
        gesture = ACTIONS[action_idx] if confidence > CONFIDENCE_THRESHOLD else "Không rõ"

        return {
            "gesture": gesture,
            "confidence": confidence,
            "all_scores": {ACTIONS[i]: float(predictions[i]) for i in range(len(ACTIONS))}
        }
    except Exception as e:
        logger.error(f"❌ Lỗi dự đoán: {e}")
        return {"error": f"Lỗi dự đoán: {str(e)}"}
