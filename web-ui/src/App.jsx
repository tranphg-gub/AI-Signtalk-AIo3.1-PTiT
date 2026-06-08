import React, { useState, useEffect } from 'react';
import VideoCapture from './components/VideoCapture';
import TranslationDisplay from './components/TranslationDisplay';
import GestureCollector from './components/GestureCollector';
import VocabularyList from './components/VocabularyList';
import { socketService } from './services/socketService';
import { Brain, Eye, Activity, Wifi, WifiOff, Sparkles, BookOpen, Settings, Fingerprint, DatabaseZap } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('predict'); // 'predict' | 'dictionary' | 'admin'
  const [isTraining, setIsTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState('');
  const [trainStatusType, setTrainStatusType] = useState('info'); // 'info' | 'success' | 'error'
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    socketService.onConnect(() => setIsConnected(true));
    socketService.onDisconnect(() => setIsConnected(false));

    socketService.on('server:stats', (data) => {
      setActiveUsers(data.active_users || 0);
    });

    socketService.on('server:connected', (data) => {
      setIsConnected(true);
      setActiveUsers(data.active_users || 0);
    });

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
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg-primary)' }}>
      
      {/* ===== SIDEBAR ===== */}
      <aside className="w-64 shrink-0 flex flex-col border-r header-glow relative z-50" style={{
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(56, 189, 248, 0.1)'
      }}>
        <div className="p-6 flex items-center gap-3">
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
            <p className="text-xs text-slate-500 font-medium tracking-widest mt-1">
              v2.0 Beta
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 flex flex-col gap-2">
          <p className="px-3 text-xs font-bold tracking-wider text-slate-500 uppercase mb-2">Người dùng</p>
          
          <button
            onClick={() => setActiveTab('predict')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'predict'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Fingerprint className="w-5 h-5" />
            Dịch Ký Hiệu
          </button>
          
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'dictionary'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Kho Từ Vựng
          </button>

          <div className="mt-auto pt-8 flex flex-col gap-2">
            <p className="px-3 text-xs font-bold tracking-wider text-slate-500 uppercase mb-2">Hệ thống</p>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Settings className="w-5 h-5" />
              Cài đặt & Quản trị
            </button>
          </div>
        </nav>

        {/* Connection Status Box */}
        <div className="p-4 m-4 rounded-xl bg-black/40 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Trạng thái Server</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {isConnected ? <span className="text-emerald-400 flex items-center gap-1"><Wifi className="w-4 h-4"/> Đã kết nối</span> : <span className="text-red-400 flex items-center gap-1"><WifiOff className="w-4 h-4"/> Mất kết nối</span>}
          </div>
          {isConnected && activeUsers > 0 && (
            <div className="mt-2 text-xs text-sky-400 flex items-center gap-1">
              <Activity className="w-3 h-3" /> {activeUsers} thiết bị online
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Progress Bar for Training */}
        {isTraining && (
          <div className="absolute top-0 left-0 h-1 w-full z-50">
            <div className="h-full animate-pulse" style={{
              background: 'linear-gradient(90deg, #7c3aed, #0ea5e9, #7c3aed)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }} />
          </div>
        )}

        {/* Status Banner */}
        {trainStatus && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className={`rounded-xl px-6 py-3 text-sm font-semibold shadow-2xl border backdrop-blur-md ${statusColors[trainStatusType]}`}>
              <Sparkles className="w-4 h-4 inline-block mr-2" />
              {trainStatus}
            </div>
          </div>
        )}

        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
          
          {/* TAB 1: PREDICT (DỊCH KÝ HIỆU) */}
          {activeTab === 'predict' && (
            <>
              <div className="w-[640px] shrink-0 h-full">
                <VideoCapture mode="predict" />
              </div>
              <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2">
                <TranslationDisplay />
              </div>
            </>
          )}

          {/* TAB 2: DICTIONARY (KHO TỪ VỰNG) */}
          {activeTab === 'dictionary' && (
             <div className="flex-1 h-full w-full">
               <VocabularyList />
             </div>
          )}

          {/* TAB 3: ADMIN (CÀI ĐẶT & QUẢN TRỊ) */}
          {activeTab === 'admin' && (
            <div className="flex-1 flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-10">
              
              <div className="panel-glow bg-black/40 border border-sky-500/20 rounded-2xl p-6 backdrop-blur-md">
                <h2 className="text-xl font-bold text-sky-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Khu Vực Cá Nhân Hóa (Dạy AI Học Từ Mới)
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  Bạn có thể dạy hệ thống những ngôn ngữ ký hiệu của riêng bạn (hoặc xóa đi nếu làm sai). Sau khi dạy xong, hãy bấm "Bắt Đầu Huấn Luyện" để AI ghi nhớ nhé!
                </p>
                
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                    <div>
                      <h3 className="font-semibold text-slate-200">Huấn Luyện AI (Live Training)</h3>
                      <p className="text-sm text-slate-500">Kích hoạt quá trình huấn luyện TensorFlow ngay lập tức.</p>
                    </div>
                    <button
                      onClick={handleTrainModel}
                      disabled={isTraining}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg ${
                        isTraining
                          ? 'opacity-60 cursor-not-allowed text-slate-500 bg-white/5'
                          : 'btn-purple hover:scale-105'
                      }`}
                    >
                      <Brain className={`w-4 h-4 ${isTraining ? 'spin' : ''}`} />
                      {isTraining ? 'Đang Train...' : 'Bắt Đầu Huấn Luyện'}
                    </button>
                  </div>
                </div>
              </div>

              {/* GESTURE COLLECTOR */}
              <div className="flex-1 min-h-[600px] flex gap-6">
                <div className="w-[640px] shrink-0 h-full">
                  <VideoCapture mode="collect" />
                </div>
                <div className="flex-1 h-full">
                  <GestureCollector />
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  );
}

export default App;