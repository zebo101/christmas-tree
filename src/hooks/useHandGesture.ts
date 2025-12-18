import { useState, useEffect, useRef, useCallback } from 'react';
import { GestureType, HandGestureState } from '@/types/christmas';

interface UseHandGestureOptions {
  enabled: boolean;
  onGestureChange?: (gesture: GestureType) => void;
}

export function useHandGesture({ enabled, onGestureChange }: UseHandGestureOptions) {
  const [state, setState] = useState<HandGestureState>({
    gesture: 'none',
    handPosition: null,
    pinchDistance: 1,
    isTracking: false,
  });
  const [status, setStatus] = useState<string>('idle');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<any>(null);
  const lastGestureRef = useRef<GestureType>('none');

  const calculateFingerDistance = useCallback((landmarks: any[], finger1: number, finger2: number) => {
    const p1 = landmarks[finger1];
    const p2 = landmarks[finger2];
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  }, []);

  const detectGesture = useCallback((landmarks: any[]): GestureType => {
    if (!landmarks || landmarks.length < 21) return 'none';

    // Finger tip indices: thumb=4, index=8, middle=12, ring=16, pinky=20
    // Finger MCP indices: thumb=2, index=5, middle=9, ring=13, pinky=17
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const ringMcp = landmarks[13];
    const pinkyMcp = landmarks[17];
    const wrist = landmarks[0];

    // Check pinch (thumb to index distance)
    const pinchDist = calculateFingerDistance(landmarks, 4, 8);
    if (pinchDist < 0.06) {
      return 'pinch';
    }

    // Check if fingers are extended (tip above MCP in y-axis, relative to wrist)
    const indexExtended = indexTip.y < indexMcp.y;
    const middleExtended = middleTip.y < middleMcp.y;
    const ringExtended = ringTip.y < ringMcp.y;
    const pinkyExtended = pinkyTip.y < pinkyMcp.y;

    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // Open palm: most fingers extended
    if (extendedCount >= 3) {
      return 'open';
    }

    // Fist: most fingers closed
    if (extendedCount <= 1) {
      return 'fist';
    }

    // Pointing: only index extended
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'pointing';
    }

    return 'none';
  }, [calculateFingerDistance]);

  const onResults = useCallback((results: any) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const gesture = detectGesture(landmarks);
      
      // Get palm center for hand position
      const palmCenter = landmarks[9]; // Middle finger MCP
      const handPosition = {
        x: 1 - palmCenter.x, // Mirror x-axis
        y: palmCenter.y,
      };

      // Calculate pinch distance
      const pinchDistance = calculateFingerDistance(landmarks, 4, 8);

      if (gesture !== lastGestureRef.current) {
        console.log('[Gesture] Detected gesture:', gesture);
        lastGestureRef.current = gesture;
        onGestureChange?.(gesture);
      }

      setState({
        gesture,
        handPosition,
        pinchDistance,
        isTracking: true,
      });
    } else {
      setState(prev => {
        if (prev.isTracking) {
          console.log('[Gesture] Hand lost');
        }
        return {
          ...prev,
          isTracking: false,
          handPosition: null,
        };
      });
    }
  }, [detectGesture, calculateFingerDistance, onGestureChange]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let animationFrameId: number | null = null;
    let stream: MediaStream | null = null;

    const initMediaPipe = async () => {
      try {
        setStatus('loading-mediapipe');
        console.log('[Gesture] Starting MediaPipe initialization...');
        
        // Load MediaPipe Hands from CDN via script tag to avoid bundling issues
        // Use multiple CDN sources with fallback for China users
        const loadScript = (src: string, timeout = 10000): Promise<void> => {
          return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve();
              return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            
            const timeoutId = setTimeout(() => {
              reject(new Error('Script load timeout'));
            }, timeout);
            
            script.onload = () => {
              clearTimeout(timeoutId);
              resolve();
            };
            script.onerror = () => {
              clearTimeout(timeoutId);
              reject(new Error('Script load failed'));
            };
            document.head.appendChild(script);
          });
        };

        // Try multiple CDN sources with China-friendly options first
        const cdnSources = [
          'https://cdn.bootcdn.net/ajax/libs/mediapipe/0.4.1675469240/hands.min.js', // China CDN (bootcdn)
          'https://cdn.staticfile.org/mediapipe/0.4.1675469240/hands.min.js', // China CDN (staticfile)
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
          'https://unpkg.com/@mediapipe/hands/hands.js',
        ];
        
        let loaded = false;
        for (const src of cdnSources) {
          if (!mounted) return;
          try {
            console.log('[Gesture] Trying CDN:', src);
            await loadScript(src, 8000);
            loaded = true;
            console.log('[Gesture] Successfully loaded from:', src);
            break;
          } catch (e) {
            console.warn('[Gesture] Failed to load from:', src, e);
          }
        }

        if (!loaded) {
          throw new Error('无法加载手势识别库，请检查网络连接');
        }

        if (!mounted) return;

        // Access the global Hands class
        const Hands = (window as any).Hands;
        if (!Hands) {
          throw new Error('MediaPipe Hands not loaded');
        }

        // Request camera access
        setStatus('requesting-camera');
        console.log('[Gesture] Requesting camera...');
        console.log('[Gesture] User Agent:', navigator.userAgent);
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported on this device/browser');
        }

        // Use more relaxed constraints for Android compatibility
        const isAndroid = /Android/i.test(navigator.userAgent);
        console.log('[Gesture] Is Android:', isAndroid);
        
        const constraints = {
          video: isAndroid 
            ? { facingMode: 'user' } // Simpler constraints for Android
            : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        };
        
        console.log('[Gesture] Camera constraints:', JSON.stringify(constraints));
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('[Gesture] Camera stream obtained, tracks:', stream.getVideoTracks().length);
          stream.getVideoTracks().forEach(track => {
            console.log('[Gesture] Video track settings:', JSON.stringify(track.getSettings()));
          });
        } catch (camError) {
          console.error('[Gesture] Camera error:', camError);
          throw new Error('Camera access failed: ' + (camError as Error).message);
        }

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        // Create video element with Android-compatible attributes
        const video = document.createElement('video');
        video.style.display = 'none';
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true'); // iOS/Android WebKit
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        document.body.appendChild(video);
        videoRef.current = video;

        console.log('[Gesture] Video element created, attempting to play...');
        
        try {
          await video.play();
        } catch (playError) {
          console.error('[Gesture] Video play error:', playError);
          throw new Error('Video playback failed: ' + (playError as Error).message);
        }
        
        // Wait for video to have actual dimensions
        let retries = 0;
        while ((video.videoWidth === 0 || video.videoHeight === 0) && retries < 30) {
          await new Promise(r => setTimeout(r, 100));
          retries++;
        }
        
        setStatus('initializing-hands');
        console.log('[Gesture] Video playing, dimensions:', video.videoWidth, 'x', video.videoHeight, 'readyState:', video.readyState);

        // Initialize Hands with China-friendly CDN fallback for model files
        const modelCdnSources = [
          'https://cdn.bootcdn.net/ajax/libs/mediapipe/0.4.1675469240',
          'https://cdn.staticfile.org/mediapipe/0.4.1675469240',
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        ];
        
        // Test which CDN works for model files
        let workingModelCdn = modelCdnSources[0];
        for (const cdn of modelCdnSources) {
          try {
            const testUrl = `${cdn}/hands_solution_packed_assets.data`;
            const response = await fetch(testUrl, { method: 'HEAD', mode: 'cors' });
            if (response.ok) {
              workingModelCdn = cdn;
              console.log('[Gesture] Using model CDN:', cdn);
              break;
            }
          } catch (e) {
            console.warn('[Gesture] Model CDN failed:', cdn);
          }
        }
        
        const hands = new Hands({
          locateFile: (file: string) => {
            return `${workingModelCdn}/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.3,
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        setStatus('processing-frames');
        console.log('[Gesture] MediaPipe Hands initialized');

        // Use requestAnimationFrame instead of MediaPipe Camera
        let lastTime = 0;
        const processFrame = async (currentTime: number) => {
          if (!mounted || !handsRef.current || !videoRef.current) return;
          
          // Process at ~30fps
          if (currentTime - lastTime > 33) {
            lastTime = currentTime;
            try {
              if (videoRef.current.readyState >= 2) {
                await handsRef.current.send({ image: videoRef.current });
              }
            } catch (e) {
              // Silently handle frame errors
            }
          }
          
          animationFrameId = requestAnimationFrame(processFrame);
        };

        console.log('[Gesture] Starting frame processing...');
        animationFrameId = requestAnimationFrame(processFrame);

      } catch (error) {
        console.error('[Gesture] MediaPipe initialization failed:', error);
        setStatus('error: ' + (error as Error).message);
        setState(prev => ({ ...prev, isTracking: false }));
      }
    };

    initMediaPipe();

    return () => {
      mounted = false;
      console.log('[Gesture] Cleaning up...');
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
      
      handsRef.current = null;
    };
  }, [enabled, onResults]);

  return { ...state, status };
}
