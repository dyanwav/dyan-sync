import { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '@/features/project/store';
import { useAudioEngine } from '@/features/audio';
import { 
  CanvasPreview, 
  ThemeSelector, 
  GRADIENT_PRESETS, 
  createGradientBackground, 
  createCustomPhotoBackground 
} from '@/features/viewer';
import { TransportControls } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/cn';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import type { ThemePreset } from '@/features/project/types';
import { useTranslation } from '@/features/i18n';

export const FONT_OPTIONS = [
  { id: 'Syne', name: 'Syne Display', preview: 'Editorial Punch (Recomendado)', category: 'Display' },
  { id: 'Bebas Neue', name: 'Bebas Neue', preview: 'Bold Urban Poster (Trap / Pop)', category: 'Display' },
  { id: 'Playfair Display', name: 'Playfair Display', preview: 'Luxury Serif (Baladas / Elegante)', category: 'Serif' },
  { id: 'Unbounded', name: 'Unbounded', preview: 'Cyber Modern (Electro / Future)', category: 'Display' },
  { id: 'Urbanist', name: 'Urbanist Bold', preview: 'Clean Contemporary (Minimal Reel)', category: 'Sans' },
  { id: 'Righteous', name: 'Righteous', preview: 'Retro Synthwave (80s / Disco)', category: 'Display' },
  { id: 'Cinzel', name: 'Cinzel Decorative', preview: 'Cinematic Grandeur (Orquestal / Épico)', category: 'Serif' },
];

export function PreviewScreen() {
  const { project, setView, updateSettings } = useProjectStore();
  const audio = useAudioEngine();
  const { t } = useTranslation();

  const [customBgBitmap, setCustomBgBitmap] = useState<ImageBitmap | null>(null);

  // Load custom photo bitmap whenever customImageDataUrl changes
  useEffect(() => {
    let cancelled = false;
    const loadCustom = async () => {
      if (project?.settings.theme.preset === 'custom' && project?.settings.theme.customImageDataUrl) {
        try {
          const bmp = await createCustomPhotoBackground(project.settings.theme.customImageDataUrl, 800, 1422);
          if (!cancelled) setCustomBgBitmap(bmp);
        } catch (err) {
          console.error('Error generating custom photo bitmap:', err);
          if (!cancelled) setCustomBgBitmap(null);
        }
      } else {
        if (!cancelled) setCustomBgBitmap(null);
      }
    };
    loadCustom();
    return () => {
      cancelled = true;
    };
  }, [project?.settings.theme.preset, project?.settings.theme.customImageDataUrl]);

  const bgBitmap = useMemo(() => {
    if (project?.settings.theme.preset === 'custom' && customBgBitmap) {
      return customBgBitmap;
    }
    try {
      const presetId = project?.settings.theme.preset || 'dark';
      const actualPresetId = presetId === 'custom' ? 'dark' : presetId;
      const preset = GRADIENT_PRESETS.find(p => p.id === actualPresetId) || GRADIENT_PRESETS[0];
      return createGradientBackground(preset, 800, 1422);
    } catch {
      return null;
    }
  }, [project?.settings.theme.preset, customBgBitmap]);

  // Ensure selected font is in the valid list; otherwise default to 'Syne'
  const currentFontFamily = useMemo(() => {
    const rawFont = project?.settings.theme.fontFamily;
    if (rawFont && FONT_OPTIONS.some(f => f.id === rawFont)) {
      return rawFont;
    }
    return 'Syne';
  }, [project?.settings.theme.fontFamily]);

  const currentFontSize = project?.settings.theme.fontSize || 50;

  const scene = {
    lines: project?.lines || [],
    theme: project?.settings.theme || { preset: 'dark' as const, fontFamily: 'Syne', fontSize: 50, lineSpacing: 1.35, lookaheadMs: 200 },
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

  const handleUploadCustomImage = (dataUrl: string) => {
    if (project) {
      updateSettings({
        theme: {
          ...project.settings.theme,
          preset: 'custom',
          customImageDataUrl: dataUrl,
        }
      });
    }
  };

  const handleRemoveCustomImage = () => {
    if (project) {
      updateSettings({
        theme: {
          ...project.settings.theme,
          preset: 'dark',
          customImageDataUrl: undefined,
        }
      });
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

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] animate-in fade-in duration-500 pt-2 pb-3">
      {/* Top Workspace: Left Preview + Right Studio Panel */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 pb-4">
        
        {/* Left/Main Panel: 9:16 Cinematic Viewer */}
        <div className="flex-[3] flex flex-col min-h-0 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 overflow-hidden relative shadow-2xl flex items-center justify-center p-4">
          <div className="h-full aspect-[9/16] max-h-full rounded-xl overflow-hidden border border-zinc-700/60 shadow-[0_0_50px_rgba(0,0,0,0.85)] relative flex items-center justify-center bg-black">
            <CanvasPreview 
              scene={scene} 
              getCurrentTime={() => audio.engine.getCurrentTime()} 
              isPlaying={audio.state.playbackState === 'playing'} 
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Right Panel: Themes & Typography */}
        <div className="flex-[1] flex flex-col gap-4 min-h-0 min-w-[340px]">
          <div className="flex-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 overflow-y-auto space-y-6">
            
            {/* Background Theme Selector */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3 flex items-center justify-between">
                <span>{t('preview.theme')}</span>
                <span className="text-[11px] font-normal text-zinc-500 font-mono">
                  {project?.settings.theme.preset === 'custom' ? 'Foto propia' : 'Gradiente'}
                </span>
              </h2>
              <ThemeSelector 
                selectedThemeId={project?.settings.theme.preset || 'dark'} 
                customImageDataUrl={project?.settings.theme.customImageDataUrl}
                onSelect={handleThemeSelect} 
                onUploadCustomImage={handleUploadCustomImage}
                onRemoveCustomImage={handleRemoveCustomImage}
              />
            </div>

            {/* Typography Selector (Syne Display + Brand New Fonts) */}
            <div className="border-t border-zinc-800/80 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                  Tipografía (Reels Ready)
                </h2>
                <span className="text-[11px] font-mono text-blue-400 font-semibold">
                  {currentFontFamily}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFontSelect(f.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                      currentFontFamily === f.id
                        ? "bg-blue-600/15 border-blue-500/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/50"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    )}
                  >
                    <div>
                      <div className="font-bold text-sm text-zinc-100 flex items-center gap-2" style={{ fontFamily: `"${f.id}", sans-serif` }}>
                        {f.name}
                        <span className="text-[10px] uppercase font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          {f.category}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{f.preview}</div>
                    </div>
                    {currentFontFamily === f.id && (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="border-t border-zinc-800/80 pt-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3">Tamaño de Letra</h2>
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

      {/* Bottom Bar: Full-Width Studio Player Dock with Navigation (Matching SyncView) */}
      <footer className="shrink-0 rounded-2xl border border-zinc-800/90 bg-zinc-950/95 backdrop-blur-2xl px-6 py-3.5 flex flex-col gap-3 shadow-[0_-10px_35px_rgba(0,0,0,0.5)] z-20">
        
        {/* Navigation Action Row */}
        <div className="w-full flex items-center justify-between">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setView('sync')}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-9 cursor-pointer"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            <span>Volver a Sincronizar</span>
          </Button>

          <Button 
            size="sm"
            onClick={() => setView('export')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.35)]"
          >
            <span>{t('preview.continueToExport')}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        {/* Player Dock (Identical to SyncView) */}
        <div className="w-full flex justify-center pt-2 border-t border-zinc-900">
          <div className="w-full max-w-4xl">
            <TransportControls audio={audio} />
          </div>
        </div>
      </footer>
    </div>
  );
}
