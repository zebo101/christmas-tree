import { useState, useRef, useEffect } from 'react';
import { X, Video, Minimize2, Maximize2 } from 'lucide-react';

interface CameraDebugProps {
  enabled: boolean;
}

export function CameraDebug({ enabled }: CameraDebugProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled || !isVisible || isMinimized) {
      // Stop stream when not needed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          }
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStreamError(false);
      } catch (error) {
        console.error('Failed to access camera:', error);
        setStreamError(true);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [enabled, isVisible, isMinimized]);

  if (!isVisible || !enabled) return null;

  return (
    <div className="absolute bottom-20 left-4 z-50">
      <div className="glass-gold rounded-xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-black/40">
          <div className="flex items-center gap-2">
            <Video className="w-3 h-3 text-christmas-green" />
            <span className="text-xs text-white font-medium">摄像头预览</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white/70 hover:text-white p-1 transition-colors"
              title={isMinimized ? '展开' : '最小化'}
            >
              {isMinimized ? (
                <Maximize2 className="w-3 h-3" />
              ) : (
                <Minimize2 className="w-3 h-3" />
              )}
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-white/70 hover:text-white p-1 transition-colors"
              title="关闭"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Video container - responsive */}
        {!isMinimized && (
          <div className="relative w-[200px] sm:w-[240px] md:w-[280px] aspect-[4/3] bg-black">
            {streamError ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                摄像头不可用
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            )}
            {/* Overlay indicator */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-christmas-red rounded-full animate-pulse" />
              <span className="text-[10px] text-white/80">LIVE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
