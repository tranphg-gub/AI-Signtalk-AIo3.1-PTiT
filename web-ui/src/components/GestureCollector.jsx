import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socketService';
import {
  Database, RotateCcw, CheckCircle2, AlertCircle,
  Trash2, Info, BarChart2, Plus, Layers
} from 'lucide-react';

// Danh sách từ vựng được định nghĩa sẵn trong hệ thống
const PRESET_ACTIONS = [
  'XIN CHÀO', 'TẠM BIỆT', 'CẢM ƠN', 'GIÚP ĐỠ',
  'TÔI', 'BẠN', 'CÓ', 'KHÔNG', 'KHỎE', 'MỆT'
];
const TARGET_SAMPLES = 100;

/**
 * Component GestureCollector
 * Giao diện thu thập dữ liệu cử chỉ cho training.
 * Hỗ trợ chọn từ preset hoặc nhập tùy chỉnh.
 */
function GestureCollector() {
  const [gestureName, setGestureName] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [sessionError, setSessionError] = useState('');
  const [datasetStats, setDatasetStats] = useState({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const countRef = useRef(0);

  // Đồng bộ ref với state
  useEffect(() => {
    countRef.current = savedCount;
  }, [savedCount]);

  // Load dataset stats khi mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = useCallback(() => {
    setIsLoadingStats(true);
    socketService.on('dataset:stats:response', (stats) => {
      if (stats.configured_gestures) {
        setDatasetStats(stats.configured_gestures);
      }
      setIsLoadingStats(false);
    });
    socketService.socket.emit('dataset:stats');
  }, []);

  // Lắng nghe sự kiện frames-ready từ VideoCapture
  useEffect(() => {
    const handleFramesReady = (e) => {
      const frames = e.detail;
      const currentName = gestureName.trim().toUpperCase();

      if (!currentName) {
        setSessionError('⚠️ Hãy nhập tên cử chỉ trước khi quay!');
        return;
      }
      if (countRef.current >= TARGET_SAMPLES) return;

      const currentIndex = countRef.current;
      socketService.sendFramesForCollection(frames, currentName, currentIndex);
      setSessionError('');
    };

    const handleCollectSuccess = (data) => {
      const currentName = gestureName.trim().toUpperCase();
      if (data.gesture_name === currentName) {
        setSavedCount(prev => {
          const newCount = prev + 1;
          // Cập nhật stats local
          setDatasetStats(prev => ({
            ...prev,
            [currentName]: (prev[currentName] || 0) + 1
          }));
          return newCount;
        });
      }
    };

    const handleCollectError = (data) => {
      setSessionError(`❌ Lỗi: ${data.message}`);
    };

    window.addEventListener('frames-ready', handleFramesReady);
    socketService.on('collect:success', handleCollectSuccess);
    socketService.on('collect:error', handleCollectError);

    return () => {
      window.removeEventListener('frames-ready', handleFramesReady);
      socketService.off('collect:success');
      socketService.off('collect:error');
    };
  }, [gestureName]);

  const handleSelectPreset = (action) => {
    setGestureName(action);
    setSavedCount(0);
    setSessionError('');
  };

  const handleReset = () => {
    if (!window.confirm('Đặt lại bộ đếm về 0?\n(Dữ liệu đã lưu trên server vẫn được giữ nguyên)')) return;
    setSavedCount(0);
    setSessionError('');
  };

  const handleDeleteAll = () => {
    const name = gestureName.trim().toUpperCase();
    if (!name) return;
    if (!window.confirm(`⚠️ XÓA TOÀN BỘ dữ liệu của "${name}"?\n\nHành động này không thể hoàn tác!`)) return;

    socketService.socket.emit('dataset:delete_all', { gesture_name: name });
    setSavedCount(0);
    setDatasetStats(prev => ({ ...prev, [name]: 0 }));
  };

  const progress = Math.min((savedCount / TARGET_SAMPLES) * 100, 100);
  const isComplete = savedCount >= TARGET_SAMPLES;
  const currentName = gestureName.trim().toUpperCase();
  const existingSamples = datasetStats[currentName] || 0;

  return (
    <div className="glass-card h-full flex flex-col overflow-hidden"
      style={{ border: '1px solid rgba(52,211,153,0.2)' }}>

      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Thu Thập Dữ Liệu Huấn Luyện</h3>
            <p className="text-xs text-slate-500">Mỗi cử chỉ cần {TARGET_SAMPLES} mẫu để AI học chính xác</p>
          </div>
          <button
            onClick={loadStats}
            title="Làm mới thống kê"
            className="ml-auto p-2 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors hover:bg-emerald-500/10"
          >
            <RotateCcw className={`w-4 h-4 ${isLoadingStats ? 'spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">

        {/* ===== BƯỚC 1: CHỌN CỬ CHỈ ===== */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center border border-emerald-500/30">1</span>
            Chọn hoặc nhập tên cử chỉ
          </label>

          {/* Preset Chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_ACTIONS.map(action => (
              <button
                key={action}
                onClick={() => handleSelectPreset(action)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentName === action
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/5 hover:border-white/10'
                }`}
              >
                {action}
                {(datasetStats[action] || 0) > 0 && (
                  <span className="ml-1.5 text-slate-500 font-normal">
                    ({datasetStats[action] || 0})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="input-gesture-name"
              type="text"
              value={gestureName}
              onChange={(e) => {
                setGestureName(e.target.value.toUpperCase());
                setSavedCount(0);
                setSessionError('');
              }}
              placeholder="Hoặc nhập tên tùy chỉnh..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-semibold placeholder:font-normal transition-all focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0',
                '&:focus': { borderColor: 'rgba(52,211,153,0.5)' }
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Existing data info */}
          {currentName && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Dữ liệu hiện có trên server:
                <span className={`font-bold ml-1 ${existingSamples >= TARGET_SAMPLES ? 'text-emerald-400' : 'text-sky-400'}`}>
                  {existingSamples} / {TARGET_SAMPLES} mẫu
                </span>
              </span>
            </div>
          )}
        </div>

        {/* ===== BƯỚC 2: TIẾN ĐỘ THU THẬP ===== */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center border border-emerald-500/30">2</span>
            Tiến độ phiên thu thập này
          </label>

          <div className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-400">Mẫu đã lưu (phiên này)</span>
              <span className={`font-bold font-mono text-lg ${isComplete ? 'text-emerald-400' : 'text-sky-400'}`}>
                {savedCount}<span className="text-slate-600 font-normal text-sm">/{TARGET_SAMPLES}</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar mb-3">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progress}%`,
                  background: isComplete
                    ? 'linear-gradient(90deg, #059669, #34d399)'
                    : 'linear-gradient(90deg, #0284c7, #38bdf8)'
                }}
              />
            </div>

            {/* Complete Message */}
            {isComplete && (
              <div className="flex items-center gap-2 justify-center py-2 rounded-lg text-emerald-400 text-sm font-semibold fade-in"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <CheckCircle2 className="w-4 h-4" />
                Đủ {TARGET_SAMPLES} mẫu! Bấm Tạm Dừng và tiếp tục với từ khác.
              </div>
            )}

            {/* Error Message */}
            {sessionError && (
              <div className="flex items-center gap-2 mt-2 py-2 px-3 rounded-lg text-red-400 text-xs fade-in"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {sessionError}
              </div>
            )}
          </div>
        </div>

        {/* ===== DATASET OVERVIEW ===== */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-3">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            Tổng quan dataset
          </label>

          <div className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {Object.entries(datasetStats).length === 0 ? (
              <div className="py-6 text-center text-slate-600 text-sm italic">
                {isLoadingStats ? 'Đang tải...' : 'Chưa có dữ liệu'}
              </div>
            ) : (
              <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
                {Object.entries(datasetStats).map(([action, count]) => {
                  const pct = Math.min((count / TARGET_SAMPLES) * 100, 100);
                  const isReady = count >= TARGET_SAMPLES;
                  return (
                    <div key={action} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/3 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300 truncate">{action}</span>
                          <span className={`text-xs font-mono ml-2 flex-shrink-0 ${isReady ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {count}/{TARGET_SAMPLES}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: isReady
                                ? 'linear-gradient(90deg, #059669, #34d399)'
                                : 'linear-gradient(90deg, #0284c7, #38bdf8)'
                            }} />
                        </div>
                      </div>
                      {isReady && <Layers className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== ACTION BUTTONS ===== */}
      <div className="p-5 border-t flex gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          id="btn-reset-counter"
          onClick={handleReset}
          title="Reset bộ đếm về 0"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 transition-all hover:text-slate-200 hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>

        <button
          id="btn-delete-gesture-data"
          onClick={handleDeleteAll}
          disabled={!currentName}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all btn-danger ${!currentName ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Trash2 className="w-4 h-4" />
          Xóa Data "{currentName || '...'}"
        </button>
      </div>
    </div>
  );
}

export default GestureCollector;