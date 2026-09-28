import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '../engine';
import type { AudioEngineState, PlaybackRate } from '../types';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const rAFRef = useRef<number | null>(null);
  
  const [state, setState] = useState<AudioEngineState>({
    playbackState: 'stopped',
    duration: 0,
    playbackRate: 1,
    isLoaded: false,
  });

  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }
  const engine = engineRef.current;

  useEffect(() => {
    let lastUiUpdate = performance.now();
    
    const tick = (now: number) => {
      engine.clock.currentTime = engine.getCurrentTime();
      
      if (now - lastUiUpdate > 33) {
        lastUiUpdate = now;
        
        let newPlaybackState = state.playbackState;
        if (engine.clock.isPlaying) {
          newPlaybackState = 'playing';
        } else if (engine.clock.currentTime > 0) {
          newPlaybackState = 'paused';
        } else {
          newPlaybackState = 'stopped';
        }
        
        setState(prev => {
          if (
            prev.playbackState !== newPlaybackState ||
            prev.duration !== engine.getDuration() ||
            prev.playbackRate !== engine.clock.playbackRate ||
            prev.isLoaded !== !!engine.getDuration()
          ) {
            return {
              ...prev,
              playbackState: newPlaybackState,
              duration: engine.getDuration(),
              playbackRate: engine.clock.playbackRate as PlaybackRate,
              isLoaded: !!engine.getDuration(),
            };
          }
          return prev;
        });
      }
      
      rAFRef.current = requestAnimationFrame(tick);
    };
    
    rAFRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, [engine, state.playbackState]);

  useEffect(() => {
    return () => {
      engine.dispose();
    };
  }, [engine]);

  const loadAudio = useCallback(async (file: File) => {
    await engine.loadAudio(file);
    setState(prev => ({
      ...prev,
      duration: engine.getDuration(),
      isLoaded: true,
      playbackState: 'stopped',
    }));
  }, [engine]);

  const play = useCallback((fromTime?: number) => {
    engine.play(fromTime);
  }, [engine]);

  const pause = useCallback(() => {
    engine.pause();
  }, [engine]);

  const stop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const seek = useCallback((time: number) => {
    engine.seek(time);
  }, [engine]);

  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    engine.setPlaybackRate(rate);
    setState(prev => ({ ...prev, playbackRate: rate }));
  }, [engine]);

  const setVolume = useCallback((volume: number) => {
      engine.setVolume(volume);
  }, [engine]);

  return {
    engine,
    state,
    loadAudio,
    play,
    pause,
    stop,
    seek,
    setPlaybackRate,
    setVolume
  };
}
