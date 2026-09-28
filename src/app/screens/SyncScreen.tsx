import { useState, useEffect, useMemo, useRef } from 'react';
import { useProjectStore } from '@/features/project/store';
import { useSyncStore, useTapper } from '@/features/sync';
import { useAudioEngine } from '@/features/audio';
import { SyncView, CountdownOverlay, CalibrationWizard } from '@/features/sync';
import { TransportControls } from '@/features/audio';
import { CanvasPreview, GRADIENT_PRESETS, createGradientBackground } from '@/features/viewer';
import { Button } from '@/shared/ui/button';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/features/i18n';

export function SyncScreen() {
  const { project, setView } = useProjectStore();
  const { mode } = useSyncStore();
  const audio = useAudioEngine();
  const { t } = useTranslation();
  
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

  // Pause audio if sync is paused
  useEffect(() => {
    if (mode === 'paused') {
      audio.pause();
    }
  }, [mode, audio]);

  // Pre-render gradient background for preview
  const bgBitmap = useMemo(() => {
    try {
      const presetId = project?.settings.theme.preset || 'dark';
      const preset = GRADIENT_PRESETS.find(p => p.id === presetId) || GRADIENT_PRESETS[0];
      return createGradientBackground(preset, 800, 1422);
    } catch {
      return null;
    }
  }, [project?.settings.theme.preset]);

  const scene = {
    lines: project?.lines || [],
    theme: project?.settings.theme || { preset: 'dark' as const, fontFamily: 'Plus Jakarta Sans', fontSize: 50, lineSpacing: 1.35, lookaheadMs: 200 },
    background: bgBitmap,
    width: 800,
    height: 1422,
    fontFamily: project?.settings.theme.fontFamily || "'Plus Jakarta Sans', sans-serif",
    fontSize: 50,
    lineHeight: 1.35,
    lookaheadMs: 200,
  };

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
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 pt-4">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 pb-6">
        
        {/* Left Panel: Sync View */}
        <div className="flex-[3] flex flex-col min-h-0 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl overflow-hidden relative">
          <SyncView onOpenCalibration={() => setShowCalibration(true)} />
          <CountdownOverlay onComplete={() => audio.play()} />
        </div>

        {/* Right Panel: Preview & Info */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0">
          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-4 flex flex-col">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">{t('preview.title')}</h3>
            <div className="flex-1 rounded-lg overflow-hidden border border-zinc-800/50 relative bg-black flex items-center justify-center">
              <CanvasPreview 
                scene={scene} 
                getCurrentTime={() => audio.engine.getCurrentTime()} 
                isPlaying={audio.state.playbackState === 'playing'} 
                className="max-h-full max-w-full"
              />
            </div>
          </div>
          
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">{t('sync.instructions')}</h3>
            <ul className="text-sm text-zinc-300 space-y-2">
              <li><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-100 text-xs font-mono">Space</kbd> {t('shortcuts.space')}</li>
              <li><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-100 text-xs font-mono">Backspace</kbd> {t('shortcuts.backspace')}</li>
              <li><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-100 text-xs font-mono">Esc</kbd> {t('sync.pauseSync')} / {t('sync.resumeSync')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Transport & Actions */}
      <div className="h-20 shrink-0 rounded-xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl flex items-center justify-between px-6">
        <div className="flex-1">
          {/* Empty left area for balance */}
        </div>
        
        <div className="flex-1 flex justify-center">
          <TransportControls audio={audio} />
        </div>
        
        <div className="flex-1 flex justify-end">
          <Button 
            onClick={() => setView('preview')}
            disabled={mode === 'syncing' || mode === 'countdown'}
            className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            {t('sync.continueToPreview')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {showCalibration && (
        <CalibrationWizard open={showCalibration} onOpenChange={setShowCalibration} />
      )}
    </div>
  );
}
