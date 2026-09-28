import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '../engine';
import type { AudioEngineState, PlaybackRate } from '../types';

let globalAudioEngine: AudioEngine | null = null;

function getSharedEngine(): AudioEngine {
  if (!globalAudioEngine) {
    globalAudioEngine = new AudioEngine();
  }
  return globalAudioEngine;
}

export function useAudioEngine() {
  const engine = getSharedEngine();
  const rAFRef = useRef<number | null>(null);
  
  const [state, setState] = useState<AudioEngineState>(() => ({
    playbackState: engine.clock.isPlaying ? 'playing' : engine.clock.currentTime > 0 ? 'paused' : 'stopped',
    duration: engine.getDuration(),
    playbackRate: (engine.clock.playbackRate || 1) as PlaybackRate,
    isLoaded: engine.getDuration() > 0,
  }));

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
          const currentDur = engine.getDuration();
          const currentRate = engine.clock.playbackRate as PlaybackRate;
          const currentLoaded = currentDur > 0;
          
          if (
            prev.playbackState !== newPlaybackState ||
            prev.duration !== currentDur ||
            prev.playbackRate !== currentRate ||
            prev.isLoaded !== currentLoaded
          ) {
            return {
              playbackState: newPlaybackState,
              duration: currentDur,
              playbackRate: currentRate,
              isLoaded: currentLoaded,
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

  const loadAudio = useCallback(async (file: Blob | File) => {
    const result = await engine.loadAudio(file);
    setState({
      duration: result.duration,
      isLoaded: true,
      playbackState: 'stopped',
      playbackRate: (engine.clock.playbackRate || 1) as PlaybackRate,
    });
    return result;
  }, [engine]);

  const play = useCallback((fromTime?: number) => {
    engine.play(fromTime);
    setState(prev => ({ ...prev, playbackState: 'playing' }));
  }, [engine]);

  const pause = useCallback(() => {
    engine.pause();
    setState(prev => ({ ...prev, playbackState: 'paused' }));
  }, [engine]);

  const stop = useCallback(() => {
    engine.stop();
    setState(prev => ({ ...prev, playbackState: 'stopped' }));
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
