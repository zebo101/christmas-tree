import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

interface TreeStarProps {
  state: TreeState;
}

// Create a delicate, thin 5-pointed star shape
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

// Dynamic flying sparkles with trail effect
function FlyingSparkles({ visible }: { visible: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const sparkleCount = 60;
  
  const { positions, colors, sparkleData } = useMemo(() => {
    const positions = new Float32Array(sparkleCount * 3);
    const colors = new Float32Array(sparkleCount * 3);
    const data: Array<{
      orbitRadius: number;
      orbitSpeed: number;
      verticalSpeed: number;
      phase: number;
      amplitude: number;
      spiralFactor: number;
    }> = [];
    
    for (let i = 0; i < sparkleCount; i++) {
      // Initial positions around the star
      const angle = (i / sparkleCount) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.5;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Gold and white sparkles
      const isGold = Math.random() > 0.3;
      if (isGold) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.84 + Math.random() * 0.16;
        colors[i * 3 + 2] = 0;
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      }
      
      data.push({
        orbitRadius: 0.4 + Math.random() * 0.8,
        orbitSpeed: 0.8 + Math.random() * 1.5,
        verticalSpeed: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.3 + Math.random() * 0.5,
        spiralFactor: Math.random() > 0.5 ? 1 : -1,
      });
    }
    
    return { positions, colors, sparkleData: data };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || !visible) return;
    
    timeRef.current += delta;
    const t = timeRef.current;
    const posArray = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    
    for (let i = 0; i < sparkleCount; i++) {
      const s = sparkleData[i];
      
      // Complex flying motion: spiral + oscillation + vertical wave
      const angle = s.phase + t * s.orbitSpeed * s.spiralFactor;
      const radiusPulse = s.orbitRadius + Math.sin(t * 2 + s.phase) * 0.2;
      
      // Spiral outward and back
      const spiralOffset = Math.sin(t * 0.5 + s.phase) * 0.3;
      const currentRadius = radiusPulse + spiralOffset;
      
      posArray[i * 3] = Math.cos(angle) * currentRadius;
      posArray[i * 3 + 1] = Math.sin(t * s.verticalSpeed + s.phase) * s.amplitude;
      posArray[i * 3 + 2] = Math.sin(angle) * currentRadius;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={sparkleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={sparkleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={visible ? 1 : 0}
        sizeAttenuation
        toneMapped={false}
        depthWrite={false}
      />
    </points>
  );
}

// Larger orbiting sparkle gems
function OrbitingGems({ visible }: { visible: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef(false);
  const gemCount = 12;
  
  const colors = useMemo(() => ({
    gold: new THREE.Color('#ffd700'),
    white: new THREE.Color('#ffffff'),
    warmWhite: new THREE.Color('#fff8e0'),
  }), []);
  
  const gemData = useMemo(() => {
    return Array.from({ length: gemCount }, (_, i) => ({
      orbitAngle: (i / gemCount) * Math.PI * 2,
      orbitRadius: 0.6 + (i % 3) * 0.25,
      orbitSpeed: 0.4 + Math.random() * 0.3,
      verticalOffset: (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
      scale: 0.04 + Math.random() * 0.03,
      colorType: i % 3,
    }));
  }, []);

  useEffect(() => {
    if (!meshRef.current || colorsSetRef.current) return;
    gemData.forEach((gem, i) => {
      const color = gem.colorType === 0 ? colors.gold : gem.colorType === 1 ? colors.white : colors.warmWhite;
      meshRef.current!.setColorAt(i, color);
    });
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    colorsSetRef.current = true;
  }, [gemData, colors]);

  useFrame((_, delta) => {
    if (!meshRef.current || !visible) return;
    
    timeRef.current += delta;
    const t = timeRef.current;
    
    gemData.forEach((gem, i) => {
      const angle = gem.orbitAngle + t * gem.orbitSpeed;
      const pulseRadius = gem.orbitRadius + Math.sin(t * 2 + gem.phase) * 0.1;
      
      dummy.position.set(
        Math.cos(angle) * pulseRadius,
        gem.verticalOffset + Math.sin(t * 1.5 + gem.phase) * 0.2,
        Math.sin(angle) * pulseRadius
      );
      
      const pulseScale = gem.scale * (0.8 + Math.sin(t * 3 + gem.phase) * 0.4);
      dummy.scale.setScalar(pulseScale);
      dummy.rotation.set(t * 2, t * 3, t);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, gemCount]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={visible ? 1 : 0} />
    </instancedMesh>
  );
}

export function TreeStar({ state }: TreeStarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const midGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Create ultra-thin extruded star geometry
  const starGeometry = useMemo(() => {
    const shape = createStarShape(0.4, 0.16); // Wider, more delicate
    const extrudeSettings = {
      depth: 0.015, // Ultra thin
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 1,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    const t = timeRef.current;
    
    // Elegant star rotation
    if (starRef.current) {
      starRef.current.rotation.z += delta * 0.25;
      starRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
    }
    
    // Multi-layer pulsing glow
    if (innerGlowRef.current) {
      const pulse1 = 1 + Math.sin(t * 3) * 0.2;
      innerGlowRef.current.scale.setScalar(pulse1);
    }
    
    if (midGlowRef.current) {
      const pulse2 = 1 + Math.sin(t * 2 + 0.5) * 0.15;
      midGlowRef.current.scale.setScalar(pulse2);
    }
    
    if (outerGlowRef.current) {
      const pulse3 = 1 + Math.sin(t * 1.5 + 1) * 0.1;
      outerGlowRef.current.scale.setScalar(pulse3);
    }
    
    if (haloRef.current) {
      const haloPulse = 1.1 + Math.sin(t * 1.2) * 0.15;
      haloRef.current.scale.setScalar(haloPulse);
      haloRef.current.rotation.z -= delta * 0.15;
    }

    // Position based on state
    const targetY = state === 'tree' ? 4.5 : 12;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.03;
    
    // Fade materials
    if (starRef.current) {
      const mat = starRef.current.material as THREE.MeshStandardMaterial;
      const targetOpacity = state === 'tree' ? 1 : 0;
      mat.opacity += (targetOpacity - mat.opacity) * 0.05;
    }
  });

  const isVisible = state === 'tree';

  return (
    <group ref={groupRef} position={[0, 4.5, 0]}>
      {/* Main delicate 5-pointed star */}
      <mesh 
        ref={starRef} 
        geometry={starGeometry}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.008]}
      >
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffcc00"
          emissiveIntensity={5}
          metalness={1}
          roughness={0}
          transparent
          opacity={1}
        />
      </mesh>
      
      {/* Inner intense glow */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial
          color="#fffaf0"
          transparent
          opacity={isVisible ? 0.6 : 0}
          depthWrite={false}
        />
      </mesh>
      
      {/* Mid glow layer */}
      <mesh ref={midGlowRef}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={isVisible ? 0.35 : 0}
          depthWrite={false}
        />
      </mesh>
      
      {/* Outer soft glow */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={isVisible ? 0.15 : 0}
          depthWrite={false}
        />
      </mesh>
      
      {/* Halo ring */}
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.0, 48]} />
        <meshBasicMaterial
          color="#fff8dc"
          transparent
          opacity={isVisible ? 0.2 : 0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Dynamic flying sparkle particles */}
      <FlyingSparkles visible={isVisible} />
      
      {/* Orbiting gem sparkles */}
      <OrbitingGems visible={isVisible} />
    </group>
  );
}