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
  const { mode, tapLine, undoLastTap, skipLine, markSilence, startSync, resumeSync, pauseSync, setMode } = useSyncStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in text input or editable element
      const target = e.target as HTMLElement;
      if (
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        )
      ) {
        return;
      }

      // If a button is focused, blur it to prevent Space from triggering synthetic clicks
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        (document.activeElement as HTMLElement).blur();
      }

      if (e.repeat) return;

      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
      const isB = e.key.toLowerCase() === 'b' || e.code === 'KeyB';
      const isS = e.key.toLowerCase() === 's' || e.code === 'KeyS';
      const isK = e.key.toLowerCase() === 'k' || e.code === 'KeyK';
      const isJ = e.key.toLowerCase() === 'j' || e.code === 'KeyJ';
      const isL = e.key.toLowerCase() === 'l' || e.code === 'KeyL';
      const isUndo = e.key === 'Backspace' || (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey));

      // Handle Space: Start / Resume / Tap
      if (isSpace) {
        e.preventDefault();
        
        if (mode === 'idle') {
          startSync();
          return;
        }

        if (mode === 'paused') {
          resumeSync();
          return;
        }

        if (mode === 'syncing') {
          const now = performance.now();
          if (now - lastTapRef.current < debounceMs) return;
          lastTapRef.current = now;

          if (engine) {
            const audioTime = engine.mapEventToAudioTime(e.timeStamp, tapOffsetMs);
            tapLine(audioTime);
          }
        }
        return;
      }

      // Handle B (Instrumental / Silence marker)
      if (isB) {
        e.preventDefault();
        if (mode !== 'syncing' || !engine) return;

        const now = performance.now();
        if (now - lastTapRef.current < debounceMs) return;
        lastTapRef.current = now;

        const audioTime = engine.mapEventToAudioTime(e.timeStamp, tapOffsetMs);
        markSilence(audioTime);
        return;
      }

      // Handle S (Skip line)
      if (isS) {
        e.preventDefault();
        if (mode !== 'syncing') return;

        const now = performance.now();
        if (now - lastTapRef.current < debounceMs) return;
        lastTapRef.current = now;

        skipLine();
        return;
      }

      // Handle Undo (Backspace / Ctrl+Z)
      if (isUndo) {
        e.preventDefault();
        undoLastTap();
        // Rewind slightly to allow re-hearing and re-tapping the line
        if (engine && engine.clock?.isPlaying) {
          engine.seek(Math.max(0, engine.getCurrentTime() - 2.5));
        }
        return;
      }

      // Handle Transport K (Toggle play/pause)
      if (isK) {
        e.preventDefault();
        if (engine) {
          if (engine.clock?.isPlaying) {
            engine.pause();
            pauseSync();
          } else {
            engine.play();
            if (mode === 'paused' || mode === 'idle') {
              setMode('syncing');
            }
          }
        }
        return;
      }

      // Handle Transport J / L (Seek -3s / +3s)
      if (isJ) {
        e.preventDefault();
        if (engine) engine.seek(Math.max(0, engine.getCurrentTime() - 3));
        return;
      }

      if (isL) {
        e.preventDefault();
        if (engine) engine.seek(engine.getCurrentTime() + 3);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, mode, tapOffsetMs, debounceMs, tapLine, undoLastTap, skipLine, markSilence, startSync, resumeSync, pauseSync, setMode]);
}
