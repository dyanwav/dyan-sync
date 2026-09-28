import { useState, useEffect, useRef, useCallback } from 'react';

export interface CalibrationResult {
  tapOffsetMs: number;
  rawDeltas: number[];
  medianDelta: number;
}

export function useCalibration() {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);

  const totalBeats = 8;
  const bpm = 100;
  const beatIntervalMs = 60000 / bpm; // 600ms

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextBeatTimeRef = useRef<number>(0);
  const beatCountRef = useRef<number>(0);
  const expectedTimesRef = useRef<number[]>([]);
  const tapTimesRef = useRef<number[]>([]);
  const timerRef = useRef<number | null>(null);

  const playClick = useCallback((time: number) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    
    osc.frequency.value = 1000;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    
    osc.start(time);
    osc.stop(time + 0.1);
  }, []);

  const scheduleBeats = useCallback(() => {
    if (!audioContextRef.current) return;
    
    const lookahead = 25.0; 
    const scheduleAheadTime = 0.1;
    
    const schedule = () => {
      while (nextBeatTimeRef.current < audioContextRef.current!.currentTime + scheduleAheadTime && beatCountRef.current < totalBeats) {
        playClick(nextBeatTimeRef.current);
        
        expectedTimesRef.current.push(nextBeatTimeRef.current * 1000);
        setCurrentBeat(beatCountRef.current);
        
        nextBeatTimeRef.current += beatIntervalMs / 1000.0;
        beatCountRef.current++;
      }
      
      if (beatCountRef.current < totalBeats || expectedTimesRef.current.length > tapTimesRef.current.length) {
        timerRef.current = window.setTimeout(schedule, lookahead);
      } else if (beatCountRef.current >= totalBeats) {
        // Wait a bit for the last tap
        timerRef.current = window.setTimeout(() => {
          finishCalibration();
        }, 1000);
      }
    };
    
    schedule();
  }, [beatIntervalMs, playClick]);

  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCurrentBeat(0);
    setResult(null);
    expectedTimesRef.current = [];
    tapTimesRef.current = [];
    beatCountRef.current = 0;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    nextBeatTimeRef.current = ctx.currentTime + 0.5; // start in 500ms

    scheduleBeats();
  }, [scheduleBeats]);

  const cancelCalibration = useCallback(() => {
    setIsCalibrating(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const finishCalibration = useCallback(() => {
    setIsCalibrating(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    const deltas: number[] = [];
    for (let i = 0; i < Math.min(expectedTimesRef.current.length, tapTimesRef.current.length); i++) {
      // Delta = tapTime - expectedTime
      deltas.push(tapTimesRef.current[i] - expectedTimesRef.current[i]);
    }

    if (deltas.length === 0) {
      setResult(null);
      return;
    }

    deltas.sort((a, b) => a - b);
    const mid = Math.floor(deltas.length / 2);
    const median = deltas.length % 2 !== 0 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;

    setResult({
      tapOffsetMs: -median, // If user taps late (positive delta), offset is negative
      rawDeltas: deltas,
      medianDelta: median
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCalibrating || e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      
      if (!audioContextRef.current) return;
      
      // We want the time in ms based on audio context
      const tapTime = audioContextRef.current.currentTime * 1000;
      tapTimesRef.current.push(tapTime);

      if (tapTimesRef.current.length >= totalBeats) {
        finishCalibration();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalibrating, finishCalibration]);

  return {
    isCalibrating,
    currentBeat,
    totalBeats,
    startCalibration,
    cancelCalibration,
    result
  };
}
