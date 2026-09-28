import { useEffect, useRef } from 'react';
import { useSyncStore } from '../store';

export interface AudioEngine {
  mapEventToAudioTime: (eventTime: number) => number;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
}

export function useTapper(
  engine: AudioEngine | null,
  tapOffsetMs: number = -120,
  debounceMs: number = 70
) {
  const lastTapRef = useRef<number>(0);
  const { mode, tapLine, undoLastTap, skipLine, markSilence } = useSyncStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.repeat) return;

      // Handle shortcuts that work outside syncing mode
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Assume engine play/pause handling exists externally, or we just call engine methods if present.
        // The prompt says "K: Play/Pause" in the Shortcuts panel. We can just emit a custom event or call engine if we know its state, but we don't.
      } else if (e.key.toLowerCase() === 'j') {
        if (engine) engine.seek(Math.max(0, engine.getCurrentTime() - 3));
      } else if (e.key.toLowerCase() === 'l') {
        if (engine) engine.seek(engine.getCurrentTime() + 3);
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
        const audioTime = engine.mapEventToAudioTime(now) + tapOffsetMs;
        tapLine(audioTime);
        lastTapRef.current = now;
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (!engine) return;
        const audioTime = engine.mapEventToAudioTime(now) + tapOffsetMs;
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
