import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Slider } from '@/shared/ui/slider';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useTransport } from '../hooks/useTransport';
import { formatTimeFull } from '@/shared/utils/format-time';
import { cn } from '@/shared/utils/cn';
import type { PlaybackRate } from '../types';

export interface TransportControlsProps {
  audio: ReturnType<typeof useAudioEngine>;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  centerActions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function TransportControls({ 
  audio, 
  leftActions, 
  rightActions, 
  centerActions, 
  className,
  compact = false 
}: TransportControlsProps) {
  const { engine, state, play, pause, seek, setPlaybackRate, setVolume } = audio;
  const isPlaying = state.playbackState === 'playing';
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    let rAF: number;
    const updateTime = () => {
      if (!isDragging) {
        setCurrentTime(engine.clock.currentTime);
      }
      rAF = requestAnimationFrame(updateTime);
    };
    rAF = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rAF);
  }, [engine, isDragging]);
  
  const handleTogglePlay = () => {
    if (isPlaying) pause();
    else play();
  };
  
  const handleSeek = (offset: number) => {
    seek(engine.clock.currentTime + offset);
  };
  
  useTransport({
    isPlaying,
    onTogglePlay: handleTogglePlay,
    onSeek: handleSeek,
  });

  const handleSliderChange = (value: number[]) => {
    setIsDragging(true);
    setCurrentTime(value[0]);
  };
  
  const handleSliderCommit = (value: number[]) => {
    setIsDragging(false);
    seek(value[0]);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlaybackRate(Number(e.target.value) as PlaybackRate);
  };

  return (
    <div className={cn(
      "flex flex-col bg-zinc-950/90 rounded-2xl border border-zinc-800/80 text-zinc-100 shadow-xl backdrop-blur-xl w-full select-none transition-all",
      compact ? "p-2 gap-2" : "p-3 gap-2.5",
      className
    )}>
      {/* Top Scrubber Bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-xs font-mono text-zinc-400 w-16 shrink-0">{formatTimeFull(currentTime)}</span>
        
        <div className="flex-1 px-1">
          <Slider
            value={[currentTime]}
            max={state.duration || 100}
            step={0.01}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            disabled={!state.isLoaded}
            className="w-full"
          />
        </div>
        
        <span className="text-xs font-mono text-zinc-400 w-16 text-right shrink-0">
          {formatTimeFull(state.duration)}
        </span>
      </div>
      
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        {/* Left Side: Playback buttons + integrated leftActions */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg cursor-pointer"
            onClick={() => handleSeek(-3)} 
            disabled={!state.isLoaded}
            title="Retroceder 3s (J / ←)"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="default" 
            size="icon" 
            className={cn(
              "rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer transition-transform active:scale-95",
              compact ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10"
            )}
            onClick={handleTogglePlay}
            disabled={!state.isLoaded}
            title={isPlaying ? "Pausar (Espacio / K)" : "Reproducir (Espacio / K)"}
          >
            {isPlaying ? (
              <Pause className={compact ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5"} />
            ) : (
              <Play className={cn("ml-0.5", compact ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5")} />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg cursor-pointer"
            onClick={() => handleSeek(3)} 
            disabled={!state.isLoaded}
            title="Avanzar 3s (L / →)"
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          {leftActions && (
            <div className="flex items-center gap-1.5 ml-1 sm:ml-2 pl-2 sm:pl-2.5 border-l border-zinc-800/80">
              {leftActions}
            </div>
          )}
        </div>

        {/* Center Side if provided */}
        {centerActions && (
          <div className="hidden md:flex items-center gap-2">
            {centerActions}
          </div>
        )}
        
        {/* Right Side: integrated rightActions + Speed + Volume */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
          {rightActions && (
            <div className="flex items-center gap-1.5 pr-2 sm:pr-2.5 border-r border-zinc-800/80">
              {rightActions}
            </div>
          )}

          <select 
            value={state.playbackRate} 
            onChange={handleRateChange}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 outline-none cursor-pointer h-8"
            disabled={!state.isLoaded}
            title="Velocidad de reproducción"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
          </select>
          
          <div className="hidden sm:flex items-center gap-2 w-24 lg:w-28">
            <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <Slider
              defaultValue={[1]}
              max={1}
              step={0.01}
              onValueChange={(val) => setVolume(val[0])}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
