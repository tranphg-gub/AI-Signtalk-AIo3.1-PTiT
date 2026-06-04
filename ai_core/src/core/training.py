"""
Module huấn luyện mô hình LSTM cho VietSign AI.
Pipeline: đọc dataset → chia train/val → build model → train → lưu.
"""
import os
import logging
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.optimizers import Adam

from src.core.config import (
    MODEL_PATH, DATASET_PATH, ACTIONS,
    SEQUENCE_LENGTH, FEATURE_SIZE,
    TRAINING_EPOCHS, TRAINING_BATCH_SIZE, VALIDATION_SPLIT
)
import src.core.model as model_module

logger = logging.getLogger(__name__)

_training_status = {"is_training": False, "progress": "", "last_accuracy": None}


def get_training_status() -> dict:
    return _training_status.copy()


def _load_dataset():
    X, y = [], []
    for idx, action in enumerate(ACTIONS):
        action_path = os.path.join(DATASET_PATH, action)
        if not os.path.exists(action_path):
            logger.warning(f"  ⚠️  Bỏ qua '{action}' - không tìm thấy thư mục")
            continue
        count = 0
        for file_name in sorted(os.listdir(action_path)):
            if not file_name.endswith(".npy"):
                continue
            file_path = os.path.join(action_path, file_name)
            try:
                sequence = np.load(file_path)
                if sequence.shape == (SEQUENCE_LENGTH, FEATURE_SIZE):
                    X.append(sequence)
                    y.append(idx)
                    count += 1
                else:
                    logger.warning(f"  ⚠️  Shape lỗi {sequence.shape}: {file_path}")
            except Exception as e:
                logger.warning(f"  ⚠️  Không đọc được {file_path}: {e}")
        logger.info(f"  📂 '{action}': {count} mẫu")

    if len(X) == 0:
        raise ValueError("Không tìm thấy dữ liệu! Hãy thu thập dữ liệu trước.")

    logger.info(f"  📊 Tổng cộng: {len(X)} mẫu từ {len(set(y))} cử chỉ")
    return np.array(X), to_categorical(y, num_classes=len(ACTIONS))


def _build_model():
    model = Sequential([
        LSTM(64, return_sequences=True, activation='tanh',
             recurrent_activation='sigmoid',
             input_shape=(SEQUENCE_LENGTH, FEATURE_SIZE)),
        BatchNormalization(),
        Dropout(0.2),

        LSTM(128, return_sequences=True, activation='tanh',
             recurrent_activation='sigmoid'),
        BatchNormalization(),
        Dropout(0.2),

        LSTM(64, return_sequences=False, activation='tanh',
             recurrent_activation='sigmoid'),
        BatchNormalization(),
        Dropout(0.3),

        Dense(64, activation='relu'),
        Dropout(0.3),
        Dense(32, activation='relu'),
        Dense(len(ACTIONS), activation='softmax')
    ])
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['categorical_accuracy']
    )
    return model


def train_model_task():
    global _training_status
    _training_status = {"is_training": True, "progress": "Bắt đầu...", "last_accuracy": None}

    logger.info("\n" + "=" * 60)
    logger.info("🧠 BẮT ĐẦU HUẤN LUYỆN MÔ HÌNH VIETSIGN AI LSTM")
    logger.info("=" * 60)

    try:
        logger.info("\n📥 Bước 1/4: Đọc dataset...")
        _training_status["progress"] = "Đang đọc dataset..."
        X, y = _load_dataset()

        logger.info(f"\n✂️  Bước 2/4: Chia dữ liệu (80/20)...")
        _training_status["progress"] = "Đang chia train/val..."
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=VALIDATION_SPLIT, random_state=42, shuffle=True
        )
        logger.info(f"  Train: {len(X_train)} | Val: {len(X_val)}")

        logger.info("\n🏗️  Bước 3/4: Xây dựng mô hình LSTM...")
        _training_status["progress"] = "Đang xây dựng mô hình..."
        model = _build_model()

        logger.info(f"\n🚀 Bước 4/4: Huấn luyện ({TRAINING_EPOCHS} epochs)...")
        _training_status["progress"] = f"Đang huấn luyện..."

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

        callbacks = [
            EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True, verbose=1),
            ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, verbose=1, min_lr=1e-6),
            ModelCheckpoint(MODEL_PATH, monitor='val_categorical_accuracy',
                          save_best_only=True, verbose=1)
        ]

        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=TRAINING_EPOCHS,
            batch_size=TRAINING_BATCH_SIZE,
            callbacks=callbacks,
            verbose=1
        )

        best_val_acc = max(history.history.get('val_categorical_accuracy', [0]))
        logger.info(f"\n✅ Hoàn tất! Val Accuracy tốt nhất: {best_val_acc:.2%}")

        model_module.load_ai_model()
        _training_status = {
            "is_training": False,
            "progress": f"Hoàn tất! Accuracy: {best_val_acc:.2%}",
            "last_accuracy": f"{best_val_acc:.2%}"
        }
        logger.info("✅ Model mới đã nạp vào bộ nhớ!")

    except ValueError as ve:
        logger.error(f"❌ Lỗi dữ liệu: {ve}")
        _training_status = {"is_training": False, "progress": f"Lỗi: {ve}", "last_accuracy": None}
    except Exception as e:
        logger.error(f"❌ Lỗi huấn luyện: {e}", exc_info=True)
        _training_status = {"is_training": False, "progress": f"Lỗi: {e}", "last_accuracy": None}

    logger.info("=" * 60 + "\n")
