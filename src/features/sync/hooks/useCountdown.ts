import { useState, useEffect, useCallback, useRef } from 'react';

export function useCountdown(preRollSec: number = 3, onComplete?: () => void) {
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setCountdownValue(null);
  }, []);

  const startCountdown = useCallback(() => {
    cancelCountdown();

    if (preRollSec <= 0) {
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }

    setIsActive(true);
    setCountdownValue(preRollSec);
    let current = preRollSec;

    timerRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdownValue(current);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setCountdownValue(0);
        setIsActive(false);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, 1000);
  }, [preRollSec, cancelCountdown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    countdownValue,
    isActive,
    startCountdown,
    cancelCountdown,
  };
}
