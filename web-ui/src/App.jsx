import React, { useState, useEffect } from 'react';
import VideoCapture from './components/VideoCapture';
import TranslationDisplay from './components/TranslationDisplay';
import GestureCollector from './components/GestureCollector';
import { socketService } from './services/socketService';
import { Brain, PackagePlus, Eye, Activity, Wifi, WifiOff, Sparkles } from 'lucide-react';

function App() {
  const [mode, setMode] = useState('predict');
  const [isTraining, setIsTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState('');
  const [trainStatusType, setTrainStatusType] = useState('info'); // 'info' | 'success' | 'error'
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    // Theo dõi trạng thái kết nối
    socketService.onConnect(() => setIsConnected(true));
    socketService.onDisconnect(() => setIsConnected(false));

    // Cập nhật số lượng user online
    socketService.on('server:stats', (data) => {
      setActiveUsers(data.active_users || 0);
    });

    // Sự kiện server connected
    socketService.on('server:connected', (data) => {
      setIsConnected(true);
      setActiveUsers(data.active_users || 0);
    });

    // Theo dõi training
    socketService.on('train:started', (data) => {
      setIsTraining(true);
      setTrainStatus(data.message);
      setTrainStatusType('info');
    });

    socketService.on('train:completed', (data) => {
      setIsTraining(false);
      setTrainStatus(data.message || '✅ Huấn luyện hoàn tất! Model mới đã sẵn sàng.');
      setTrainStatusType('success');
      setTimeout(() => setTrainStatus(''), 8000);
    });

    socketService.on('train:error', (data) => {
      setIsTraining(false);
      setTrainStatus(`❌ ${data.message}`);
      setTrainStatusType('error');
      setTimeout(() => setTrainStatus(''), 8000);
    });

    return () => {
      socketService.off('server:stats');
      socketService.off('server:connected');
      socketService.off('train:started');
      socketService.off('train:completed');
      socketService.off('train:error');
    };
  }, []);

  const handleTrainModel = () => {
    if (isTraining) return;
    if (!window.confirm('⚠️ Bạn đã thu thập đủ dữ liệu chưa?\n\nQuá trình huấn luyện sẽ mất 2–10 phút tùy số lượng mẫu. Tiếp tục?')) return;
    socketService.trainModel();
  };

  const statusColors = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-300'
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 header-glow" style={{
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.1)'
      }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex justify-between items-center">
          
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)' }}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2"
                  style={{ borderColor: 'var(--color-bg-primary)' }}>
                  <div className="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text-blue leading-none">VietSign AI</h1>
              <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mt-0.5">
                Hybrid Edge · Cloud System
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <button
              id="btn-mode-predict"
              onClick={() => setMode('predict')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === 'predict'
                  ? 'btn-primary'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Eye className="w-4 h-4" />
              Phân Tích & Dịch
            </button>
            
            <button
              id="btn-mode-collect"
              onClick={() => setMode('collect')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === 'collect'
                  ? 'btn-emerald'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <PackagePlus className="w-4 h-4" />
              Thu Thập Data
            </button>

            <div className="w-px h-6 bg-white/10 mx-1" />

            <button
              id="btn-train-model"
              onClick={handleTrainModel}
              disabled={isTraining}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isTraining
                  ? 'opacity-60 cursor-not-allowed text-slate-500 bg-white/5'
                  : 'btn-purple'
              }`}
            >
              <Brain className={`w-4 h-4 ${isTraining ? 'spin' : ''}`} />
              {isTraining ? 'Đang Train...' : 'Huấn Luyện AI'}
            </button>
          </nav>

          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              isConnected ? 'status-online' : 'status-offline'
            }`}>
              {isConnected ? (
                <><Wifi className="w-3.5 h-3.5" /> Kết nối</>
              ) : (
                <><WifiOff className="w-3.5 h-3.5" /> Offline</>
              )}
            </div>
            {isConnected && activeUsers > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                {activeUsers} online
              </div>
            )}
          </div>
        </div>

        {/* Training Progress Bar */}
        {isTraining && (
          <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full animate-pulse" style={{
              background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }} />
          </div>
        )}
      </header>

      {/* ===== TRAIN STATUS BANNER ===== */}
      {trainStatus && (
        <div className="slide-in-top">
          <div className="max-w-screen-2xl mx-auto px-6 pt-4">
            <div className={`rounded-xl px-4 py-3 text-sm font-medium text-center border ${statusColors[trainStatusType]}`}>
              <Sparkles className="w-4 h-4 inline-block mr-2" />
              {trainStatus}
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 flex gap-6">
        
        {/* Camera Panel */}
        <div className="w-[640px] shrink-0">
          <VideoCapture mode={mode} />
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0">
          {mode === 'predict' ? <TranslationDisplay /> : <GestureCollector />}
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t text-center py-3 text-xs text-slate-600"
        style={{ borderColor: 'rgba(56, 189, 248, 0.08)' }}>
        VietSign AI v2.0 · LSTM + MediaPipe + Gemini · &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default App;