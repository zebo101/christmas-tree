import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

interface TreeStarProps {
  state: TreeState;
}

// Create a 5-pointed star shape
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

// Sparkle particles around the star
function StarSparkles({ visible }: { visible: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const sparkleCount = 30;
  
  const sparkleData = useMemo(() => {
    return Array.from({ length: sparkleCount }, (_, i) => ({
      angle: (i / sparkleCount) * Math.PI * 2,
      radius: 0.4 + Math.random() * 0.8,
      speed: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 0.6,
      scale: 0.02 + Math.random() * 0.03,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current || !visible) return;
    
    timeRef.current += delta;
    const gold = new THREE.Color('#ffd700');
    const white = new THREE.Color('#ffffff');
    
    sparkleData.forEach((sparkle, i) => {
      const t = timeRef.current * sparkle.speed + sparkle.phase;
      const currentAngle = sparkle.angle + t * 0.5;
      const pulseRadius = sparkle.radius + Math.sin(t * 2) * 0.2;
      
      const x = Math.cos(currentAngle) * pulseRadius;
      const y = sparkle.yOffset + Math.sin(t * 3) * 0.15;
      const z = Math.sin(currentAngle) * pulseRadius;
      
      dummy.position.set(x, 4.5 + y, z);
      
      const pulseScale = sparkle.scale * (0.5 + Math.abs(Math.sin(t * 4)) * 0.5);
      dummy.scale.setScalar(pulseScale);
      dummy.rotation.set(t, t * 1.5, t * 0.7);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      const color = i % 3 === 0 ? white : gold;
      meshRef.current!.setColorAt(i, color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, sparkleCount]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={visible ? 1 : 0} />
    </instancedMesh>
  );
}

export function TreeStar({ state }: TreeStarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Create thin extruded star geometry
  const starGeometry = useMemo(() => {
    const shape = createStarShape(0.35, 0.14);
    const extrudeSettings = {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    
    // Rotate the star elegantly
    if (starRef.current) {
      starRef.current.rotation.z += delta * 0.3;
      starRef.current.rotation.y = Math.sin(timeRef.current * 0.5) * 0.2;
    }
    
    // Pulsing glow halos
    if (glowRef.current) {
      const pulse = 1 + Math.sin(timeRef.current * 2) * 0.15;
      glowRef.current.scale.setScalar(pulse);
    }
    
    if (haloRef.current) {
      const pulse2 = 1.2 + Math.sin(timeRef.current * 1.5 + 1) * 0.2;
      haloRef.current.scale.setScalar(pulse2);
      haloRef.current.rotation.z -= delta * 0.2;
    }

    // Position based on state
    const targetY = state === 'tree' ? 4.5 : 10;
    const targetOpacity = state === 'tree' ? 1 : 0;
    
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
    
    // Fade materials
    if (starRef.current) {
      const mat = starRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * 0.05;
    }
  });

  const isVisible = state === 'tree';

  return (
    <group ref={groupRef} position={[0, 4.5, 0]}>
      {/* Main 5-pointed star */}
      <mesh 
        ref={starRef} 
        geometry={starGeometry}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.015]}
      >
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffaa00"
          emissiveIntensity={3}
          metalness={1}
          roughness={0.1}
          transparent
          opacity={1}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={isVisible ? 0.4 : 0}
          depthWrite={false}
        />
      </mesh>
      
      {/* Outer halo ring */}
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial
          color="#ffee88"
          transparent
          opacity={isVisible ? 0.25 : 0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Dynamic sparkles */}
      <StarSparkles visible={isVisible} />
    </group>
  );
}