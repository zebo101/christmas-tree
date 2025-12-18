import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { GestureIndicator } from '@/components/christmas/GestureIndicator';
import { AudioControl } from '@/components/christmas/AudioControl';
import { PhotoUpload } from '@/components/christmas/PhotoUpload';
import { InstructionsOverlay } from '@/components/christmas/InstructionsOverlay';
import { CameraDebug } from '@/components/christmas/CameraDebug';
import { LoadingScreen } from '@/components/christmas/LoadingScreen';
import { useHandGesture } from '@/hooks/useHandGesture';
import { useMouseFallback } from '@/hooks/useMouseFallback';
import { useChristmasAudio } from '@/hooks/useChristmasAudio';
import { TreeState, GestureType } from '@/types/christmas';

// Lazy load heavy 3D scene
const ChristmasScene = lazy(() => import('@/components/christmas/Scene').then(m => ({ default: m.ChristmasScene })));

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [treeState, setTreeState] = useState<TreeState>('tree');
  const [photos, setPhotos] = useState<string[]>([]);
  const [focusedPhotoIndex, setFocusedPhotoIndex] = useState<number | null>(null);
  const [orbitRotation, setOrbitRotation] = useState({ x: 0, y: 0 });
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [showInstructions, setShowInstructions] = useState(true);

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Mark as loaded when scene is ready
  const handleSceneReady = useCallback(() => {
    setLoadingProgress(100);
  }, []);

  // Audio hook
  const audio = useChristmasAudio();

  // Gesture handling
  const handleGestureChange = useCallback((gesture: GestureType) => {
    switch (gesture) {
      case 'fist':
        setTreeState('tree');
        setFocusedPhotoIndex(null);
        break;
      case 'open':
        setTreeState('galaxy');
        setFocusedPhotoIndex(null);
        break;
      case 'pinch':
        if (treeState === 'galaxy') {
          // Select random photo when pinching
          const photoCount = photos.length > 0 ? photos.length : 20;
          const randomIndex = Math.floor(Math.random() * Math.min(photoCount, 20));
          setFocusedPhotoIndex(randomIndex);
          setTreeState('focus');
        } else if (treeState === 'focus') {
          // Release focused photo
          setFocusedPhotoIndex(null);
          setTreeState('galaxy');
        }
        break;
    }
  }, [treeState, photos.length]);

  // Request camera permission - actually request it now
  const handleRequestCamera = useCallback(async () => {
    console.log('[Index] Requesting camera permission...');
    setCameraPermission('requesting');
    try {
      // Actually request camera permission from the browser
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      console.log('[Index] Camera permission granted!');
      // Keep the stream alive - MediaPipe will use it
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
    } catch (error) {
      console.error('[Index] Camera permission denied:', error);
      setCameraPermission('denied');
    }
  }, []);

  // Hand gesture hook
  const handGesture = useHandGesture({
    enabled: cameraPermission === 'granted',
    onGestureChange: handleGestureChange,
  });

  // Mouse fallback hook
  const mouseFallback = useMouseFallback({
    enabled: !handGesture.isTracking,
    currentState: treeState,
    onStateChange: setTreeState,
    onOrbitChange: setOrbitRotation,
  });

  // Update orbit from hand position
  useEffect(() => {
    if (handGesture.isTracking && handGesture.handPosition && treeState === 'galaxy') {
      setOrbitRotation({
        x: (handGesture.handPosition.y - 0.5) * Math.PI * 0.5,
        y: (handGesture.handPosition.x - 0.5) * Math.PI * 2,
      });
    }
  }, [handGesture.handPosition, handGesture.isTracking, treeState]);

  const handleDismissInstructions = useCallback(() => {
    setShowInstructions(false);
    // Auto-play music after dismissing instructions
    audio.play();
  }, [audio]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Loading Screen */}
      {!isLoaded && (
        <LoadingScreen 
          progress={loadingProgress} 
          onLoaded={() => setIsLoaded(true)} 
        />
      )}

      {/* 3D Scene - Lazy loaded with Suspense */}
      <Suspense fallback={null}>
        <ChristmasScene
          state={treeState}
          photos={photos}
          focusedPhotoIndex={focusedPhotoIndex}
          orbitRotation={orbitRotation}
          handPosition={handGesture.isTracking ? handGesture.handPosition : null}
          onReady={handleSceneReady}
        />
      </Suspense>

      {/* UI Overlays - only show after loaded */}
      {isLoaded && (
        <>
          <GestureIndicator
            gesture={handGesture.gesture}
            isTracking={handGesture.isTracking}
            usingMouse={!handGesture.isTracking}
            cameraPermission={cameraPermission}
            mediapipeStatus={handGesture.status}
            onRequestCamera={handleRequestCamera}
          />

          <AudioControl
            isPlaying={audio.isPlaying}
            isMuted={audio.isMuted}
            onToggle={audio.toggle}
            onMuteToggle={audio.toggleMute}
          />

          <PhotoUpload
            photos={photos}
            onPhotosChange={setPhotos}
          />

          {/* Camera Debug Preview */}
          <CameraDebug enabled={cameraPermission === 'granted'} />

          {/* Instructions Overlay */}
          {showInstructions && (
            <InstructionsOverlay onDismiss={handleDismissInstructions} />
          )}

          {/* State indicator */}
          <div className="absolute top-4 right-4 z-10">
            <div className="glass rounded-full px-4 py-2 text-sm text-muted-foreground">
              {treeState === 'tree' && '🎄 Tree Mode'}
              {treeState === 'galaxy' && '✨ Galaxy Mode'}
              {treeState === 'focus' && '📸 Photo Focus'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
