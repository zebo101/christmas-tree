import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

// Generate local placeholder images (avoid external CDN for China users)
const generatePlaceholder = (index: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradients = [
      ['#c41e3a', '#8b0000'],
      ['#228b22', '#006400'],
      ['#ffd700', '#daa520'],
      ['#1e90ff', '#0066cc'],
      ['#ff69b4', '#ff1493'],
      ['#9932cc', '#663399'],
      ['#ff6347', '#ff4500'],
      ['#20b2aa', '#008b8b'],
    ];
    const [color1, color2] = gradients[index % gradients.length];
    const gradient = ctx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);
    
    const emojis = ['王', '⭐', '🎁', '❄️', '🔔', '🎅', '🦌', '🕯️', '🍪', '🧦'];
    ctx.font = '120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[index % emojis.length], 200, 200);
  }
  return canvas.toDataURL('image/png');
};

let cachedPlaceholders: string[] | null = null;
const getDefaultPhotos = (): string[] => {
  if (!cachedPlaceholders) {
    cachedPlaceholders = Array.from({ length: 12 }, (_, i) => generatePlaceholder(i));
  }
  return cachedPlaceholders;
};

interface PhotoCardsProps {
  state: TreeState;
  photos?: string[];
  focusedIndex: number | null;
}

function generateTreePhotoPosition(index: number, total: number): [number, number, number] {
  const height = 7;
  const maxRadius = 2.8;
  const t = (index + 0.5) / total;
  const y = t * height - height / 2 + 0.5;
  const radius = maxRadius * (1 - t * 0.85);
  const angle = t * Math.PI * 10 + index * Math.PI * 0.5;
  
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
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

// Spring physics constants
const SPRING_STIFFNESS = 25;
const SPRING_DAMPING = 8;
const SCALE_STIFFNESS = 30;
const SCALE_DAMPING = 10;

// Card dimensions
const cardWidth = 1;
const cardHeight = 1.25;
const photoWidth = 0.85;
const photoHeight = 0.75;
const borderRadius = 0.03;
const photoOffsetY = 0.12;

// Pre-create shared geometries
const cardGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-cardWidth/2 + borderRadius, -cardHeight/2);
  shape.lineTo(cardWidth/2 - borderRadius, -cardHeight/2);
  shape.quadraticCurveTo(cardWidth/2, -cardHeight/2, cardWidth/2, -cardHeight/2 + borderRadius);
  shape.lineTo(cardWidth/2, cardHeight/2 - borderRadius);
  shape.quadraticCurveTo(cardWidth/2, cardHeight/2, cardWidth/2 - borderRadius, cardHeight/2);
  shape.lineTo(-cardWidth/2 + borderRadius, cardHeight/2);
  shape.quadraticCurveTo(-cardWidth/2, cardHeight/2, -cardWidth/2, cardHeight/2 - borderRadius);
  shape.lineTo(-cardWidth/2, -cardHeight/2 + borderRadius);
  shape.quadraticCurveTo(-cardWidth/2, -cardHeight/2, -cardWidth/2 + borderRadius, -cardHeight/2);
  return new THREE.ShapeGeometry(shape);
})();

const photoGeometry = new THREE.PlaneGeometry(photoWidth, photoHeight);
const cardMaterial = new THREE.MeshBasicMaterial({
  color: '#e5e0d5',
  side: THREE.DoubleSide,
  toneMapped: true,
  opacity: 0.95,
  transparent: true,
});

interface CardData {
  treePosition: [number, number, number];
  galaxyPosition: [number, number, number];
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  scaleVelocity: number;
  texture: THREE.Texture | null;
  textureUrl: string; // Track URL to detect changes
  time: number;
}

export function PhotoCards({ state, photos, focusedIndex }: PhotoCardsProps) {
  const photoUrls = photos && photos.length > 0 ? photos : getDefaultPhotos();
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Group | null)[]>([]);
  const { camera } = useThree();
  
  // Initialize card data with spring physics
  const cardDataRef = useRef<CardData[]>([]);
  
  const photoData = useMemo(() => {
    return photoUrls.slice(0, 12).map((url, i) => ({
      url,
      treePosition: generateTreePhotoPosition(i, Math.min(photoUrls.length, 12)),
      galaxyPosition: generateGalaxyPhotoPosition(),
    }));
  }, [photoUrls]);

  // Initialize card data and load textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    
    cardDataRef.current = photoData.map((photo, i) => {
      const existing = cardDataRef.current[i];
      // Check if URL changed - need to reload texture
      const urlChanged = existing?.textureUrl !== photo.url;
      
      const data: CardData = {
        treePosition: photo.treePosition,
        galaxyPosition: photo.galaxyPosition,
        position: existing?.position || new THREE.Vector3(...photo.treePosition),
        velocity: existing?.velocity || new THREE.Vector3(0, 0, 0),
        scale: existing?.scale || 0.4,
        scaleVelocity: existing?.scaleVelocity || 0,
        texture: urlChanged ? null : (existing?.texture || null), // Reset if URL changed
        textureUrl: photo.url,
        time: existing?.time || Math.random() * Math.PI * 2,
      };
      
      // Load texture if not loaded or URL changed
      if (!data.texture) {
        loader.load(
          photo.url,
          (tex) => {
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.colorSpace = THREE.SRGBColorSpace;
            if (cardDataRef.current[i]) {
              cardDataRef.current[i].texture = tex;
              cardDataRef.current[i].textureUrl = photo.url;
            }
          },
          undefined,
          () => {
            // Fallback placeholder on error
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = `hsl(${(i * 30) % 360}, 60%, 50%)`;
              ctx.fillRect(0, 0, 200, 200);
              ctx.font = '64px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🎄', 100, 100);
            }
            const placeholderTex = new THREE.CanvasTexture(canvas);
            placeholderTex.colorSpace = THREE.SRGBColorSpace;
            if (cardDataRef.current[i]) {
              cardDataRef.current[i].texture = placeholderTex;
            }
          }
        );
      }
      
      return data;
    });
  }, [photoData]);

  // Single useFrame for ALL cards - major performance improvement
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    const cards = cardDataRef.current;
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const meshGroup = meshRefs.current[i];
      if (!meshGroup || !card) continue;
      
      card.time += dt;
      const isFocused = focusedIndex === i;
      
      // Calculate target position
      const targetPos = isFocused 
        ? new THREE.Vector3(0, 0, 0.8)
        : state === 'tree' 
          ? new THREE.Vector3(...card.treePosition)
          : new THREE.Vector3(...card.galaxyPosition);
      
      const targetScale = isFocused ? 5 : 0.4;
      
      // Spring physics for position
      const displacement = card.position.clone().sub(targetPos);
      const springForce = displacement.multiplyScalar(-SPRING_STIFFNESS);
      const dampingForce = card.velocity.clone().multiplyScalar(-SPRING_DAMPING);
      const acceleration = springForce.add(dampingForce);
      
      card.velocity.add(acceleration.multiplyScalar(dt));
      card.position.add(card.velocity.clone().multiplyScalar(dt));
      
      // Spring physics for scale
      const scaleDisplacement = card.scale - targetScale;
      const scaleSpringForce = -SCALE_STIFFNESS * scaleDisplacement;
      const scaleDampingForce = -SCALE_DAMPING * card.scaleVelocity;
      card.scaleVelocity += (scaleSpringForce + scaleDampingForce) * dt;
      card.scale += card.scaleVelocity * dt;
      
      // Apply to mesh
      meshGroup.position.copy(card.position);
      if (!isFocused) {
        meshGroup.position.y += Math.sin(card.time * 0.5) * 0.005;
      }
      meshGroup.scale.set(card.scale, card.scale, 1);
      meshGroup.lookAt(camera.position);
    }
  });

  // Force re-render when textures load
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      const allLoaded = cardDataRef.current.every(c => c.texture);
      if (allLoaded) {
        clearInterval(interval);
      }
      forceUpdate(n => n + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <group ref={groupRef}>
      {photoData.map((photo, i) => {
        const texture = cardDataRef.current[i]?.texture;
        return (
          <group 
            key={i} 
            ref={el => { meshRefs.current[i] = el; }}
            position={photo.treePosition}
            scale={[0.4, 0.4, 1]}
          >
            <mesh geometry={cardGeometry} renderOrder={1} material={cardMaterial} />
            {texture && (
              <mesh geometry={photoGeometry} position={[0, photoOffsetY, 0.001]} renderOrder={2}>
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={true} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
