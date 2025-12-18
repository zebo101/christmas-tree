import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

interface TreeStarProps {
  state: TreeState;
}

// Create a refined 5-pointed star shape with sharp, elegant points
function createStarShape(outerRadius: number, innerRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points = 5;
  
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

export function TreeStar({ state }: TreeStarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const raysRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // Create ultra-thin extruded star geometry - more refined proportions
  const starGeometry = useMemo(() => {
    const shape = createStarShape(0.28, 0.11); // Sharper, more elegant proportions
    const extrudeSettings = {
      depth: 0.015, // Much thinner
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 1,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Create subtle light rays
  const rayGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(0.02, 0.6);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    
    // Gentle, elegant rotation
    if (starRef.current) {
      starRef.current.rotation.z += delta * 0.15;
      starRef.current.rotation.y = Math.sin(timeRef.current * 0.3) * 0.1;
    }
    
    // Subtle pulsing glow
    const glowPulse = 0.9 + Math.sin(timeRef.current * 1.5) * 0.1;
    
    if (innerGlowRef.current) {
      innerGlowRef.current.scale.setScalar(glowPulse);
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state === 'tree' ? 0.3 * glowPulse : 0;
    }
    
    if (outerGlowRef.current) {
      const outerPulse = 1 + Math.sin(timeRef.current * 1.2 + 0.5) * 0.15;
      outerGlowRef.current.scale.setScalar(outerPulse);
      const mat = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state === 'tree' ? 0.15 * outerPulse : 0;
    }

    // Animate light rays
    if (raysRef.current) {
      raysRef.current.rotation.z -= delta * 0.08;
      raysRef.current.children.forEach((ray, i) => {
        const mesh = ray as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const rayPulse = 0.5 + Math.sin(timeRef.current * 2 + i * 0.8) * 0.5;
        mat.opacity = state === 'tree' ? 0.12 * rayPulse : 0;
      });
    }

    // Position based on state
    const targetY = state === 'tree' ? 4.5 : 10;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
    
    // Fade star material
    if (starRef.current) {
      const mat = starRef.current.material as THREE.MeshStandardMaterial;
      const targetOpacity = state === 'tree' ? 1 : 0;
      mat.opacity += (targetOpacity - mat.opacity) * 0.05;
    }
  });

  const isVisible = state === 'tree';

  return (
    <group ref={groupRef} position={[0, 4.5, 0]}>
      {/* Subtle light rays emanating from center */}
      <group ref={raysRef}>
        {[...Array(8)].map((_, i) => (
          <mesh 
            key={i} 
            geometry={rayGeometry}
            rotation={[0, 0, (i / 8) * Math.PI * 2]}
            position={[0, 0, -0.02]}
          >
            <meshBasicMaterial
              color="#fff8e0"
              transparent
              opacity={isVisible ? 0.1 : 0}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* Outer soft glow */}
      <mesh ref={outerGlowRef}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial
          color="#fff5d4"
          transparent
          opacity={isVisible ? 0.12 : 0}
          depthWrite={false}
        />
      </mesh>
      
      {/* Inner concentrated glow */}
      <mesh ref={innerGlowRef}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={isVisible ? 0.25 : 0}
          depthWrite={false}
        />
      </mesh>
      
      {/* Main refined 5-pointed star */}
      <mesh 
        ref={starRef} 
        geometry={starGeometry}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.008]}
      >
        <meshStandardMaterial
          color="#ffeaa0"
          emissive="#ffd700"
          emissiveIntensity={2}
          metalness={0.95}
          roughness={0.05}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}