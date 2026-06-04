"""
VietSign AI Core Engine - Entry Point
Khởi động FastAPI server với CORS, logging, và tải mô hình AI.
"""
import os
import logging

# ===== TẮT CẢNH BÁO KHÔNG CẦN THIẾT =====
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# ===== CẤU HÌNH LOGGING =====
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
from src.core.model import load_ai_model
from src.core.config import DATASET_PATH, MODEL_PATH

# ===== KHỞI TẠO ỨNG DỤNG =====
app = FastAPI(
    title="VietSign AI Core Engine",
    description="REST API cho hệ thống nhận diện ngôn ngữ ký hiệu tiếng Việt sử dụng LSTM",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ===== CORS MIDDLEWARE =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== KHỞI TẠO THƯ MỤC =====
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
os.makedirs(DATASET_PATH, exist_ok=True)

# ===== LOAD MODEL KHI SERVER KHỞI ĐỘNG =====
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("🚀 VietSign AI Core Engine v2.0 đang khởi động...")
    logger.info(f"   📁 Dataset Path : {DATASET_PATH}")
    logger.info(f"   🧠 Model Path   : {MODEL_PATH}")
    logger.info("   📖 API Docs     : http://localhost:8000/docs")
    load_ai_model()
    logger.info("=" * 60)

# ===== ĐĂNG KÝ ROUTES =====
app.include_router(router, prefix="", tags=["VietSign AI"])

# ===== ENTRY POINT =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
