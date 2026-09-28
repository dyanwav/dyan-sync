import { useEffect, useState } from 'react';
import { useSyncStore } from '../store';
import { useCountdown } from '../hooks/useCountdown';

export function CountdownOverlay({ preRollSec = 3, onComplete }: { preRollSec?: number; onComplete?: () => void }) {
  const { mode, setMode } = useSyncStore();
  const [displayValue, setDisplayValue] = useState<string | null>(null);

  const { countdownValue, startCountdown } = useCountdown(preRollSec, () => {
    setDisplayValue('GO!');
    setTimeout(() => {
      setMode('syncing');
      setDisplayValue(null);
      if (onComplete) onComplete();
    }, 500);
  });

  useEffect(() => {
    if (mode === 'countdown') {
      startCountdown();
    }
  }, [mode, startCountdown]);

  useEffect(() => {
    if (countdownValue !== null) {
      setDisplayValue(countdownValue.toString());
    }
  }, [countdownValue]);

  if (mode !== 'countdown' || !displayValue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
      <div 
        key={displayValue} // forces re-render for animation
        className="text-9xl font-bold text-white animate-in zoom-in-50 fade-in duration-500"
      >
        {displayValue}
      </div>
    </div>
  );
}
