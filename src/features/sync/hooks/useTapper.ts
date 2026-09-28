import { useEffect } from 'react';
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
  _tapOffsetMs: number = -120,
  _debounceMs: number = 70
) {
  const { 
    mode, 
    undoLastTap, 
    pauseSync, 
    setMode,
    goToPreviousLine,
    goToNextLine,
  } = useSyncStore();

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

      const isK = e.key.toLowerCase() === 'k' || e.code === 'KeyK';
      const isJ = e.key.toLowerCase() === 'j' || e.code === 'KeyJ';
      const isL = e.key.toLowerCase() === 'l' || e.code === 'KeyL';
      const isUp = e.key === 'ArrowUp' || e.key.toLowerCase() === 'p';
      const isDown = e.key === 'ArrowDown' || e.key.toLowerCase() === 'n';
      const isR = e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey;
      const isEsc = e.key === 'Escape';
      const isUndo = e.key === 'Backspace' || (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey));

      // Handle Previous Line (ArrowUp or P)
      if (isUp) {
        e.preventDefault();
        goToPreviousLine((cueTime) => {
          if (engine) engine.seek(cueTime);
        });
        return;
      }

      // Handle Next Line (ArrowDown or N)
      if (isDown) {
        e.preventDefault();
        goToNextLine((cueTime) => {
          if (engine) engine.seek(cueTime);
        });
        return;
      }

      // Handle Rewind Current (R)
      if (isR) {
        e.preventDefault();
        if (engine) {
          const current = engine.getCurrentTime();
          engine.seek(Math.max(0, current - 2.5));
        }
        return;
      }

      // Handle Escape: Pause or cancel countdown
      if (isEsc) {
        e.preventDefault();
        if (mode === 'syncing') {
          pauseSync();
          if (engine) engine.pause();
        } else if (mode === 'countdown') {
          setMode('paused');
        }
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
  }, [
    engine, 
    mode, 
    undoLastTap, 
    pauseSync, 
    setMode, 
    goToPreviousLine, 
    goToNextLine
  ]);
}
