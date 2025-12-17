export type TreeState = 'tree' | 'galaxy' | 'focus';

export type GestureType = 'none' | 'fist' | 'open' | 'pinch' | 'pointing';

export interface ParticleData {
  treePosition: [number, number, number];
  galaxyPosition: [number, number, number];
  color: string;
  scale: number;
  type: 'sphere' | 'cube' | 'photo';
}

export interface PhotoCard {
  id: string;
  url: string;
  position: [number, number, number];
}

export interface HandGestureState {
  gesture: GestureType;
  handPosition: { x: number; y: number } | null;
  pinchDistance: number;
  isTracking: boolean;
}
