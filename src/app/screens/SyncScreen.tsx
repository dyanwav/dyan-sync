import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/features/project/store';
import { useSyncStore, useTapper } from '@/features/sync';
import { useAudioEngine } from '@/features/audio';
import { SyncView, CountdownOverlay, CalibrationWizard } from '@/features/sync';

export function SyncScreen() {
  const { project, setView } = useProjectStore();
  const { mode } = useSyncStore();
  const audio = useAudioEngine();
  
  const [showCalibration, setShowCalibration] = useState(false);

  // Mount tapper hook to listen for Space, Backspace, B, S, and transport
  useTapper(
    audio.engine,
    project?.settings.tapOffsetMs ?? -120,
    project?.settings.debounceMs ?? 70
  );

  // Sync project lines to sync store ONCE on enter
  const initializedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (project && initializedProjectRef.current !== project.id) {
      initializedProjectRef.current = project.id;
      if (project.lines && project.lines.length > 0) {
        useSyncStore.getState().setLines(project.lines);
      }
    }
  }, [project?.id]);

  // Pause audio if sync is paused or in countdown
  useEffect(() => {
    if (mode === 'paused' || mode === 'countdown') {
      audio.pause();
    }
  }, [mode, audio]);

  // Detect track end to auto-finish sync
  useEffect(() => {
    if (mode === 'syncing' && audio.state.playbackState !== 'playing' && audio.state.duration > 0) {
      if (audio.engine.clock.currentTime >= audio.state.duration - 0.2) {
        const { lines, currentLineIndex, setLines, finishSync } = useSyncStore.getState();
        if (currentLineIndex < lines.length) {
          const newLines = lines.map((l, i) => i >= currentLineIndex ? { ...l, status: 'unassigned' as const } : l);
          setLines(newLines);
        }
        finishSync();
      }
    }
  }, [audio.state.playbackState, mode, audio.state.duration, audio.engine.clock.currentTime]);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] animate-in fade-in duration-300 w-full pt-1">
      {/* Full-width Musixmatch-style Studio Workspace */}
      <div className="flex-1 min-h-0 flex flex-col w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl overflow-hidden relative shadow-2xl">
        <SyncView 
          onOpenCalibration={() => setShowCalibration(true)} 
          onContinueToPreview={() => setView('preview')}
        />
        <CountdownOverlay onComplete={() => audio.play()} />
      </div>

      {showCalibration && (
        <CalibrationWizard open={showCalibration} onOpenChange={setShowCalibration} />
      )}
    </div>
  );
}
