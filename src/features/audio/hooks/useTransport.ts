import { useEffect } from 'react';

interface UseTransportProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (offset: number) => void;
}

export function useTransport({ isPlaying, onTogglePlay, onSeek }: UseTransportProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        (document.activeElement as HTMLElement).blur();
      }

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'j':
        case 'J':
        case 'ArrowLeft':
          e.preventDefault();
          onSeek(-3);
          break;
        case 'l':
        case 'L':
        case 'ArrowRight':
          e.preventDefault();
          onSeek(3);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, onTogglePlay, onSeek]);
}
