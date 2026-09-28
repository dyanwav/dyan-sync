import { useState } from 'react';
import { useProjectStore } from '@/features/project/store';
import { useSyncStore } from '@/features/sync';
import { useAudioEngine } from '@/features/audio';
import { SyncView, CountdownOverlay, CalibrationWizard } from '@/features/sync';
import { TransportControls } from '@/features/audio';
import { CanvasPreview } from '@/features/viewer';
import { Button } from '@/shared/ui/button';
import { ArrowRight, Settings2 } from 'lucide-react';

export function SyncScreen() {
  const { project, setView } = useProjectStore();
  const { mode } = useSyncStore();
  const audio = useAudioEngine();
  
  const [showCalibration, setShowCalibration] = useState(false);

  // Mock scene for preview
  const scene = {
    lines: project?.lines || [],
    theme: project?.settings.theme || { preset: 'dark', fontFamily: 'Inter', fontSize: 24, lineSpacing: 1.5, lookaheadMs: 2000 },
    background: null,
    width: 800,
    height: 1422,
    fontFamily: 'Inter',
    fontSize: 24,
    lineHeight: 1.5,
    lookaheadMs: 2000,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 pt-4">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 pb-6">
        
        {/* Left Panel: Sync View */}
        <div className="flex-[3] flex flex-col min-h-0 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl overflow-hidden relative">
          <SyncView />
          <CountdownOverlay />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalibration(true)}
            className="absolute top-4 right-4 bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-100 z-10"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Calibrate
          </Button>
        </div>

        {/* Right Panel: Preview & Info */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0">
          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-4 flex flex-col">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Preview</h3>
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
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Instructions</h3>
            <ul className="text-sm text-zinc-300 space-y-2">
              <li><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-100 text-xs font-mono">Space</kbd> Tap on the beat</li>
              <li><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-100 text-xs font-mono">Backspace</kbd> Undo last tap</li>
              <li><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-100 text-xs font-mono">Esc</kbd> Pause/Resume</li>
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
            Review & Export
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
