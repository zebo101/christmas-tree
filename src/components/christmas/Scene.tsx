import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleSystem, GiftBoxes, GemOrnaments, TetrahedronSpiral } from './ParticleSystem';
import { PhotoCards } from './PhotoCards';
import { TreeStar } from './TreeStar';
import { SnowEffect } from './SnowEffect';
import { TreeState } from '@/types/christmas';

interface SceneContentProps {
  state: TreeState;
  photos: string[];
  focusedPhotoIndex: number | null;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
  onStarFocusChange?: (focused: boolean) => void;
}

function CameraController({ 
  state, 
  orbitRotation,
  handPosition,
  onStarFocused,
}: { 
  state: TreeState;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
  onStarFocused?: (focused: boolean) => void;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const positionRef = useRef(new THREE.Vector3(0, 2, 12));
  const ribbonTimeRef = useRef(0);
  const prevStateRef = useRef<TreeState>(state);
  const transitionDelayRef = useRef(0);
  const isAtStarRef = useRef(false);

  useFrame((_, delta) => {
    // Detect state change to tree (pinch gesture completed)
    if (state === 'tree' && prevStateRef.current !== 'tree') {
      // Wait for tree to assemble before starting ribbon follow
      transitionDelayRef.current = 2.0; // 2 second delay for assembly
      ribbonTimeRef.current = 0;
      isAtStarRef.current = false;
      onStarFocused?.(false);
    }
    
    // Reset when leaving tree state
    if (state !== 'tree' && prevStateRef.current === 'tree') {
      isAtStarRef.current = false;
      onStarFocused?.(false);
    }
    prevStateRef.current = state;

    // Handle transition delay
    if (transitionDelayRef.current > 0) {
      transitionDelayRef.current -= delta;
    }

    // Base camera distance
    const baseDistance = state === 'tree' ? 12 : 18;
    
    let targetX = 0;
    let targetY = 2;
    let targetZ = baseDistance;
    let lookAtY = 0;
    
    if (state === 'tree' && transitionDelayRef.current <= 0) {
      if (!isAtStarRef.current) {
        // Ribbon follow mode - camera spirals from bottom to top following the ribbon
        ribbonTimeRef.current += delta * 0.1; // Slower for silkier feel
        
        // Check if reached the top (t >= 1)
        if (ribbonTimeRef.current >= 1) {
          isAtStarRef.current = true;
          onStarFocused?.(true);
          ribbonTimeRef.current = 1;
        }
        
        // Apply easeInOutCubic for silky smooth progression
        const rawT = Math.min(ribbonTimeRef.current, 1);
        const t = rawT < 0.5 
          ? 4 * rawT * rawT * rawT 
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
        
        // Match ribbon spiral parameters from TetrahedronSpiral
        const height = 7;
        const maxRadius = 3.0;
        const ribbonY = t * height - height / 2 + 0.3;
        const layerRadius = maxRadius * (1 - t * 0.88) + 0.15;
        const angle = t * Math.PI * 6; // 3 full spirals
        
        // Position camera outside the ribbon, looking at the ribbon point
        const cameraDistance = 5 + layerRadius * 1.5;
        const cameraAngle = angle + Math.PI * 0.3; // Slightly ahead of ribbon
        
        targetX = Math.cos(cameraAngle) * cameraDistance;
        targetY = ribbonY + 1.5; // Slightly above the ribbon point
        targetZ = Math.sin(cameraAngle) * cameraDistance;
        lookAtY = ribbonY;
      } else {
        // Focused on star - stay looking at the tree top
        const starY = 4.4;
        targetX = 0;
        targetY = starY + 1;
        targetZ = 6;
        lookAtY = starY;
      }
    } else if (handPosition && state === 'galaxy') {
      targetX = (handPosition.x - 0.5) * 20;
      targetY = (0.5 - handPosition.y) * 10 + 2;
      targetZ = Math.cos(orbitRotation.y) * baseDistance;
    } else {
      targetX = Math.sin(orbitRotation.y) * baseDistance;
      targetY = Math.sin(orbitRotation.x) * 5 + 2;
      targetZ = Math.cos(orbitRotation.y) * baseDistance;
    }
    
    // Frame-rate independent smooth camera movement (silkier lerp)
    const smoothFactor = 1 - Math.exp(-1.8 * delta);
    
    positionRef.current.x += (targetX - positionRef.current.x) * smoothFactor;
    positionRef.current.y += (targetY - positionRef.current.y) * smoothFactor;
    positionRef.current.z += (targetZ - positionRef.current.z) * smoothFactor;
    
    // Smooth look-at target
    targetRef.current.y += (lookAtY - targetRef.current.y) * smoothFactor;
    
    camera.position.copy(positionRef.current);
    camera.lookAt(targetRef.current);
  });

  return null;
}

function SceneContent({ 
  state, 
  photos, 
  focusedPhotoIndex,
  orbitRotation,
  handPosition,
  onStarFocusChange,
}: SceneContentProps) {
  const [isStarFocused, setIsStarFocused] = useState(false);

  const handleStarFocused = (focused: boolean) => {
    setIsStarFocused(focused);
    onStarFocusChange?.(focused);
  };

  return (
    <>
      <CameraController 
        state={state} 
        orbitRotation={orbitRotation}
        handPosition={handPosition}
        onStarFocused={handleStarFocused}
      />
      
      {/* 
        Remove Environment component entirely - it loads HDR from raw.githack.com which is blocked in China.
        Use enhanced lighting instead for reflections.
      */}
      
      {/* Simplified lighting - fewer point lights for better performance */}
      <ambientLight intensity={0.2} />
      
      {/* Single main spotlight */}
      <spotLight 
        position={[0, 12, 5]} 
        angle={0.6}
        penumbra={0.8}
        intensity={2.5}
        color="#fff8e8"
      />
      
      {/* Single colored accent light */}
      <pointLight position={[0, -2, 0]} intensity={1.2} color="#ff6633" distance={12} />
      
      {/* Background stars - reduced count for performance */}
      <Stars 
        radius={100} 
        depth={50} 
        count={2000} 
        factor={4} 
        saturation={0.5} 
        fade 
        speed={0.3}
      />
      
      {/* Main particle system */}
      <ParticleSystem state={state} particleCount={4000} />
      
      {/* Christmas gift boxes */}
      <GiftBoxes state={state} />
      
      {/* Gem ornaments (cubes & icosahedrons) */}
      <GemOrnaments state={state} />
      
      {/* Tetrahedron spiral ribbon */}
      <TetrahedronSpiral state={state} />
      
      {/* Photo cards */}
      <PhotoCards 
        state={state} 
        photos={photos}
        focusedIndex={focusedPhotoIndex}
      />
      
      {/* Tree star topper */}
      <TreeStar state={state} isFocused={isStarFocused} />
      
      {/* Snow effect - activates when star is focused */}
      <SnowEffect active={isStarFocused} />
      
      {/* Post-processing effects - enhanced glow */}
      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.85}
          luminanceSmoothing={0.2}
          intensity={1.5}
          mipmapBlur
        />
        <Vignette
          offset={0.2}
          darkness={0.6}
        />
      </EffectComposer>
    </>
  );
}

interface ChristmasSceneProps {
  state: TreeState;
  photos: string[];
  focusedPhotoIndex: number | null;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
  onReady?: () => void;
}

export function ChristmasScene({ 
  state, 
  photos, 
  focusedPhotoIndex,
  orbitRotation,
  handPosition,
  onReady,
}: ChristmasSceneProps) {
  // Call onReady after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      onReady?.();
    }, 500);
    return () => clearTimeout(timer);
  }, [onReady]);
  return (
    <Canvas
      camera={{ position: [0, 2, 12], fov: 60 }}
      gl={{ 
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      dpr={[1, 1.5]}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1a0a28 50%, #0a1628 100%)' }}
    >
      <color attach="background" args={['#0a1628']} />
      <fog attach="fog" args={['#0a1628', 15, 35]} />
      
      <SceneContent 
        state={state}
        photos={photos}
        focusedPhotoIndex={focusedPhotoIndex}
        orbitRotation={orbitRotation}
        handPosition={handPosition}
      />
    </Canvas>
  );
}
