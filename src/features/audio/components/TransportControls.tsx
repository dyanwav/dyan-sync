import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Slider } from '@/shared/ui/slider';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useTransport } from '../hooks/useTransport';
import { formatTimeFull } from '@/shared/utils/format-time';
import type { PlaybackRate } from '../types';

interface TransportControlsProps {
  audio: ReturnType<typeof useAudioEngine>;
}

export function TransportControls({ audio }: TransportControlsProps) {
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
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-100">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-mono w-24">{formatTimeFull(currentTime)}</span>
        
        <div className="flex-1 px-4">
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
        
        <span className="text-sm font-mono w-24 text-right">
          {formatTimeFull(state.duration)}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleSeek(-3)} disabled={!state.isLoaded}>
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button 
            variant="default" 
            size="icon" 
            className="w-12 h-12 rounded-full"
            onClick={handleTogglePlay}
            disabled={!state.isLoaded}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => handleSeek(3)} disabled={!state.isLoaded}>
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={state.playbackRate} 
            onChange={handleRateChange}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-zinc-500"
            disabled={!state.isLoaded}
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
          </select>
          
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="w-4 h-4 text-zinc-400" />
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
