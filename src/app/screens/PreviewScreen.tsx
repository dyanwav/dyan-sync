import { useProjectStore } from '@/features/project/store';
import { useAudioEngine } from '@/features/audio';
import { CanvasPreview, ThemeSelector } from '@/features/viewer';
import { TransportControls } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { ArrowRight } from 'lucide-react';
import type { ThemePreset } from '@/features/project/types';
import { useTranslation } from '@/features/i18n';

export function PreviewScreen() {
  const { project, setView, updateSettings } = useProjectStore();
  const audio = useAudioEngine();
  const { t } = useTranslation();

  const scene = {
    lines: project?.lines || [],
    theme: project?.settings.theme || { preset: 'dark', fontFamily: 'Inter', fontSize: 24, lineSpacing: 1.5, lookaheadMs: 2000 },
    background: null,
    width: 800,
    height: 1422,
    fontFamily: project?.settings.theme.fontFamily || 'Inter',
    fontSize: project?.settings.theme.fontSize || 24,
    lineHeight: project?.settings.theme.lineSpacing || 1.5,
    lookaheadMs: project?.settings.theme.lookaheadMs || 2000,
  };

  const handleThemeSelect = (preset: string) => {
    if (project) {
      updateSettings({ theme: { ...project.settings.theme, preset: preset as ThemePreset } });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 pt-4">
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 pb-6">
        
        {/* Left/Main Panel: Large Preview */}
        <div className="flex-[3] flex flex-col min-h-0 rounded-xl border border-zinc-800/80 bg-black overflow-hidden relative shadow-2xl flex items-center justify-center">
          <CanvasPreview 
            scene={scene} 
            getCurrentTime={() => audio.engine.getCurrentTime()} 
            isPlaying={audio.state.playbackState === 'playing'} 
            className="h-full w-auto"
          />
        </div>

        {/* Right Panel: Settings */}
        <div className="flex-[1] flex flex-col gap-4 min-h-0 min-w-[300px]">
          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-6 overflow-y-auto">
            <h2 className="text-xl font-semibold text-zinc-100 mb-6">{t('preview.theme')}</h2>
            <ThemeSelector 
              selectedThemeId={project?.settings.theme.preset || 'dark'} 
              onSelect={handleThemeSelect} 
            />
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
            onClick={() => setView('export')}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {t('preview.continueToExport')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
