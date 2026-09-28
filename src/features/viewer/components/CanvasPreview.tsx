import { useRef, useEffect, useCallback } from 'react';
import { renderFrame } from '../renderer';
import type { RenderScene } from '../types';
import { cn } from '@/shared/utils/cn';

interface CanvasPreviewProps {
  scene: RenderScene;
  getCurrentTime: () => number;
  isPlaying: boolean;
  className?: string;
}

export function CanvasPreview({ scene, getCurrentTime, isPlaying, className }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const t = getCurrentTime();
    renderFrame(ctx, scene, t);
    
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [scene, getCurrentTime, isPlaying]);
  
  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      // Draw one frame when paused
      draw();
    }
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, isPlaying]);
  
  // Handle canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = scene.width;
    canvas.height = scene.height;
    
    // Draw initial frame if not playing
    if (!isPlaying) {
      draw();
    }
  }, [scene.width, scene.height, draw, isPlaying]);
  
  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-lg border border-zinc-800 shadow-xl", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}
