import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

interface TreeStarProps {
  state: TreeState;
}

export function TreeStar({ state }: TreeStarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    
    // Rotate the star
    meshRef.current.rotation.y += delta * 0.5;
    meshRef.current.rotation.z = Math.sin(timeRef.current) * 0.1;
    
    // Pulsing glow
    if (glowRef.current) {
      const pulse = 1 + Math.sin(timeRef.current * 2) * 0.2;
      glowRef.current.scale.setScalar(pulse);
    }

    // Position based on state
    const targetY = state === 'tree' ? 4.5 : 0;
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.05;
    
    // Hide in galaxy mode
    const targetOpacity = state === 'tree' ? 1 : 0;
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.opacity += (targetOpacity - material.opacity) * 0.05;
  });

  return (
    <group>
      {/* Main star */}
      <mesh ref={meshRef} position={[0, 4.5, 0]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={2}
          metalness={1}
          roughness={0.1}
          transparent
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh ref={glowRef} position={[0, 4.5, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
