@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║      🤟  VIETSIGN AI v2.0  —  KHỞI ĐỘNG HỆ THỐNG       ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo [BƯỚC 1] Khởi động AI Core (Python FastAPI)...
echo   → http://localhost:8000/docs
start "VietSign AI Core" cmd /k "cd /d C:\VietSign-AI-v2\ai_core && uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [BƯỚC 2] Khởi động Backend (Node.js)...
echo   → http://localhost:5000/api/health
start "VietSign Backend" cmd /k "cd /d C:\VietSign-AI-v2\backend && node server.js"

timeout /t 2 /nobreak >nul

echo [BƯỚC 3] Khởi động Frontend (Vite)...
echo   → http://localhost:5173
start "VietSign Frontend" cmd /k "cd /d C:\VietSign-AI-v2\web-ui && npm run dev"

echo.
echo ✅ Tất cả dịch vụ đang khởi động!
echo.
echo Mở trình duyệt tại: http://localhost:5173
echo.
pause
