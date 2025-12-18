import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleSystem, GemOrnaments, TetrahedronSpiral } from './ParticleSystem';
import { PhotoCards } from './PhotoCards';
import { TreeStar } from './TreeStar';
import { TreeState } from '@/types/christmas';

interface SceneContentProps {
  state: TreeState;
  photos: string[];
  focusedPhotoIndex: number | null;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
}

function CameraController({ 
  state, 
  orbitRotation,
  handPosition,
}: { 
  state: TreeState;
  orbitRotation: { x: number; y: number };
  handPosition: { x: number; y: number } | null;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const positionRef = useRef(new THREE.Vector3(0, 2, 12));

  useFrame(() => {
    // Base camera distance
    const baseDistance = state === 'tree' ? 12 : 18;
    
    // Calculate target position based on hand or orbit
    let targetX = 0;
    let targetY = 2;
    
    if (handPosition && state === 'galaxy') {
      targetX = (handPosition.x - 0.5) * 20;
      targetY = (0.5 - handPosition.y) * 10 + 2;
    } else {
      targetX = Math.sin(orbitRotation.y) * baseDistance;
      targetY = Math.sin(orbitRotation.x) * 5 + 2;
    }
    
    const targetZ = Math.cos(orbitRotation.y) * baseDistance;
    
    // Smooth camera movement
    positionRef.current.x += (targetX - positionRef.current.x) * 0.02;
    positionRef.current.y += (targetY - positionRef.current.y) * 0.02;
    positionRef.current.z += (targetZ - positionRef.current.z) * 0.02;
    
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
}: SceneContentProps) {
  return (
    <>
      <CameraController 
        state={state} 
        orbitRotation={orbitRotation}
        handPosition={handPosition}
      />
      
      {/* Environment for reflections */}
      <Environment preset="city" />
      
      {/* Ambient lighting - subtle */}
      <ambientLight intensity={0.15} />
      
      {/* Main spotlight from top */}
      <spotLight 
        position={[0, 12, 5]} 
        angle={0.5}
        penumbra={0.8}
        intensity={2}
        color="#fff8e8"
        castShadow
      />
      
      {/* Secondary spotlight */}
      <spotLight 
        position={[-5, 8, -3]} 
        angle={0.4}
        penumbra={0.6}
        intensity={1.2}
        color="#ffccaa"
      />
      
      {/* Bottom ground lights - simulating floor uplighting */}
      <pointLight position={[0, -3, 0]} intensity={1.5} color="#ff6633" distance={10} />
      <pointLight position={[-3, -2.5, 2]} intensity={0.8} color="#22ff66" distance={8} />
      <pointLight position={[3, -2.5, -2]} intensity={0.8} color="#ff2244" distance={8} />
      
      {/* Background stars */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0.5} 
        fade 
        speed={0.5}
      />
      
      {/* Main particle system */}
      <ParticleSystem state={state} particleCount={4000} />
      
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
      <TreeStar state={state} />
      
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
}

export function ChristmasScene({ 
  state, 
  photos, 
  focusedPhotoIndex,
  orbitRotation,
  handPosition,
}: ChristmasSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 12], fov: 60 }}
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
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
