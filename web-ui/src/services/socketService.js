import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * SocketService - Singleton quản lý kết nối WebSocket
 * Cung cấp interface thống nhất để giao tiếp với Backend Node.js qua Socket.IO.
 */
class SocketService {
  constructor() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000
    });

    this._setupDefaultListeners();
  }

  _setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('✅ [Socket] Đã kết nối:', this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ [Socket] Lỗi kết nối:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ [Socket] Ngắt kết nối:', reason);
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`🔄 [Socket] Kết nối lại thành công sau ${attempt} lần thử`);
    });
  }

  /**
   * Đăng ký callback cho một event.
   */
  on(eventName, callback) {
    this.socket.on(eventName, callback);
  }

  /**
   * Hủy đăng ký callback cho một event.
   */
  off(eventName, callback) {
    if (callback) {
      this.socket.off(eventName, callback);
    } else {
      this.socket.off(eventName);
    }
  }

  /**
   * Đăng ký callback khi kết nối thành công.
   */
  onConnect(callback) {
    if (this.socket.connected) {
      callback();
    }
    this.socket.on('connect', callback);
  }

  /**
   * Đăng ký callback khi ngắt kết nối.
   */
  onDisconnect(callback) {
    this.socket.on('disconnect', callback);
  }

  /**
   * Gửi frames để dự đoán cử chỉ (predict mode).
   * @param {number[][]} frames - 30 frames, mỗi frame 126 tọa độ
   */
  sendFramesForPrediction(frames) {
    if (!this.socket.connected) {
      console.warn('⚠️ [Socket] Không thể gửi predict - chưa kết nối');
      return;
    }
    this.socket.emit('predict:gesture', {
      frames,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Gửi frames để lưu vào dataset (collect mode).
   * @param {number[][]} frames - 30 frames tọa độ tay
   * @param {string} gesture_name - Tên cử chỉ (ví dụ: "XIN CHÀO")
   * @param {number} sequence_index - Chỉ số thứ tự của mẫu
   */
  sendFramesForCollection(frames, gesture_name, sequence_index) {
    if (!this.socket.connected) {
      console.warn('⚠️ [Socket] Không thể lưu data - chưa kết nối');
      return;
    }
    this.socket.emit('collect:gesture', { frames, gesture_name, sequence_index });
  }

  /**
   * Kích hoạt quá trình huấn luyện mô hình.
   */
  trainModel() {
    this.socket.emit('train:model');
  }

  /**
   * Lấy thống kê dataset.
   */
  requestDatasetStats() {
    this.socket.emit('dataset:stats');
  }

  /**
   * Kiểm tra trạng thái kết nối.
   */
  get isConnected() {
    return this.socket.connected;
  }
}

// Export singleton instance
export const socketService = new SocketService();