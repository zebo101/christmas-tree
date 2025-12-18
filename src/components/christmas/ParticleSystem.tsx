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

// Main tree particles using THREE.Points for maximum performance
export function ParticleSystem({ state, particleCount = 8000 }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const transitionRef = useRef({ progress: 0 });
  
  // Pre-compute all particle data
  const { positions, colors, particleData } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const data: Array<{
      treePos: [number, number, number];
      galaxyPos: [number, number, number];
      phase: number;
      speed: number;
      delay: number;
      size: number;
    }> = [];
    
    for (let i = 0; i < particleCount; i++) {
      const treePos = generateTreePosition(i, particleCount);
      const galaxyPos = generateGalaxyPosition();
      
      // Set initial positions
      positions[i * 3] = treePos[0];
      positions[i * 3 + 1] = treePos[1];
      positions[i * 3 + 2] = treePos[2];
      
      // 85% green, 15% white sparkles
      const colorRand = Math.random();
      if (colorRand < 0.85) {
        const hue = 0.33 + Math.random() * 0.05;
        const saturation = 0.7 + Math.random() * 0.3;
        const lightness = 0.25 + Math.random() * 0.2;
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      } else {
        colors[i * 3] = 0.95;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.95;
      }
      
      data.push({
        treePos,
        galaxyPos,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        delay: Math.random(),
        size: 2 + Math.random() * 3,
      });
    }
    
    return { positions, colors, particleData: data };
  }, [particleCount]);

  // Track if transition is active
  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);

  // Single GSAP tween for transition
  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, {
      progress: state === 'tree' ? 0 : 1,
      duration: 1.8,
      ease: 'power2.inOut',
      onComplete: () => {
        isTransitioningRef.current = false;
      },
    });
  }, [state]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    
    const progress = transitionRef.current.progress;
    
    // Skip heavy computation if not transitioning and progress hasn't changed
    // Only update every 3rd frame for breathing animation when idle
    const isIdle = !isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001;
    lastProgressRef.current = progress;
    
    timeRef.current += delta;
    
    // When idle, only update breathing animation every few frames
    if (isIdle && Math.floor(timeRef.current * 30) % 3 !== 0) return;
    
    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const p = particleData[i];
      
      // Staggered smoothstep transition
      const staggered = Math.max(0, Math.min(1, progress * 1.5 - p.delay * 0.5));
      const smooth = staggered * staggered * (3 - 2 * staggered);
      
      // Interpolate position
      const x = p.treePos[0] + (p.galaxyPos[0] - p.treePos[0]) * smooth;
      const y = p.treePos[1] + (p.galaxyPos[1] - p.treePos[1]) * smooth;
      const z = p.treePos[2] + (p.galaxyPos[2] - p.treePos[2]) * smooth;
      
      // Subtle breathing - only when idle for performance
      const breathe = Math.sin(timeRef.current * p.speed + p.phase) * 0.02;
      
      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y + breathe;
      posArray[i * 3 + 2] = z;
    }
    
    positionAttr.needsUpdate = true;
  });

  // Create sizes array for variable particle sizes
  const sizes = useMemo(() => {
    const arr = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      arr[i] = particleData[i].size;
    }
    return arr;
  }, [particleCount, particleData]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

// Colorful ornament balls (red, gold, etc.) - OPTIMIZED
export function OrnamentBalls({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorsSetRef = useRef(false);
  const transitionRef = useRef({ progress: 0 });
  const ornamentCount = 35;
  
  const ornamentData = useMemo(() => {
    const colors = [
      new THREE.Color('#C41E3A'),
      new THREE.Color('#8B0000'),
      new THREE.Color('#FFD700'),
      new THREE.Color('#FF6347'),
      new THREE.Color('#DC143C'),
      new THREE.Color('#B22222'),
      new THREE.Color('#DAA520'),
      new THREE.Color('#FF4500'),
    ];
    
    return Array.from({ length: ornamentCount }, (_, i) => ({
      treePosition: generateOrnamentPosition(i, ornamentCount),
      galaxyPosition: generateGalaxyPosition(),
      color: colors[i % colors.length],
      scale: 0.1 + Math.random() * 0.08,
      delay: Math.random(),
    }));
  }, []);

  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, {
      progress: state === 'tree' ? 0 : 1,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: () => { isTransitioningRef.current = false; },
    });
  }, [state]);

  useEffect(() => {
    if (!meshRef.current || colorsSetRef.current) return;
    ornamentData.forEach((o, i) => meshRef.current!.setColorAt(i, o.color));
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    colorsSetRef.current = true;
  }, [ornamentData]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const progress = transitionRef.current.progress;
    
    // Skip if idle
    if (!isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001) return;
    lastProgressRef.current = progress;
    
    ornamentData.forEach((ornament, i) => {
      const p = Math.max(0, Math.min(1, progress * 1.3 - ornament.delay * 0.3));
      const smooth = p * p * (3 - 2 * p);
      
      const x = ornament.treePosition[0] + (ornament.galaxyPosition[0] - ornament.treePosition[0]) * smooth;
      const y = ornament.treePosition[1] + (ornament.galaxyPosition[1] - ornament.treePosition[1]) * smooth;
      const z = ornament.treePosition[2] + (ornament.galaxyPosition[2] - ornament.treePosition[2]) * smooth;
      
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(ornament.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ornamentCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial 
        color="#ff3333"
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// Gem-like cubes and icosahedrons (high reflective) - OPTIMIZED
export function GemOrnaments({ state }: { state: TreeState }) {
  const cubeRef = useRef<THREE.InstancedMesh>(null);
  const icoRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef({ cube: false, ico: false });
  const transitionRef = useRef({ progress: 0 });
  const cubeCount = 25;
  const icoCount = 20;
  
  const cubeData = useMemo(() => {
    return Array.from({ length: cubeCount }, (_, i) => {
      const hue = Math.random() > 0.5 ? 0.75 + Math.random() * 0.1 : 0;
      return {
        treePosition: generateOrnamentPosition(i, cubeCount),
        galaxyPosition: generateGalaxyPosition(),
        color: new THREE.Color().setHSL(hue, hue > 0 ? 0.4 : 0, 0.85 + Math.random() * 0.15),
        scale: 0.05 + Math.random() * 0.04,
        rotSpeed: 0.3 + Math.random() * 0.5,
        delay: Math.random(),
      };
    });
  }, []);
  
  const icoData = useMemo(() => {
    return Array.from({ length: icoCount }, (_, i) => {
      const hue = Math.random() > 0.5 ? 0.78 + Math.random() * 0.05 : 0;
      return {
        treePosition: generateOrnamentPosition(i + cubeCount, icoCount + cubeCount),
        galaxyPosition: generateGalaxyPosition(),
        color: new THREE.Color().setHSL(hue, hue > 0 ? 0.5 : 0, 0.8 + Math.random() * 0.2),
        scale: 0.06 + Math.random() * 0.05,
        rotSpeed: 0.2 + Math.random() * 0.4,
        delay: Math.random(),
      };
    });
  }, []);

  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, { 
      progress: state === 'tree' ? 0 : 1, 
      duration: 1.5, 
      ease: 'power2.inOut',
      onComplete: () => { isTransitioningRef.current = false; },
    });
  }, [state]);

  // Set colors once
  useEffect(() => {
    if (cubeRef.current && !colorsSetRef.current.cube) {
      cubeData.forEach((c, i) => cubeRef.current!.setColorAt(i, c.color));
      if (cubeRef.current.instanceColor) cubeRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.cube = true;
    }
    if (icoRef.current && !colorsSetRef.current.ico) {
      icoData.forEach((c, i) => icoRef.current!.setColorAt(i, c.color));
      if (icoRef.current.instanceColor) icoRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.ico = true;
    }
  }, [cubeData, icoData]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    frameCountRef.current++;
    
    const progress = transitionRef.current.progress;
    const isIdle = !isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001;
    lastProgressRef.current = progress;
    
    // When idle, only update rotation every 2nd frame
    if (isIdle && frameCountRef.current % 2 !== 0) return;
    
    if (cubeRef.current) {
      cubeData.forEach((cube, i) => {
        const p = Math.max(0, Math.min(1, progress * 1.3 - cube.delay * 0.3));
        const smooth = p * p * (3 - 2 * p);
        
        dummy.position.set(
          cube.treePosition[0] + (cube.galaxyPosition[0] - cube.treePosition[0]) * smooth,
          cube.treePosition[1] + (cube.galaxyPosition[1] - cube.treePosition[1]) * smooth,
          cube.treePosition[2] + (cube.galaxyPosition[2] - cube.treePosition[2]) * smooth
        );
        dummy.rotation.x = timeRef.current * cube.rotSpeed;
        dummy.rotation.y = timeRef.current * cube.rotSpeed * 1.3;
        dummy.scale.setScalar(cube.scale);
        dummy.updateMatrix();
        cubeRef.current!.setMatrixAt(i, dummy.matrix);
      });
      cubeRef.current.instanceMatrix.needsUpdate = true;
    }
    
    if (icoRef.current) {
      icoData.forEach((ico, i) => {
        const p = Math.max(0, Math.min(1, progress * 1.3 - ico.delay * 0.3));
        const smooth = p * p * (3 - 2 * p);
        
        dummy.position.set(
          ico.treePosition[0] + (ico.galaxyPosition[0] - ico.treePosition[0]) * smooth,
          ico.treePosition[1] + (ico.galaxyPosition[1] - ico.treePosition[1]) * smooth,
          ico.treePosition[2] + (ico.galaxyPosition[2] - ico.treePosition[2]) * smooth
        );
        dummy.rotation.x = timeRef.current * ico.rotSpeed * 0.7;
        dummy.rotation.z = timeRef.current * ico.rotSpeed;
        dummy.scale.setScalar(ico.scale);
        dummy.updateMatrix();
        icoRef.current!.setMatrixAt(i, dummy.matrix);
      });
      icoRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={cubeRef} args={[undefined, undefined, cubeCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#f8f8ff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={icoRef} args={[undefined, undefined, icoCount]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#f8f8ff" toneMapped={false} />
      </instancedMesh>
    </>
  );
}

// Tetrahedron spiral ribbon (minimalist, elegant) - OPTIMIZED
export function TetrahedronSpiral({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef(false);
  const transitionRef = useRef({ progress: 0 });
  const tetraCount = 180;
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), []);
  
  const tetraData = useMemo(() => {
    return Array.from({ length: tetraCount }, (_, i) => {
      const height = 7;
      const maxRadius = 3.0;
      const t = i / tetraCount;
      const y = t * height - height / 2 + 0.3;
      const layerRadius = maxRadius * (1 - t * 0.88) + 0.15;
      const angle = t * Math.PI * 6;
      
      return {
        treePosition: [Math.cos(angle) * layerRadius, y, Math.sin(angle) * layerRadius] as [number, number, number],
        galaxyPosition: generateGalaxyPosition(),
        angle,
        delay: i / tetraCount, // Sequential delay based on position
      };
    });
  }, []);

  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, { 
      progress: state === 'tree' ? 0 : 1, 
      duration: 1.5, 
      ease: 'power2.inOut',
      onComplete: () => { isTransitioningRef.current = false; },
    });
  }, [state]);

  // Set colors once
  useEffect(() => {
    if (!meshRef.current || colorsSetRef.current) return;
    tetraData.forEach((_, i) => meshRef.current!.setColorAt(i, whiteColor));
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    colorsSetRef.current = true;
  }, [tetraData, whiteColor]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    frameCountRef.current++;
    
    const progress = transitionRef.current.progress;
    const isIdle = !isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001;
    lastProgressRef.current = progress;
    
    // When idle, only update rotation every 2nd frame
    if (isIdle && frameCountRef.current % 2 !== 0) return;
    
    tetraData.forEach((tetra, i) => {
      // Wave effect: particles at top transition earlier
      const p = Math.max(0, Math.min(1, progress * 1.5 - tetra.delay * 0.5));
      const smooth = p * p * (3 - 2 * p);
      
      dummy.position.set(
        tetra.treePosition[0] + (tetra.galaxyPosition[0] - tetra.treePosition[0]) * smooth,
        tetra.treePosition[1] + (tetra.galaxyPosition[1] - tetra.treePosition[1]) * smooth,
        tetra.treePosition[2] + (tetra.galaxyPosition[2] - tetra.treePosition[2]) * smooth
      );
      dummy.rotation.y = tetra.angle + timeRef.current * 0.2;
      dummy.rotation.x = Math.PI * 0.15;
      dummy.rotation.z = tetra.angle * 0.5;
      dummy.scale.setScalar(0.06);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tetraCount]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#ffffee" toneMapped={false} />
    </instancedMesh>
  );
}
