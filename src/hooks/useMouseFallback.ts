import { useState, useEffect, useCallback, useRef } from 'react';
import { TreeState, GestureType } from '@/types/christmas';

interface UseMouseFallbackOptions {
  enabled: boolean;
  currentState: TreeState;
  onStateChange: (state: TreeState) => void;
  onOrbitChange: (rotation: { x: number; y: number }) => void;
}

export function useMouseFallback({
  enabled,
  currentState,
  onStateChange,
  onOrbitChange,
}: UseMouseFallbackOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const lastClickRef = useRef<number>(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickRef.current;
    
    // Double click detection
    if (timeSinceLastClick < 300) {
      // Toggle between tree and galaxy
      onStateChange(currentState === 'tree' ? 'galaxy' : 'tree');
      lastClickRef.current = 0;
      return;
    }
    
    lastClickRef.current = now;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }, [enabled, currentState, onStateChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled) return;

    // Update mouse position for hover effects
    setMousePosition({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });

    if (isDragging && currentState === 'galaxy') {
      const deltaX = (e.clientX - dragStartRef.current.x) * 0.005;
      const deltaY = (e.clientY - dragStartRef.current.y) * 0.005;
      
      rotationRef.current = {
        x: rotationRef.current.x + deltaY,
        y: rotationRef.current.y + deltaX,
      };
      
      onOrbitChange(rotationRef.current);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [enabled, isDragging, currentState, onOrbitChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled) return;
    // Could be used for zoom if needed
  }, [enabled]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const now = Date.now();
    const timeSinceLastClick = now - lastClickRef.current;
    
    if (timeSinceLastClick < 300) {
      onStateChange(currentState === 'tree' ? 'galaxy' : 'tree');
      lastClickRef.current = 0;
      return;
    }
    
    lastClickRef.current = now;
    setIsDragging(true);
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [enabled, currentState, onStateChange]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    
    if (currentState === 'galaxy') {
      const deltaX = (touch.clientX - dragStartRef.current.x) * 0.005;
      const deltaY = (touch.clientY - dragStartRef.current.y) * 0.005;
      
      rotationRef.current = {
        x: rotationRef.current.x + deltaY,
        y: rotationRef.current.y + deltaX,
      };
      
      onOrbitChange(rotationRef.current);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [enabled, isDragging, currentState, onOrbitChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isDragging,
    mousePosition,
    simulatedGesture: isDragging ? 'open' : 'none' as GestureType,
  };
}
