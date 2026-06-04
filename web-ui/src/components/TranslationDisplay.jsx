import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { translateWordsToSentence } from '../services/api';
import {
  Volume2, RefreshCw, Sparkles, MessageSquareText,
  Activity, Clock, TrendingUp, ChevronRight, Mic2
} from 'lucide-react';

/**
 * Component TranslationDisplay
 * Hiển thị kết quả nhận diện cử chỉ real-time và dịch sang câu tự nhiên.
 * Tích hợp Text-to-Speech và Gemini AI translation.
 */
function TranslationDisplay() {
  const [recognizedWords, setRecognizedWords] = useState([]);
  const [currentGesture, setCurrentGesture] = useState('--');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [currentLatency, setCurrentLatency] = useState(0);
  const [history, setHistory] = useState([]);
  const [translatedSentence, setTranslatedSentence] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [allScores, setAllScores] = useState(null);

  const isSpeakingRef = useRef(false);
  const translateTimeoutRef = useRef(null);
  const historyRef = useRef(null);

  useEffect(() => {
    const handlePredictResult = (data) => {
      const { gesture, confidence, latency, all_scores } = data;
      const confPercent = Math.round(confidence * 100);

      setCurrentGesture(gesture || '--');
      setCurrentConfidence(confPercent);
      setCurrentLatency(latency || 0);
      setAllScores(all_scores || null);

      const isValidGesture = gesture && gesture !== 'TRẠNG THÁI NGHỈ' && gesture !== 'Không rõ' && confidence > 0.75;

      if (isValidGesture) {
        const timeString = new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });

        setHistory(prev => {
          const newItem = { gesture, confPercent, time: timeString, latency: latency || 0 };
          return [newItem, ...prev].slice(0, 15);
        });

        setRecognizedWords(prev => {
          // Chỉ thêm nếu từ vừa nhận không giống từ cuối cùng (tránh lặp)
          if (prev.length === 0 || prev[prev.length - 1] !== gesture) {
            // Text-to-Speech cho từ vừa nhận diện
            if (!isSpeakingRef.current && window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(gesture);
              utterance.lang = 'vi-VN';
              utterance.rate = 0.9;
              utterance.onstart = () => {
                isSpeakingRef.current = true;
                setIsSpeaking(true);
              };
              utterance.onend = () => {
                isSpeakingRef.current = false;
                setIsSpeaking(false);
              };
              utterance.onerror = () => {
                isSpeakingRef.current = false;
                setIsSpeaking(false);
              };
              window.speechSynthesis.speak(utterance);
            }
            return [...prev, gesture];
          }
          return prev;
        });
      }
    };

    socketService.on('predict:result', handlePredictResult);
    return () => socketService.off('predict:result');
  }, []);

  // Auto-translate sau 2 giây không có từ mới
  useEffect(() => {
    if (recognizedWords.length > 0) {
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);

      translateTimeoutRef.current = setTimeout(async () => {
        setIsTranslating(true);
        const res = await translateWordsToSentence(recognizedWords);
        setIsTranslating(false);

        if (res?.success && res.sentence) {
          setTranslatedSentence(res.sentence);
          // Đọc câu hoàn chỉnh
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(res.sentence);
            utterance.lang = 'vi-VN';
            utterance.rate = 0.85;
            window.speechSynthesis.speak(utterance);
          }
        }
      }, 2500);
    }

    return () => {
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    };
  }, [recognizedWords]);

  const handleSpeakSentence = () => {
    if (!translatedSentence || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatedSentence);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const handleClear = () => {
    setRecognizedWords([]);
    setCurrentGesture('--');
    setCurrentConfidence(0);
    setCurrentLatency(0);
    setHistory([]);
    setTranslatedSentence('');
    setAllScores(null);
    if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  // Màu confidence bar
  const getConfidenceColor = (pct) => {
    if (pct >= 80) return 'linear-gradient(90deg, #059669, #34d399)';
    if (pct >= 60) return 'linear-gradient(90deg, #d97706, #fbbf24)';
    return 'linear-gradient(90deg, #b91c1c, #f87171)';
  };

  const getConfidenceClass = (pct) => {
    if (pct >= 80) return 'confidence-high';
    if (pct >= 60) return 'confidence-medium';
    return 'confidence-low';
  };

  return (
    <div className="glass-card h-full flex flex-col overflow-hidden">

      {/* ===== HEADER: Từ đã nhận diện ===== */}
      <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-slate-200">Từ Nhận Diện</h3>
            {isSpeaking && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs status-online">
                <Mic2 className="w-3 h-3" />
                Đang đọc
              </div>
            )}
          </div>
          <button
            id="btn-clear-translation"
            onClick={handleClear}
            title="Xóa và bắt đầu lại"
            className="p-2 rounded-lg text-slate-500 hover:text-red-400 transition-colors hover:bg-red-500/10"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Word Tags */}
        <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
          {recognizedWords.length === 0 ? (
            <span className="text-slate-600 italic text-sm">Chưa nhận diện được từ nào...</span>
          ) : (
            recognizedWords.map((word, idx) => (
              <span
                key={`${word}-${idx}`}
                className="word-tag inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold"
                style={{
                  background: 'rgba(56,189,248,0.1)',
                  border: '1px solid rgba(56,189,248,0.25)',
                  color: '#7dd3fc'
                }}
              >
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                {word}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ===== GEMINI TRANSLATION ===== */}
      <div className="p-5 border-b" style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: 'linear-gradient(135deg, rgba(30,15,65,0.5) 0%, rgba(5,10,20,0.3) 100%)'
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Gemini AI · Dịch Tự Nhiên
          </h4>
        </div>

        <div className="rounded-xl p-4 min-h-[90px] flex flex-col justify-center relative"
          style={{
            background: 'rgba(10,5,30,0.6)',
            border: '1px solid rgba(167,139,250,0.15)'
          }}>
          {isTranslating ? (
            <div className="flex items-center gap-3 text-slate-400">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-violet-500"
                    style={{ animation: `neuralGlow 1s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <span className="text-sm">Gemini AI đang phân tích và dịch...</span>
            </div>
          ) : translatedSentence ? (
            <>
              <p className="text-xl font-medium text-white leading-relaxed pr-12">
                {translatedSentence}
              </p>
              <button
                id="btn-speak-sentence"
                onClick={handleSpeakSentence}
                title="Đọc câu này"
                className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  boxShadow: '0 0 15px rgba(124,58,237,0.4)'
                }}
              >
                <Volume2 className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <p className="text-slate-600 text-center italic text-sm">
              Ngừng ký hiệu 2.5 giây → AI sẽ tự động dịch câu hoàn chỉnh...
            </p>
          )}
        </div>
      </div>

      {/* ===== REAL-TIME STATUS & HISTORY ===== */}
      <div className="flex-1 p-5 grid grid-cols-2 gap-4 overflow-hidden">

        {/* Real-time Status */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Trạng Thái Thời Gian Thực
          </h4>

          <div className="rounded-xl p-4 space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            
            {/* Cử chỉ hiện tại */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Cử chỉ đang quét</p>
              <p className={`text-lg font-bold ${currentGesture !== '--' ? 'gradient-text-blue' : 'text-slate-600'}`}>
                {currentGesture}
              </p>
            </div>

            {/* Confidence Bar */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs text-slate-500">Độ tin cậy</p>
                <span className={`text-sm font-bold font-mono ${getConfidenceClass(currentConfidence)}`}>
                  {currentConfidence}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${currentConfidence}%`,
                    background: getConfidenceColor(currentConfidence)
                  }}
                />
              </div>
            </div>

            {/* Latency */}
            <div className="flex items-center justify-between pt-1 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Độ trễ mạng
              </span>
              <span className={`text-xs font-mono font-bold ${
                currentLatency < 100 ? 'text-emerald-400' :
                currentLatency < 300 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {currentLatency > 0 ? `${currentLatency}ms` : '--'}
              </span>
            </div>
          </div>

          {/* Top Scores Panel */}
          {allScores && (
            <div className="rounded-xl p-3 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                Điểm tất cả cử chỉ
              </p>
              {Object.entries(allScores)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([gesture, score]) => (
                  <div key={gesture} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 truncate">{gesture}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${score * 100}%`,
                          background: score > 0.75 ? '#34d399' : score > 0.4 ? '#fbbf24' : '#475569'
                        }} />
                    </div>
                    <span className="text-xs font-mono text-slate-600 w-10 text-right">
                      {(score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="flex flex-col">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
            <Clock className="w-3.5 h-3.5" /> Lịch Sử Nhận Diện
          </h4>

          <div ref={historyRef}
            className="flex-1 rounded-xl overflow-y-auto custom-scrollbar space-y-1"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px' }}>
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
                Chưa có dữ liệu
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={idx}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ animation: idx === 0 ? 'slideInTop 0.3s ease' : 'none' }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{item.gesture}</p>
                    <p className="text-xs text-slate-600">{item.time} · {item.latency}ms</p>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getConfidenceClass(item.confPercent)}`}
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {item.confPercent}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranslationDisplay;