require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const apiRoutes = require('./src/routes/api.routes');
const socketHandler = require('./src/sockets/index');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ============= MIDDLEWARE =============
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('vi-VN')}] ${req.method} ${req.path}`);
  next();
});

// Serve React build nếu có
app.use(express.static(path.join(__dirname, '../web-ui/dist')));

// ============= SOCKET.IO =============
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

const activeUsers = new Map();

// ============= ROUTES =============
app.use('/api', apiRoutes(activeUsers, io));

// SPA Fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../web-ui/dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: '🤟 VietSign AI Backend đang chạy!',
      api_docs: `http://localhost:${PORT}/api/health`,
      note: 'Chạy: cd web-ui && npm run dev để xem giao diện'
    });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(`❌ Server Error: ${err.message}`);
  res.status(500).json({ error: err.message });
});

// ============= SOCKET HANDLER =============
socketHandler(io, activeUsers);

// ============= START =============
const banner = `
${'═'.repeat(60)}
🤟  VIETSIGN AI BACKEND v2.0  —  http://localhost:${PORT}
${'═'.repeat(60)}
  🌐  API Health  →  http://localhost:${PORT}/api/health
  🔌  WebSocket   →  ws://localhost:${PORT}
  🧠  AI Core     →  ${process.env.PYTHON_API || 'http://localhost:8000'}
${'═'.repeat(60)}
`;

server.listen(PORT, () => console.log(banner));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} đang bị chiếm! Đổi PORT trong .env`);
  } else {
    console.error('❌ Lỗi server:', err);
  }
  process.exit(1);
});
