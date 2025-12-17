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
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
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

    const initMediaPipe = async () => {
      try {
        console.log('[Gesture] Starting MediaPipe initialization...');
        
        // Dynamically import MediaPipe
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!mounted) return;

        // Create video element
        const video = document.createElement('video');
        video.style.display = 'none';
        video.setAttribute('playsinline', 'true'); // Important for iOS
        video.setAttribute('autoplay', 'true');
        document.body.appendChild(video);
        videoRef.current = video;

        // Initialize Hands
        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,  // Lowered from 0.7
          minTrackingConfidence: 0.3,   // Lowered from 0.5
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        console.log('[Gesture] MediaPipe Hands initialized, starting camera...');

        // Initialize camera with explicit getUserMedia first
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            }
          });
          
          video.srcObject = stream;
          await video.play();
          
          console.log('[Gesture] Camera stream acquired successfully');

          // Use MediaPipe Camera for frame processing
          const camera = new Camera(video, {
            onFrame: async () => {
              if (handsRef.current && videoRef.current) {
                try {
                  await handsRef.current.send({ image: videoRef.current });
                } catch (e) {
                  // Silently handle frame errors
                }
              }
            },
            width: 640,
            height: 480,
          });

          cameraRef.current = camera;
          await camera.start();
          console.log('[Gesture] MediaPipe camera processing started');
        } catch (cameraError) {
          console.error('[Gesture] Camera access failed:', cameraError);
          // Update state to reflect the failure
          setState(prev => ({
            ...prev,
            isTracking: false,
          }));
        }
      } catch (error) {
        console.error('[Gesture] MediaPipe initialization failed:', error);
      }
    };

    initMediaPipe();

    return () => {
      mounted = false;
      console.log('[Gesture] Cleaning up...');
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        videoRef.current.remove();
      }
    };
  }, [enabled, onResults]);

  return state;
}
