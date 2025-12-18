import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { TreeState } from '@/types/christmas';

interface ParticleSystemProps {
  state: TreeState;
  particleCount?: number;
}

// Generate cone-shaped tree positions (more traditional Christmas tree shape)
function generateTreePosition(index: number, total: number): [number, number, number] {
  const height = 8;
  const maxRadius = 3.5;
  
  // Distribute along height with more density at bottom
  const t = Math.pow(index / total, 0.8);
  const y = t * height - height / 2;
  
  // Perfect cone shape with slight randomness for natural look
  const layerRadius = maxRadius * (1 - t * 0.95);
  const angle = Math.random() * Math.PI * 2;
  const radiusVariation = 0.7 + Math.random() * 0.3;
  const radius = layerRadius * radiusVariation;
  
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
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

// Generate ornament positions on the tree
function generateOrnamentPosition(index: number, total: number): [number, number, number] {
  const height = 7;
  const maxRadius = 3.2;
  
  const t = (index + 0.5) / total;
  const y = t * height - height / 2;
  const layerRadius = maxRadius * (1 - t * 0.9);
  const angle = index * Math.PI * 2.4 + Math.random() * 0.5;
  
  return [
    Math.cos(angle) * layerRadius * 0.85,
    y,
    Math.sin(angle) * layerRadius * 0.85,
  ];
}

// Generate ribbon/garland spiral positions
function generateRibbonPosition(index: number, total: number): [number, number, number] {
  const height = 7.5;
  const maxRadius = 3.3;
  
  const t = index / total;
  const y = t * height - height / 2;
  const layerRadius = maxRadius * (1 - t * 0.92);
  const angle = t * Math.PI * 8; // 4 full spirals
  
  return [
    Math.cos(angle) * layerRadius,
    y,
    Math.sin(angle) * layerRadius,
  ];
}

// Main tree particles (green sparkles/snow effect)
export function ParticleSystem({ state, particleCount = 4000 }: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  
  const particleData = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const treePos = generateTreePosition(i, particleCount);
      const galaxyPos = generateGalaxyPosition();
      
      // 85% green for tree body, 15% white sparkles
      const colorRand = Math.random();
      let color: THREE.Color;
      
      if (colorRand < 0.85) {
        // Rich Christmas GREEN - varying shades
        const hue = 0.33 + Math.random() * 0.05;
        const saturation = 0.7 + Math.random() * 0.3;
        const lightness = 0.25 + Math.random() * 0.2;
        color = new THREE.Color().setHSL(hue, saturation, lightness);
      } else {
        // White/silver sparkles
        color = new THREE.Color().setHSL(0, 0, 0.9 + Math.random() * 0.1);
      }
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        currentPosition: [...treePos] as [number, number, number],
        color,
        scale: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      };
    });
  }, [particleCount]);

  const positionsRef = useRef(particleData.map(p => [...p.treePosition]));

  useEffect(() => {
    const targetPositions = state === 'tree' 
      ? particleData.map(p => p.treePosition)
      : particleData.map(p => p.galaxyPosition);

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
      
      const breathe = Math.sin(timeRef.current * particle.speed + particle.phase) * 0.03;
      
      dummy.position.set(pos[0], pos[1] + breathe, pos[2]);
      dummy.rotation.y = timeRef.current * 0.5 + particle.phase;
      
      const scalePulse = 1 + Math.sin(timeRef.current * 3 + particle.phase) * 0.15;
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
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// Gem-like cubes and icosahedrons (high reflective)
export function GemOrnaments({ state }: { state: TreeState }) {
  const cubeRef = useRef<THREE.InstancedMesh>(null);
  const icoRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const cubeCount = 25;
  const icoCount = 20;
  
  const cubeData = useMemo(() => {
    return Array.from({ length: cubeCount }, (_, i) => {
      const treePos = generateOrnamentPosition(i, cubeCount);
      const galaxyPos = generateGalaxyPosition();
      // White/light purple colors for gem effect
      const hue = Math.random() > 0.5 ? 0.75 + Math.random() * 0.1 : 0; // Purple or white
      const color = new THREE.Color().setHSL(hue, hue > 0 ? 0.4 : 0, 0.85 + Math.random() * 0.15);
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        color,
        scale: 0.08 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: 0.3 + Math.random() * 0.5,
      };
    });
  }, []);
  
  const icoData = useMemo(() => {
    return Array.from({ length: icoCount }, (_, i) => {
      const treePos = generateOrnamentPosition(i + cubeCount, icoCount + cubeCount);
      const galaxyPos = generateGalaxyPosition();
      const hue = Math.random() > 0.5 ? 0.78 + Math.random() * 0.05 : 0;
      const color = new THREE.Color().setHSL(hue, hue > 0 ? 0.5 : 0, 0.8 + Math.random() * 0.2);
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        color,
        scale: 0.1 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: 0.2 + Math.random() * 0.4,
      };
    });
  }, []);

  const cubePositionsRef = useRef(cubeData.map(p => [...p.treePosition]));
  const icoPositionsRef = useRef(icoData.map(p => [...p.treePosition]));

  useEffect(() => {
    const cubeTgt = state === 'tree' ? cubeData.map(p => p.treePosition) : cubeData.map(p => p.galaxyPosition);
    const icoTgt = state === 'tree' ? icoData.map(p => p.treePosition) : icoData.map(p => p.galaxyPosition);

    cubePositionsRef.current.forEach((pos, i) => {
      gsap.to(pos, { 0: cubeTgt[i][0], 1: cubeTgt[i][1], 2: cubeTgt[i][2], duration: 1.2, ease: 'power2.inOut', delay: Math.random() * 0.2 });
    });
    icoPositionsRef.current.forEach((pos, i) => {
      gsap.to(pos, { 0: icoTgt[i][0], 1: icoTgt[i][1], 2: icoTgt[i][2], duration: 1.2, ease: 'power2.inOut', delay: Math.random() * 0.2 });
    });
  }, [state, cubeData, icoData]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    
    if (cubeRef.current) {
      cubeData.forEach((cube, i) => {
        const pos = cubePositionsRef.current[i];
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.rotation.x = timeRef.current * cube.rotSpeed;
        dummy.rotation.y = timeRef.current * cube.rotSpeed * 1.3;
        dummy.scale.setScalar(cube.scale);
        dummy.updateMatrix();
        cubeRef.current!.setMatrixAt(i, dummy.matrix);
        cubeRef.current!.setColorAt(i, cube.color);
      });
      cubeRef.current.instanceMatrix.needsUpdate = true;
      if (cubeRef.current.instanceColor) cubeRef.current.instanceColor.needsUpdate = true;
    }
    
    if (icoRef.current) {
      icoData.forEach((ico, i) => {
        const pos = icoPositionsRef.current[i];
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.rotation.x = timeRef.current * ico.rotSpeed * 0.7;
        dummy.rotation.z = timeRef.current * ico.rotSpeed;
        dummy.scale.setScalar(ico.scale);
        dummy.updateMatrix();
        icoRef.current!.setMatrixAt(i, dummy.matrix);
        icoRef.current!.setColorAt(i, ico.color);
      });
      icoRef.current.instanceMatrix.needsUpdate = true;
      if (icoRef.current.instanceColor) icoRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={cubeRef} args={[undefined, undefined, cubeCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={1} roughness={0.05} envMapIntensity={2} />
      </instancedMesh>
      <instancedMesh ref={icoRef} args={[undefined, undefined, icoCount]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial metalness={1} roughness={0.05} envMapIntensity={2} />
      </instancedMesh>
    </>
  );
}

// Tetrahedron spiral ribbon (minimalist, elegant)
export function TetrahedronSpiral({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const tetraCount = 120; // 3 spirals, ~40 per spiral
  
  const tetraData = useMemo(() => {
    return Array.from({ length: tetraCount }, (_, i) => {
      const height = 7.5;
      const maxRadius = 3.2;
      const t = i / tetraCount;
      const y = t * height - height / 2;
      const layerRadius = maxRadius * (1 - t * 0.92);
      const angle = t * Math.PI * 6; // 3 full spirals
      
      const treePos: [number, number, number] = [
        Math.cos(angle) * layerRadius,
        y,
        Math.sin(angle) * layerRadius,
      ];
      const galaxyPos = generateGalaxyPosition();
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        angle,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, []);

  const positionsRef = useRef(tetraData.map(p => [...p.treePosition]));

  useEffect(() => {
    const targetPositions = state === 'tree' 
      ? tetraData.map(p => p.treePosition)
      : tetraData.map(p => p.galaxyPosition);

    positionsRef.current.forEach((pos, i) => {
      gsap.to(pos, {
        0: targetPositions[i][0],
        1: targetPositions[i][1],
        2: targetPositions[i][2],
        duration: 1.3 + Math.random() * 0.4,
        ease: 'power2.inOut',
        delay: Math.random() * 0.2,
      });
    });
  }, [state, tetraData]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    const white = new THREE.Color('#ffffff');
    
    tetraData.forEach((tetra, i) => {
      const pos = positionsRef.current[i];
      
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.y = tetra.angle + timeRef.current * 0.3;
      dummy.rotation.x = Math.PI * 0.1;
      dummy.scale.setScalar(0.04); // Tiny tetrahedrons
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, white);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tetraCount]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial 
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
}
