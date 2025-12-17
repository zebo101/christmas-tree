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
      
      // Color distribution: 60% green, 25% gold, 15% red
      const colorRand = Math.random();
      let color: THREE.Color;
      if (colorRand < 0.6) {
        color = new THREE.Color().setHSL(0.36, 0.5 + Math.random() * 0.3, 0.25 + Math.random() * 0.15);
      } else if (colorRand < 0.85) {
        color = new THREE.Color().setHSL(0.125, 0.8 + Math.random() * 0.2, 0.5 + Math.random() * 0.1);
      } else {
        color = new THREE.Color().setHSL(0, 0.7 + Math.random() * 0.2, 0.4 + Math.random() * 0.1);
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
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        metalness={0.8}
        roughness={0.2}
        emissive={new THREE.Color('#ffffff')}
        emissiveIntensity={0.3}
      />
    </instancedMesh>
  );
}
