import { useState, useEffect, useCallback, useRef } from 'react';

export function useCountdown(preRollSec: number = 3, onComplete?: () => void) {
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  const startCountdown = useCallback(() => {
    if (preRollSec <= 0) {
      if (onComplete) onComplete();
      return;
    }

    setIsActive(true);
    setCountdownValue(preRollSec);
    let current = preRollSec;

    const tick = () => {
      current -= 1;
      if (current > 0) {
        setCountdownValue(current);
        timerRef.current = window.setTimeout(tick, 1000);
      } else {
        setCountdownValue(null);
        setIsActive(false);
        if (onComplete) onComplete();
      }
    };

    timerRef.current = window.setTimeout(tick, 1000);
  }, [preRollSec, onComplete]);

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsActive(false);
    setCountdownValue(null);
  }, []);

  useEffect(() => {
    return () => cancelCountdown();
  }, [cancelCountdown]);

  return {
    countdownValue,
    isActive,
    startCountdown,
    cancelCountdown
  };
}
