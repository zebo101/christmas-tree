import { useState, useCallback, useEffect } from 'react';
import { ChristmasScene } from '@/components/christmas/Scene';
import { GestureIndicator } from '@/components/christmas/GestureIndicator';
import { AudioControl } from '@/components/christmas/AudioControl';
import { PhotoUpload } from '@/components/christmas/PhotoUpload';
import { InstructionsOverlay } from '@/components/christmas/InstructionsOverlay';
import { useHandGesture } from '@/hooks/useHandGesture';
import { useMouseFallback } from '@/hooks/useMouseFallback';
import { useChristmasAudio } from '@/hooks/useChristmasAudio';
import { TreeState, GestureType } from '@/types/christmas';

const Index = () => {
  const [treeState, setTreeState] = useState<TreeState>('tree');
  const [photos, setPhotos] = useState<string[]>([]);
  const [focusedPhotoIndex, setFocusedPhotoIndex] = useState<number | null>(null);
  const [orbitRotation, setOrbitRotation] = useState({ x: 0, y: 0 });
  const [useCamera, setUseCamera] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);

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

  // Hand gesture hook
  const handGesture = useHandGesture({
    enabled: useCamera,
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
      {/* 3D Scene */}
      <ChristmasScene
        state={treeState}
        photos={photos}
        focusedPhotoIndex={focusedPhotoIndex}
        orbitRotation={orbitRotation}
        handPosition={handGesture.isTracking ? handGesture.handPosition : null}
      />

      {/* UI Overlays */}
      <GestureIndicator
        gesture={handGesture.gesture}
        isTracking={handGesture.isTracking}
        usingMouse={!handGesture.isTracking}
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
    </div>
  );
};

export default Index;
