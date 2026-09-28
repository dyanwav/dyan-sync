import { useMemo } from 'react';
import { useProjectStore } from '@/features/project/store';
import { useAudioEngine } from '@/features/audio';
import { CanvasPreview, ThemeSelector, GRADIENT_PRESETS, createGradientBackground } from '@/features/viewer';
import { TransportControls } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/cn';
import { ArrowRight } from 'lucide-react';
import type { ThemePreset } from '@/features/project/types';
import { useTranslation } from '@/features/i18n';

export function PreviewScreen() {
  const { project, setView, updateSettings } = useProjectStore();
  const audio = useAudioEngine();
  const { t } = useTranslation();

  const bgBitmap = useMemo(() => {
    try {
      const presetId = project?.settings.theme.preset || 'dark';
      const preset = GRADIENT_PRESETS.find(p => p.id === presetId) || GRADIENT_PRESETS[0];
      return createGradientBackground(preset, 800, 1422);
    } catch {
      return null;
    }
  }, [project?.settings.theme.preset]);

  const currentFontFamily = project?.settings.theme.fontFamily || 'Plus Jakarta Sans';
  const currentFontSize = project?.settings.theme.fontSize || 50;

  const scene = {
    lines: project?.lines || [],
    theme: project?.settings.theme || { preset: 'dark' as const, fontFamily: 'Plus Jakarta Sans', fontSize: 50, lineSpacing: 1.35, lookaheadMs: 200 },
    background: bgBitmap,
    width: 800,
    height: 1422,
    fontFamily: currentFontFamily,
    fontSize: currentFontSize,
    lineHeight: 1.35,
    lookaheadMs: 200,
  };

  const handleThemeSelect = (preset: string) => {
    if (project) {
      updateSettings({ theme: { ...project.settings.theme, preset: preset as ThemePreset } });
    }
  };

  const handleFontSelect = (family: string) => {
    if (project) {
      updateSettings({ theme: { ...project.settings.theme, fontFamily: family } });
    }
  };

  const handleSizeSelect = (size: number) => {
    if (project) {
      updateSettings({ theme: { ...project.settings.theme, fontSize: size } });
    }
  };

  const FONT_OPTIONS = [
    { id: 'Plus Jakarta Sans', name: 'Plus Jakarta', preview: 'Modern Reel', class: 'font-sans' },
    { id: 'Syne', name: 'Syne Display', preview: 'Editorial Punch', class: 'font-display' },
    { id: 'Space Grotesk', name: 'Space Grotesk', preview: 'Tech Street', class: 'font-heading' },
    { id: 'Inter', name: 'Inter Classic', preview: 'Minimal Clean', class: 'font-sans' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 pt-4">
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 pb-6">
        
        {/* Left/Main Panel: Large Preview */}
        <div className="flex-[3] flex flex-col min-h-0 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden relative shadow-2xl flex items-center justify-center p-4">
          <div className="h-full aspect-[9/16] max-h-full rounded-xl overflow-hidden border border-zinc-700/60 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex items-center justify-center bg-black">
            <CanvasPreview 
              scene={scene} 
              getCurrentTime={() => audio.engine.getCurrentTime()} 
              isPlaying={audio.state.playbackState === 'playing'} 
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Right Panel: Settings */}
        <div className="flex-[1] flex flex-col gap-4 min-h-0 min-w-[320px]">
          <div className="flex-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-6 overflow-y-auto space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">{t('preview.theme')}</h2>
              <ThemeSelector 
                selectedThemeId={project?.settings.theme.preset || 'dark'} 
                onSelect={handleThemeSelect} 
              />
            </div>

            <div className="border-t border-zinc-800/80 pt-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Tipografía (Instagram Ready)</h2>
              <div className="grid grid-cols-1 gap-2">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFontSelect(f.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                      currentFontFamily === f.id
                        ? "bg-blue-600/15 border-blue-500/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    )}
                  >
                    <div>
                      <div className="font-bold text-sm text-zinc-100">{f.name}</div>
                      <div className="text-xs text-zinc-500">{f.preview}</div>
                    </div>
                    {currentFontFamily === f.id && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-800/80 pt-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Tamaño de Texto</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Compacto', size: 40 },
                  { label: 'Estándar', size: 50 },
                  { label: 'Impacto', size: 60 }
                ].map((s) => (
                  <button
                    key={s.size}
                    onClick={() => handleSizeSelect(s.size)}
                    className={cn(
                      "py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                      currentFontSize === s.size
                        ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
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
