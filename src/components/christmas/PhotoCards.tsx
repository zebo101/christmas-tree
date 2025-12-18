import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { TreeState, PhotoCard } from '@/types/christmas';
import { RoundedBox } from '@react-three/drei';

// Default placeholder images - higher resolution for clarity
const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544826252-a8f669ffe4bd?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1479722842840-c0a823bd0cd6?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1545622783-b3e021430fee?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1418489098061-ce87b5dc3aee?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514803530614-3d6e0bd66c63?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1481286943471-1f233f26c56b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512474932049-78ac69ede12c?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1485083269755-a7b559a4fe5e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1482330454287-4e2c1bb3e9dd?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1481586542890-a17ed8a1d6f0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1515266591878-f93e32bc5937?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1483808161634-ce6ed94ec53d?w=400&h=400&fit=crop&q=80',
];

interface PhotoCardsProps {
  state: TreeState;
  photos?: string[];
  focusedIndex: number | null;
  onFocusChange?: (index: number | null) => void;
}

function generateTreePhotoPosition(index: number, total: number): [number, number, number] {
  const height = 7;
  const maxRadius = 2.8;
  const t = (index + 0.5) / total;
  const y = t * height - height / 2 + 0.5;
  const radius = maxRadius * (1 - t * 0.85);
  const angle = t * Math.PI * 10 + index * Math.PI * 0.5;
  
  return [
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius,
  ];
}

function generateGalaxyPhotoPosition(): [number, number, number] {
  const radius = 4 + Math.random() * 6;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.5,
    radius * Math.cos(phi),
  ];
}

function PhotoCardMesh({ 
  url, 
  treePosition, 
  galaxyPosition,
  state,
  isFocused,
  index,
}: { 
  url: string; 
  treePosition: [number, number, number];
  galaxyPosition: [number, number, number];
  state: TreeState;
  isFocused: boolean;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera } = useThree();
  const timeRef = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      url,
      (tex) => {
        // High quality texture settings
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 16; // Better quality at angles
        tex.generateMipmaps = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => {
        // On error, create a colored placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const hue = (index * 30) % 360;
          ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
          ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = 'white';
          ctx.font = '96px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎄', 200, 200);
        }
        const placeholderTex = new THREE.CanvasTexture(canvas);
        placeholderTex.colorSpace = THREE.SRGBColorSpace;
        setTexture(placeholderTex);
      }
    );
  }, [url, index]);

  useEffect(() => {
    if (!meshRef.current) return;

    const targetPos = isFocused 
      ? [0, 0, 0.8]  // 更近的位置
      : state === 'tree' 
        ? treePosition 
        : galaxyPosition;

    const targetScale = isFocused ? 5 : 0.4;  // 更大的缩放

    // 使用更丝滑的动画设置
    gsap.killTweensOf(meshRef.current.position);
    gsap.killTweensOf(meshRef.current.scale);

    gsap.to(meshRef.current.position, {
      x: targetPos[0],
      y: targetPos[1],
      z: targetPos[2],
      duration: isFocused ? 0.6 : 0.8,
      ease: 'power3.out',  // 更自然的缓动
      overwrite: true,
    });

    gsap.to(meshRef.current.scale, {
      x: targetScale,
      y: targetScale,
      z: 1,
      duration: isFocused ? 0.5 : 0.7,
      ease: 'back.out(1.2)',  // 带轻微弹性的缓动
      overwrite: true,
    });
  }, [state, isFocused, treePosition, galaxyPosition]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    
    // Make card face camera
    meshRef.current.lookAt(camera.position);
    
    // Add subtle floating motion
    if (!isFocused) {
      meshRef.current.position.y += Math.sin(timeRef.current * 0.5) * 0.001;
    }
  });

  // 创建圆角矩形几何体
  const roundedRectGeometry = useMemo(() => {
    const width = 1;
    const height = 1;
    const radius = 0.1; // 圆角半径
    
    const shape = new THREE.Shape();
    shape.moveTo(-width/2 + radius, -height/2);
    shape.lineTo(width/2 - radius, -height/2);
    shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
    shape.lineTo(width/2, height/2 - radius);
    shape.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
    shape.lineTo(-width/2 + radius, height/2);
    shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
    shape.lineTo(-width/2, -height/2 + radius);
    shape.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);
    
    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }, []);

  if (!texture) return null;

  return (
    <mesh ref={meshRef} position={treePosition} scale={[0.5, 0.5, 1]} geometry={roundedRectGeometry}>
      <meshBasicMaterial 
        map={texture} 
        side={THREE.DoubleSide}
        transparent={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function PhotoCards({ state, photos, focusedIndex, onFocusChange }: PhotoCardsProps) {
  const photoUrls = photos && photos.length > 0 ? photos : DEFAULT_PHOTOS;
  
  const photoData = useMemo(() => {
    return photoUrls.slice(0, 20).map((url, i) => ({
      url,
      treePosition: generateTreePhotoPosition(i, Math.min(photoUrls.length, 20)),
      galaxyPosition: generateGalaxyPhotoPosition(),
    }));
  }, [photoUrls]);

  return (
    <group>
      {photoData.map((photo, i) => (
        <PhotoCardMesh
          key={i}
          url={photo.url}
          treePosition={photo.treePosition}
          galaxyPosition={photo.galaxyPosition}
          state={state}
          isFocused={focusedIndex === i}
          index={i}
        />
      ))}
    </group>
  );
}
