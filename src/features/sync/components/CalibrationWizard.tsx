import { useState } from 'react';
import { useCalibration } from '../hooks/useCalibration';
import { useSyncStore } from '../store';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/cn';

// Simple mock of Dialog components assuming standard shadcn names
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';

export function CalibrationWizard({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { setCalibrated } = useSyncStore();
  const { isCalibrating, currentBeat, totalBeats, startCalibration, cancelCalibration, result } = useCalibration();
  
  const [manualOffset, setManualOffset] = useState<number>(0);

  const handleStart = () => {
    startCalibration();
  };

  const handleCancel = () => {
    cancelCalibration();
    onOpenChange(false);
  };

  const handleAccept = () => {
    setCalibrated(true);
    // Ideally store the offset in a settings store, here just close
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) cancelCalibration();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-zinc-100 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Audio Calibration</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Tap SPACE along with the metronome beats to sync your reaction time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 gap-6">
          {!isCalibrating && !result && (
            <Button size="lg" onClick={handleStart} className="w-full">
              Start Calibration
            </Button>
          )}

          {isCalibrating && (
            <>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className={cn(
                  "absolute inset-0 rounded-full bg-blue-500/20",
                  "animate-[ping_0.6s_cubic-bezier(0,0,0.2,1)_infinite]"
                )} />
                <div className="relative w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">
                  {currentBeat}/{totalBeats}
                </div>
              </div>
              <p className="text-zinc-400">Tap SPACE on the beat...</p>
            </>
          )}

          {result && !isCalibrating && (
            <div className="flex flex-col gap-4 w-full">
              <div className="bg-zinc-900 p-4 rounded-md border border-zinc-800 text-center">
                <p className="text-sm text-zinc-400 mb-1">Calculated Offset</p>
                <p className="text-3xl font-bold text-green-400">{Math.round(result.tapOffsetMs)} ms</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm text-zinc-400">Manual Adjustment (ms)</label>
                <input
                  type="number"
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100"
                  value={manualOffset || Math.round(result.tapOffsetMs)}
                  onChange={(e) => setManualOffset(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          {result && !isCalibrating && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleStart}>Retry</Button>
              <Button variant="default" onClick={handleAccept}>Accept</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
