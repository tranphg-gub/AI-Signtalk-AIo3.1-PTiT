"""
Cấu hình trung tâm cho VietSign AI Core Engine.
"""
import os

# ===== ĐƯỜNG DẪN CƠ SỞ =====
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MODEL_PATH = os.path.join(BASE_DIR, 'model', 'signtalk_lstm.keras')
DATASET_PATH = os.path.join(BASE_DIR, 'dataset')

# ===== THAM SỐ MÔ HÌNH =====
SEQUENCE_LENGTH = 30        # Số frame mỗi chuỗi
FEATURE_SIZE = 126          # 21 landmarks * 3 (x,y,z) * 2 tay
CONFIDENCE_THRESHOLD = 0.75 # Ngưỡng tin cậy để chấp nhận kết quả
TARGET_SAMPLES = 100        # Số mẫu tối đa mỗi từ vựng

# ===== DANH SÁCH TỪ VỰNG =====
# QUAN TRỌNG: Thứ tự KHÔNG được thay đổi sau khi đã train!
ACTIONS = [
    'XIN CHÀO',
    'TẠM BIỆT',
    'CẢM ƠN',
    'GIÚP ĐỠ',
    'TÔI',
    'BẠN',
    'CÓ',
    'KHÔNG',
    'KHỎE',
    'MỆT',
    'TRẠNG THÁI NGHỈ'
]

# ===== THAM SỐ HUẤN LUYỆN =====
TRAINING_EPOCHS = 50
TRAINING_BATCH_SIZE = 16
VALIDATION_SPLIT = 0.2
