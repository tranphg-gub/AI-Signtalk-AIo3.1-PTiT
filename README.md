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
