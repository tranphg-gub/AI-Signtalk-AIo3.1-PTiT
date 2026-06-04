import React, { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socketService';
import { Camera, Radio, Square, Loader2, Zap, Hand } from 'lucide-react';

/**
 * Component VideoCapture
 * Khởi tạo MediaPipe Hands, vẽ skeleton tay lên canvas,
 * và gửi frames qua Socket.IO để predict hoặc collect.
 */
function VideoCapture({ mode = 'predict' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isRecordingRef = useRef(false);
  const modeRef = useRef(mode);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Đang tải MediaPipe AI...');
  const [frameCount, setFrameCount] = useState(0);
  const [status, setStatus] = useState('Khởi tạo...');
  const [isRecording, setIsRecording] = useState(false);
  const [handsDetected, setHandsDetected] = useState(false);
  const [fps, setFps] = useState(0);

  // FPS counter
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });

  useEffect(() => {
    modeRef.current = mode;
    stopRecording();
  }, [mode]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // 5 giây

    const checkMediaPipeReady = () => {
      if (window.Hands && window.Camera && window.drawConnectors) {
        setupMediaPipe();
      } else if (retryCount < maxRetries) {
        retryCount++;
        setLoadingMsg(`Đang tải thư viện MediaPipe... (${retryCount}/${maxRetries})`);
        setTimeout(checkMediaPipeReady, 100);
      } else {
        setIsLoading(false);
        setStatus('❌ Lỗi: Không tải được MediaPipe. Kiểm tra kết nối mạng!');
      }
    };

    const setupMediaPipe = async () => {
      try {
        setLoadingMsg('Khởi tạo mô hình nhận diện tay...');
        
        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        setLoadingMsg('Khởi động camera...');

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            // FPS tracking
            const fpsData = fpsCounterRef.current;
            fpsData.count++;
            const now = Date.now();
            if (now - fpsData.lastTime >= 1000) {
              setFps(fpsData.count);
              fpsData.count = 0;
              fpsData.lastTime = now;
            }

            await hands.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
          facingMode: 'user'
        });

        cameraRef.current = camera;
        await camera.start();
        setIsLoading(false);
        setStatus('Camera sẵn sàng');
      } catch (error) {
        console.error('Lỗi khởi tạo MediaPipe:', error);
        setIsLoading(false);
        setStatus(`❌ Lỗi camera: ${error.message}`);
      }
    };

    checkMediaPipeReady();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  /**
   * Trích xuất tọa độ tất cả landmarks của hai tay.
   * Output: flat array 126 giá trị [x,y,z của 21 điểm của tay 1, rồi tay 2]
   */
  const extractLandmarks = (results) => {
    const landmarks = new Float32Array(126).fill(0);
    if (results.multiHandLandmarks) {
      results.multiHandLandmarks.forEach((hand, handIdx) => {
        if (handIdx > 1) return; // Tối đa 2 tay
        hand.forEach((point, pointIdx) => {
          const startIdx = handIdx * 63 + pointIdx * 3;
          landmarks[startIdx]     = point.x;
          landmarks[startIdx + 1] = point.y;
          landmarks[startIdx + 2] = point.z;
        });
      });
    }
    return Array.from(landmarks);
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ mirror effect (lật ngang để như gương)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const detected = !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
    setHandsDetected(detected);

    if (results.multiHandLandmarks) {
      for (const handLandmarks of results.multiHandLandmarks) {
        // Vẽ đường nối khớp (xương)
        window.drawConnectors(ctx, handLandmarks, window.HAND_CONNECTIONS, {
          color: mode === 'predict' ? '#38bdf8' : '#34d399',
          lineWidth: 2.5
        });
        // Vẽ các điểm khớp
        window.drawLandmarks(ctx, handLandmarks, {
          color: mode === 'predict' ? '#818cf8' : '#fbbf24',
          lineWidth: 1,
          radius: 4
        });
      }
    }
    ctx.restore();

    // Thu thập frames khi đang ghi
    if (isRecordingRef.current) {
      if (detected) {
        const landmarks = extractLandmarks(results);
        frameBufferRef.current.push(landmarks);
        setFrameCount(frameBufferRef.current.length);

        if (frameBufferRef.current.length >= 30) {
          const framesToSend = frameBufferRef.current.slice(0, 30);

          if (modeRef.current === 'predict') {
            socketService.sendFramesForPrediction(framesToSend);
            setStatus('⚡ Đang dự đoán...');
          } else if (modeRef.current === 'collect') {
            window.dispatchEvent(new CustomEvent('frames-ready', { detail: framesToSend }));
            setStatus('📸 Đã ghi mẫu! Tiếp tục...');
          }
          frameBufferRef.current = [];
          setFrameCount(0);
        }
      } else {
        setStatus('👋 Đưa tay vào khung hình...');
      }
    }
  };

  const startRecording = () => {
    isRecordingRef.current = true;
    setIsRecording(true);
    frameBufferRef.current = [];
    setFrameCount(0);
    setStatus('👋 Đưa tay vào khung hình...');
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    frameBufferRef.current = [];
    setFrameCount(0);
    setStatus('Đã tạm dừng');
  };

  const modeColor = mode === 'predict' ? '#38bdf8' : '#34d399';
  const modeLabel = mode === 'predict' ? 'Nhận diện' : 'Thu thập';

  return (
    <div className="glass-card overflow-hidden flex flex-col"
      style={{ border: `1px solid ${mode === 'predict' ? 'rgba(56,189,248,0.2)' : 'rgba(52,211,153,0.2)'}` }}>

      {/* Camera Viewport */}
      <div className="relative bg-black overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-cover"
        />

        {/* Scan Line Animation (khi đang recording) */}
        {isRecording && <div className="scan-line" />}

        {/* Corner Brackets (AI scanner UI) */}
        <div className="absolute inset-4 pointer-events-none">
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-6 h-6" style={{
            borderTop: `2px solid ${modeColor}`,
            borderLeft: `2px solid ${modeColor}`,
            opacity: 0.8
          }} />
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-6 h-6" style={{
            borderTop: `2px solid ${modeColor}`,
            borderRight: `2px solid ${modeColor}`,
            opacity: 0.8
          }} />
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-6 h-6" style={{
            borderBottom: `2px solid ${modeColor}`,
            borderLeft: `2px solid ${modeColor}`,
            opacity: 0.8
          }} />
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-6 h-6" style={{
            borderBottom: `2px solid ${modeColor}`,
            borderRight: `2px solid ${modeColor}`,
            opacity: 0.8
          }} />
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(5,10,20,0.9)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)' }}>
              <Loader2 className="w-8 h-8 text-sky-400 spin" />
            </div>
            <p className="text-sky-400 font-medium text-sm">{loadingMsg}</p>
            <p className="text-slate-600 text-xs mt-2">Lần đầu có thể mất 10–20 giây</p>
          </div>
        )}

        {/* Recording Badge */}
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              backdropFilter: 'blur(8px)',
              color: '#fca5a5'
            }}>
            <div className="recording-dot" />
            REC
          </div>
        )}

        {/* Hand Detection Badge */}
        {!isLoading && (
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            handsDetected ? 'status-online' : 'status-offline'
          }`} style={{ backdropFilter: 'blur(8px)' }}>
            <Hand className="w-3.5 h-3.5" />
            {handsDetected ? 'Tay phát hiện' : 'Chờ tay'}
          </div>
        )}

        {/* FPS Counter */}
        {!isLoading && fps > 0 && (
          <div className="absolute bottom-3 right-3 text-xs font-mono"
            style={{ color: 'rgba(148,163,184,0.6)' }}>
            {fps} FPS
          </div>
        )}

        {/* Mode Label */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: modeColor }}>
          <Zap className="w-3.5 h-3.5" />
          {modeLabel}
        </div>
      </div>

      {/* Controls Panel */}
      <div className="p-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        
        {/* Status Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" style={{ color: modeColor }} />
            <span className="text-sm text-slate-400">
              {status}
            </span>
          </div>

          {/* Frame Progress (collect mode) */}
          {mode === 'collect' && isRecording && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Frames</span>
              <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${(frameCount / 30) * 100}%`,
                    background: 'linear-gradient(90deg, #059669, #34d399)'
                  }}
                />
              </div>
              <span className="text-xs font-mono text-emerald-400 w-8">{frameCount}/30</span>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          {!isRecording ? (
            <button
              id="btn-start-recording"
              onClick={startRecording}
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              } ${mode === 'predict' ? 'btn-primary' : 'btn-emerald'}`}
            >
              <Radio className="w-4 h-4" />
              {mode === 'predict' ? '🎯 Bật AI Nhận Diện' : '🎬 Bắt Đầu Quay Mẫu'}
            </button>
          ) : (
            <button
              id="btn-stop-recording"
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-slate-300 transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Square className="w-4 h-4" />
              ⏹ Tạm Dừng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoCapture;