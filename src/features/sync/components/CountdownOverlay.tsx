import { useEffect, useState, useRef, useCallback } from 'react';
import { useSyncStore } from '../store';
import { Button } from '@/shared/ui/button';
import { Play, X } from 'lucide-react';

function playMetronomeTick(freq: number = 880, durationMs: number = 70) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, durationMs + 200);
  } catch {
    // Ignore audio context error if browser blocks it
  }
}

export function CountdownOverlay({ preRollSec = 3, onComplete }: { preRollSec?: number; onComplete?: () => void }) {
  const { mode, setMode } = useSyncStore();
  const [count, setCount] = useState<number>(preRollSec);
  const [isGo, setIsGo] = useState<boolean>(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finishCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsGo(true);
    playMetronomeTick(1760, 140); // High chime for GO!
    setTimeout(() => {
      setMode('syncing');
      setIsGo(false);
      if (onCompleteRef.current) onCompleteRef.current();
    }, 450);
  }, [setMode]);

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMode('paused');
    setIsGo(false);
  }, [setMode]);

  useEffect(() => {
    if (mode !== 'countdown') {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsGo(false);
      return;
    }

    setCount(preRollSec);
    setIsGo(false);
    playMetronomeTick(880, 75);

    let current = preRollSec;
    timerRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCount(current);
        playMetronomeTick(880, 75);
      } else {
        clearInterval(timerRef.current!);
        finishCountdown();
      }
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelCountdown();
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        finishCountdown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, preRollSec, finishCountdown, cancelCountdown]);

  if (mode !== 'countdown') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-center">
        {/* Pulsing ring */}
        <div className="absolute -inset-12 rounded-full bg-blue-500/10 animate-ping opacity-40 pointer-events-none" />

        {/* Big Number / Go Indicator */}
        <div
          key={isGo ? 'go' : count}
          className="text-9xl md:text-[11rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400 drop-shadow-[0_0_60px_rgba(59,130,246,0.65)] animate-in zoom-in-75 duration-200 font-display select-none"
        >
          {isGo ? '¡YA!' : count}
        </div>

        <p className="mt-6 text-zinc-400 font-medium text-sm md:text-base tracking-wide uppercase">
          {isGo ? '¡A sincronizar!' : 'Prepárate para pulsar la letra'}
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-8 pointer-events-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={finishCountdown}
            className="bg-zinc-900/90 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800"
          >
            <Play className="mr-2 h-4 w-4 fill-white" />
            Empezar Ya (Espacio)
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelCountdown}
            className="text-zinc-400 hover:text-red-400 hover:bg-zinc-900/60"
          >
            <X className="mr-1.5 h-4 w-4" />
            Cancelar (Esc)
          </Button>
        </div>
      </div>
    </div>
  );
}
