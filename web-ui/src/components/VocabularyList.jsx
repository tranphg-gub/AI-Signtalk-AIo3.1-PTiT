import React, { useState, useEffect } from 'react';
import { BookOpen, Database, Sparkles, AlertCircle, Trash2, RefreshCw } from 'lucide-react';

const VocabularyList = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/stats');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Không thể kết nối đến máy chủ AI (Port 8000) để tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async (gestureName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của từ "${gestureName}" không?\nHành động này không thể hoàn tác!`)) return;
    
    try {
      setIsDeleting(true);
      const res = await fetch('http://localhost:8000/delete_all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gesture_name: gestureName })
      });
      if (!res.ok) throw new Error('Lỗi khi xóa');
      alert(`Đã xóa thành công từ "${gestureName}"`);
      await fetchStats(); // Tải lại dữ liệu sau khi xóa
    } catch (err) {
      alert('Không thể xóa dữ liệu: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Đang tải kho lưu trữ...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-red-400">
        <AlertCircle className="w-12 h-12 mb-4 opacity-80" />
        <p>{error}</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors">
          Thử lại
        </button>
      </div>
    );
  }

  const configured = Object.entries(stats?.configured_gestures || {});
  const custom = Object.entries(stats?.custom_gestures || {});

  return (
    <div className="flex-1 flex flex-col max-h-full overflow-y-auto w-full">
      <div className="panel-glow bg-black/40 border border-sky-500/20 rounded-2xl p-8 backdrop-blur-md">
        
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-sky-500 flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.3)]">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Từ Điển Ký Hiệu</h2>
              <p className="text-sky-400 font-medium tracking-wide mt-1 flex items-center gap-2">
                <Database className="w-4 h-4" /> 
                Tổng cộng: {stats?.total_samples || 0} mẫu dữ liệu đã được thu thập
              </p>
            </div>
          </div>
          
          <button 
            onClick={fetchStats} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới (Cập nhật)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Cột 1: Cử chỉ mặc định */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Ký hiệu Hệ thống (Mặc định)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {configured.map(([gesture, count]) => (
                <div key={gesture} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{gesture}</h4>
                    <p className="text-sm text-slate-400 mt-1">{count} mẫu dữ liệu</p>
                  </div>
                  {/* Cho phép xóa cả từ mặc định nếu muốn */}
                  <button onClick={() => handleDelete(gesture)} disabled={isDeleting} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {configured.length === 0 && <p className="text-slate-500 italic">Chưa có ký hiệu nào.</p>}
            </div>
          </div>

          {/* Cột 2: Cử chỉ người dùng thêm */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-purple-400" />
              Ký hiệu Cá nhân (Bạn tự thêm)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {custom.map(([gesture, count]) => (
                <div key={gesture} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{gesture}</h4>
                    <p className="text-sm text-slate-400 mt-1">{count} mẫu dữ liệu</p>
                  </div>
                  <button onClick={() => handleDelete(gesture)} disabled={isDeleting} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {custom.length === 0 && (
                <div className="col-span-2 bg-white/5 border border-dashed border-white/10 rounded-xl p-6 text-center">
                  <p className="text-slate-400">Chưa có ký hiệu cá nhân nào.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VocabularyList;
