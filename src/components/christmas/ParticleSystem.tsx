import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { TreeState } from '@/types/christmas';

interface ParticleSystemProps {
  state: TreeState;
  particleCount?: number;
}

// Generate spiral tree positions
function generateTreePosition(index: number, total: number): [number, number, number] {
  const height = 8;
  const maxRadius = 3;
  
  // Distribute along height
  const t = index / total;
  const y = t * height - height / 2;
  
  // Spiral pattern with decreasing radius
  const radius = maxRadius * (1 - t * 0.9) * (0.5 + Math.random() * 0.5);
  const angle = t * Math.PI * 12 + (index % 5) * Math.PI * 0.4;
  
  const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.3;
  const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.3;
  
  return [x, y, z];
}

// Generate galaxy positions
function generateGalaxyPosition(): [number, number, number] {
  const radius = 5 + Math.random() * 10;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.5,
    radius * Math.cos(phi),
  ];
}

export function ParticleSystem({ state, particleCount = 2500 }: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  
  // Generate particle data
  const particleData = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const treePos = generateTreePosition(i, particleCount);
      const galaxyPos = generateGalaxyPosition();
      
// Classic Christmas: 50% green, 35% red, 10% gold, 5% white
      const colorRand = Math.random();
      let color: THREE.Color;
      
      if (colorRand < 0.50) {
        // Rich Christmas GREEN - primary color
        const hue = 0.33 + Math.random() * 0.05; // Green hue range
        color = new THREE.Color().setHSL(hue, 0.85 + Math.random() * 0.15, 0.35 + Math.random() * 0.15);
      } else if (colorRand < 0.85) {
        // Vibrant Christmas RED
        color = new THREE.Color().setHSL(0, 0.9 + Math.random() * 0.1, 0.45 + Math.random() * 0.1);
      } else if (colorRand < 0.95) {
        // Sparkling gold accents
        color = new THREE.Color().setHSL(0.12 + Math.random() * 0.03, 1, 0.55 + Math.random() * 0.15);
      } else {
        // White twinkles
        color = new THREE.Color().setHSL(0, 0, 0.95 + Math.random() * 0.05);
      }
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        currentPosition: [...treePos] as [number, number, number],
        color,
        scale: 0.03 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      };
    });
  }, [particleCount]);

  // Store current positions for animation
  const positionsRef = useRef(particleData.map(p => [...p.treePosition]));

  // Animate to new state
  useEffect(() => {
    const targetPositions = state === 'tree' 
      ? particleData.map(p => p.treePosition)
      : particleData.map(p => p.galaxyPosition);

    // Animate each particle position
    positionsRef.current.forEach((pos, i) => {
      gsap.to(pos, {
        0: targetPositions[i][0],
        1: targetPositions[i][1],
        2: targetPositions[i][2],
        duration: 1.5 + Math.random() * 0.5,
        ease: state === 'tree' ? 'power2.inOut' : 'power2.out',
        delay: Math.random() * 0.3,
      });
    });
  }, [state, particleData]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    
    particleData.forEach((particle, i) => {
      const pos = positionsRef.current[i];
      
      // Breathing/floating animation
      const breathe = Math.sin(timeRef.current * particle.speed + particle.phase) * 0.05;
      
      dummy.position.set(
        pos[0],
        pos[1] + breathe,
        pos[2]
      );
      
      // Slight rotation for sparkle effect
      dummy.rotation.y = timeRef.current * 0.5 + particle.phase;
      dummy.rotation.x = Math.sin(timeRef.current * 0.3 + particle.phase) * 0.2;
      
      // Pulsing scale
      const scalePulse = 1 + Math.sin(timeRef.current * 2 + particle.phase) * 0.1;
      dummy.scale.setScalar(particle.scale * scalePulse);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, particle.color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        metalness={0.3}
        roughness={0.2}
        emissive={new THREE.Color('#ff4444')}
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
