const express = require('express');
const router = express.Router();
const { translateSignLanguage } = require('../controllers/gemini.controller');
const { getDatasetStats, trainLSTMModel } = require('../controllers/python.controller');

module.exports = function(activeUsers, io) {

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'VietSign AI Backend',
      version: '2.0.0',
      active_users: activeUsers.size,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime())
    });
  });

  router.get('/users', (req, res) => {
    const users = Array.from(activeUsers.entries()).map(([id, data]) => ({ id, ...data }));
    res.json({ count: users.length, users });
  });

  router.post('/translate', translateSignLanguage);

  router.get('/dataset/stats', async (req, res) => {
    try {
      const stats = await getDatasetStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Không kết nối được AI Core', detail: err.message });
    }
  });

  router.post('/train', async (req, res) => {
    try {
      const result = await trainLSTMModel();
      if (result.success && io) {
        io.emit('train:started', { message: '🔄 Huấn luyện AI đã bắt đầu...' });
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
