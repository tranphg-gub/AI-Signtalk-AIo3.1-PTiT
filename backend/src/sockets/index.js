const {
  callPythonPredictor,
  saveFramesToNpy,
  getDatasetStats,
  trainLSTMModel,
  deleteGestureData
} = require('../controllers/python.controller');

module.exports = function(io, activeUsers) {

  const broadcastStats = () => {
    io.emit('server:stats', { active_users: activeUsers.size, timestamp: new Date().toISOString() });
  };

  io.on('connection', (socket) => {
    console.log(`✅ [${new Date().toLocaleTimeString('vi-VN')}] Kết nối | ID: ${socket.id}`);

    activeUsers.set(socket.id, {
      connected_at: new Date().toISOString(),
      frames_received: 0,
      predictions: 0
    });

    socket.emit('server:connected', {
      message: 'Đã kết nối với VietSign AI Backend v2.0',
      socket_id: socket.id,
      active_users: activeUsers.size
    });
    broadcastStats();

    // ===== THU THẬP DỮ LIỆU =====
    socket.on('collect:gesture', async (data) => {
      try {
        const { frames, gesture_name, sequence_index } = data;
        if (!frames || frames.length !== 30)
          return socket.emit('collect:error', { message: `Cần 30 frames, nhận ${frames?.length}` });
        if (!gesture_name?.trim())
          return socket.emit('collect:error', { message: 'Tên cử chỉ không được để trống' });

        const result = await saveFramesToNpy(gesture_name, frames, sequence_index);
        if (result.success) {
          const user = activeUsers.get(socket.id);
          if (user) user.frames_received += frames.length;
          socket.emit('collect:success', {
            gesture_name: result.gesture_name,
            sequence_index,
            total_samples: result.total_samples,
            message: `✅ Đã lưu mẫu #${sequence_index}`
          });
        } else {
          socket.emit('collect:error', { message: result.error });
        }
      } catch (err) {
        socket.emit('collect:error', { message: err.message });
      }
    });

    // ===== DỰ ĐOÁN REAL-TIME =====
    socket.on('predict:gesture', async (data) => {
      try {
        const { frames, timestamp } = data;
        if (!frames || frames.length !== 30)
          return socket.emit('predict:error', { message: `Cần 30 frames, nhận ${frames?.length}` });

        const t0 = Date.now();
        const prediction = await callPythonPredictor(frames);
        const latency = Date.now() - t0;

        if (prediction && !prediction.error) {
          const user = activeUsers.get(socket.id);
          if (user) user.predictions++;
          socket.emit('predict:result', {
            gesture: prediction.gesture,
            confidence: prediction.confidence,
            all_scores: prediction.all_scores || null,
            timestamp: timestamp || new Date().toISOString(),
            latency
          });
        } else {
          socket.emit('predict:error', { message: prediction?.error || 'AI model không phản hồi' });
        }
      } catch (err) {
        socket.emit('predict:error', { message: err.message });
      }
    });

    // ===== THỐNG KÊ DATASET =====
    socket.on('dataset:stats', async () => {
      try {
        const stats = await getDatasetStats();
        socket.emit('dataset:stats:response', stats);
      } catch (err) {
        socket.emit('dataset:stats:response', { error: err.message });
      }
    });

    // ===== HUẤN LUYỆN =====
    socket.on('train:model', async () => {
      try {
        socket.emit('train:started', { message: '🔄 Đang gửi yêu cầu huấn luyện đến AI Core...' });
        const result = await trainLSTMModel();
        if (result.success) {
          io.emit('train:completed', { message: result.message || '✅ Huấn luyện xong! Model mới sẵn sàng.', success: true });
        } else {
          socket.emit('train:error', { message: result.message });
        }
      } catch (err) {
        socket.emit('train:error', { message: err.message });
      }
    });

    // ===== XÓA DỮ LIỆU =====
    socket.on('dataset:delete_all', async (data) => {
      try {
        const result = await deleteGestureData(data.gesture_name);
        socket.emit('dataset:deleted', result);
      } catch (err) {
        socket.emit('dataset:error', { message: err.message });
      }
    });

    // ===== NGẮT KẾT NỐI =====
    socket.on('disconnect', (reason) => {
      console.log(`❌ [${new Date().toLocaleTimeString('vi-VN')}] Ngắt | ID: ${socket.id} | ${reason}`);
      activeUsers.delete(socket.id);
      broadcastStats();
    });

    socket.on('error', (err) => console.error(`❌ Socket Error [${socket.id}]:`, err.message));
  });
};
