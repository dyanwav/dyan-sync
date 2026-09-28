import { useEffect, useRef } from 'react';
import { useSyncStore } from '../store';

export interface AudioEngineLike {
  mapEventToAudioTime: (eventTimeStamp: number, tapOffsetMs: number) => number;
  play: (fromTime?: number) => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  clock?: { isPlaying: boolean };
}

export function useTapper(
  engine: AudioEngineLike | null,
  tapOffsetMs: number = -120,
  debounceMs: number = 70
) {
  const lastTapRef = useRef<number>(0);
  const { mode, tapLine, undoLastTap, skipLine, markSilence } = useSyncStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.repeat) return;

      // Handle transport shortcuts
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (engine) {
          if (engine.clock?.isPlaying) {
            engine.pause();
          } else {
            engine.play();
          }
        }
        return;
      } else if (e.key.toLowerCase() === 'j') {
        if (engine) engine.seek(Math.max(0, engine.getCurrentTime() - 3));
        return;
      } else if (e.key.toLowerCase() === 'l') {
        if (engine) engine.seek(engine.getCurrentTime() + 3);
        return;
      }

      // Undo can work even if paused
      if (e.key === 'Backspace' || (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        undoLastTap();
        return;
      }

      // Rest only work if syncing
      if (mode !== 'syncing') return;

      const now = performance.now();
      if (now - lastTapRef.current < debounceMs) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!engine) return;
        const audioTime = engine.mapEventToAudioTime(e.timeStamp, tapOffsetMs);
        tapLine(audioTime);
        lastTapRef.current = now;
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (!engine) return;
        const audioTime = engine.mapEventToAudioTime(e.timeStamp, tapOffsetMs);
        markSilence(audioTime);
        lastTapRef.current = now;
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        skipLine();
        lastTapRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, mode, tapOffsetMs, debounceMs, tapLine, undoLastTap, skipLine, markSilence]);
}
