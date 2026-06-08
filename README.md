# VietSign AI v2.0

## 🚀 Chạy Nhanh

### Cách 1: Script tự động (Khuyến nghị)
```
Double-click: START_ALL.bat
```

### Cách 2: Thủ công (3 terminal)

**Terminal 1 — AI Core:**
```bash
cd C:\VietSign-AI-v2\ai_core
pip install -r ..\requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Backend:**
```bash
cd C:\VietSign-AI-v2\backend
npm install
copy .env.example .env
# Mở .env và điền GEMINI_API_KEY
node server.js
```

**Terminal 3 — Frontend:**
```bash
cd C:\VietSign-AI-v2\web-ui
npm install
npm run dev
```

**Mở trình duyệt:** http://localhost:5173

---

## 📋 Cấu Trúc Thư Mục

```
C:\VietSign-AI-v2\
├── START_ALL.bat          ← Script khởi động tất cả
├── requirements.txt       ← Python dependencies
├── ai_core\               ← Python FastAPI (port 8000)
│   ├── main.py
│   ├── dataset\           ← Dữ liệu thu thập (.npy files)
│   ├── model\             ← Model đã train (.keras file)
│   └── src\
│       ├── api\routes.py
│       └── core\
│           ├── config.py
│           ├── model.py
│           └── training.py
├── backend\               ← Node.js (port 5000)
│   ├── server.js
│   ├── .env.example       ← Copy thành .env, điền API key
│   └── src\...
└── web-ui\                ← React + Vite (port 5173)
    ├── index.html
    └── src\...
```

---

## 🔑 Lấy Gemini API Key

1. Vào https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy key → dán vào `backend\.env` → `GEMINI_API_KEY=...`

---

## 📊 Xem Tài Liệu Dự Án

Xem trong Antigravity IDE (đã tạo tự động):
- Phân tích lỗi & hướng dẫn training
- Mẫu báo cáo đồ án đại học
- Hướng dẫn thuyết trình PowerPoint

---

## 🛡️ Thuật Toán Chống Nhiễu AI (Mới)
Hệ thống v2.0 đã được nâng cấp cơ chế nhận diện liên tục chống nhiễu:
1. **Active Zone (Vùng hoạt động):** Tự động bỏ qua khung hình khi người dùng buông thõng 2 tay.
2. **Sliding Window:** Đẩy dữ liệu liên tục 10 frame / lần thay vì chờ gom đủ 30 frame, giúp nhận diện mượt mà và không bị rớt khung hình.
3. **Consecutive Frames:** Chỉ công nhận kết quả khi mô hình dự đoán giống nhau trong 3 lần liên tiếp, loại bỏ triệt để hiện tượng "chớp nháy" ký hiệu rác.
4. **Debounce / Cooldown:** Sau khi nhận diện một từ, hệ thống bỏ qua các thay đổi trong 1.5 giây để chờ người dùng rút tay về.
