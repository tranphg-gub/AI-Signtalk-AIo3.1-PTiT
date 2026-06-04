"""
API Routes cho VietSign AI Core Engine.
"""
import os
import shutil
import logging
import numpy as np
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, field_validator
from typing import List

from src.core.config import DATASET_PATH, ACTIONS, SEQUENCE_LENGTH, FEATURE_SIZE
from src.core.model import predict_sequence, get_model
from src.core.training import train_model_task, get_training_status

logger = logging.getLogger(__name__)
router = APIRouter()


# ===== REQUEST SCHEMAS =====

class PredictPayload(BaseModel):
    frames: List[List[float]]

    @field_validator('frames')
    @classmethod
    def validate_frames(cls, v):
        if len(v) != SEQUENCE_LENGTH:
            raise ValueError(f"Cần {SEQUENCE_LENGTH} frames, nhận {len(v)}")
        for i, frame in enumerate(v):
            if len(frame) != FEATURE_SIZE:
                raise ValueError(f"Frame {i} cần {FEATURE_SIZE} features, nhận {len(frame)}")
        return v


class CollectPayload(BaseModel):
    gesture_name: str
    sequence_index: int
    frames: List[List[float]]

    @field_validator('gesture_name')
    @classmethod
    def validate_name(cls, v):
        cleaned = v.strip().upper()
        if not cleaned:
            raise ValueError("Tên cử chỉ không được để trống")
        return cleaned


class DeletePayload(BaseModel):
    gesture_name: str
    sequence_index: int


class DeleteAllPayload(BaseModel):
    gesture_name: str


# ===== ENDPOINTS =====

@router.get("/health")
async def health_check():
    model = get_model()
    status = get_training_status()
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "is_training": status["is_training"],
        "last_accuracy": status.get("last_accuracy"),
        "num_actions": len(ACTIONS),
        "actions": ACTIONS
    }


@router.post("/predict")
async def predict_gesture(payload: PredictPayload):
    sequence = np.array(payload.frames)
    result = predict_sequence(sequence)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/collect")
async def collect_data(payload: CollectPayload):
    gesture_dir = os.path.join(DATASET_PATH, payload.gesture_name)
    os.makedirs(gesture_dir, exist_ok=True)
    file_path = os.path.join(gesture_dir, f"{payload.sequence_index}.npy")
    try:
        sequence = np.array(payload.frames)
        np.save(file_path, sequence)
        total = len([f for f in os.listdir(gesture_dir) if f.endswith('.npy')])
        return {
            "success": True,
            "message": f"Đã lưu mẫu #{payload.sequence_index} cho '{payload.gesture_name}'",
            "total_samples": total,
            "gesture_name": payload.gesture_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể lưu: {str(e)}")


@router.post("/delete_last")
async def delete_last(payload: DeletePayload):
    name = payload.gesture_name.strip().upper()
    path = os.path.join(DATASET_PATH, name, f"{payload.sequence_index}.npy")
    if os.path.exists(path):
        os.remove(path)
        return {"success": True, "message": f"Đã xóa mẫu #{payload.sequence_index}"}
    raise HTTPException(status_code=404, detail=f"Không tìm thấy file")


@router.post("/delete_all")
async def delete_all(payload: DeleteAllPayload):
    name = payload.gesture_name.strip().upper()
    dir_path = os.path.join(DATASET_PATH, name)
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path)
        return {"success": True, "message": f"Đã xóa toàn bộ dữ liệu của '{name}'"}
    raise HTTPException(status_code=404, detail=f"Không tìm thấy thư mục '{name}'")


@router.get("/stats")
async def get_stats():
    stats = {
        "configured_gestures": {},
        "custom_gestures": {},
        "total_samples": 0,
        "training_status": get_training_status()
    }
    for action in ACTIONS:
        path = os.path.join(DATASET_PATH, action)
        count = len([f for f in os.listdir(path) if f.endswith('.npy')]) if os.path.exists(path) else 0
        stats["configured_gestures"][action] = count
        stats["total_samples"] += count

    if os.path.exists(DATASET_PATH):
        for folder in os.listdir(DATASET_PATH):
            folder_path = os.path.join(DATASET_PATH, folder)
            if os.path.isdir(folder_path) and folder not in ACTIONS:
                count = len([f for f in os.listdir(folder_path) if f.endswith('.npy')])
                stats["custom_gestures"][folder] = count
                stats["total_samples"] += count
    return stats


@router.post("/train")
async def train_model(background_tasks: BackgroundTasks):
    status = get_training_status()
    if status["is_training"]:
        return {"success": False, "message": "Đang huấn luyện! Vui lòng đợi."}
    background_tasks.add_task(train_model_task)
    return {"success": True, "message": "✅ Đã bắt đầu huấn luyện chạy nền. Xem terminal để theo dõi."}


@router.get("/training_status")
async def training_status():
    return get_training_status()
