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
import { ArrowRight, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Load custom photo bitmap whenever customImageDataUrl or contrast changes
  useEffect(() => {
    let cancelled = false;
    const loadCustom = async () => {
      if (project?.settings.theme.preset === 'custom' && project?.settings.theme.customImageDataUrl) {
        try {
          const contrast = project.settings.theme.contrast ?? 60;
          const bmp = await createCustomPhotoBackground(project.settings.theme.customImageDataUrl, 800, 1422, contrast);
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
  }, [project?.settings.theme.preset, project?.settings.theme.customImageDataUrl, project?.settings.theme.contrast]);

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

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="absolute top-3 right-3 z-10 p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 backdrop-blur-md cursor-pointer transition-all shadow-lg hover:scale-105"
              title="Ver en pantalla completa"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Panel: Themes & Typography */}
        <div className="flex-[1] flex flex-col gap-3 min-h-0 min-w-[320px]">
          <div className="flex-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-3.5 overflow-y-auto space-y-3.5">
            
            {/* Background Theme Selector */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2 flex items-center justify-between">
                <span>{t('preview.theme')}</span>
                <span className="text-[10px] font-normal text-zinc-500 font-mono">
                  {project?.settings.theme.preset === 'custom' ? 'Foto propia' : 'Gradiente'}
                </span>
              </h2>
              <ThemeSelector 
                selectedThemeId={project?.settings.theme.preset || 'dark'} 
                customImageDataUrl={project?.settings.theme.customImageDataUrl}
                contrast={project?.settings.theme.contrast ?? 60}
                onSelect={handleThemeSelect} 
                onUploadCustomImage={handleUploadCustomImage}
                onRemoveCustomImage={handleRemoveCustomImage}
                onContrastChange={(contrast) => {
                  if (project) {
                    updateSettings({
                      theme: {
                        ...project.settings.theme,
                        contrast
                      }
                    });
                  }
                }}
              />
            </div>

            {/* Typography Selector (2-column compact grid) */}
            <div className="border-t border-zinc-800/80 pt-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Tipografía
                </h2>
                <span className="text-[10px] font-mono text-blue-400 font-semibold truncate max-w-[150px]">
                  {currentFontFamily}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFontSelect(f.id)}
                    className={cn(
                      "flex flex-col items-start px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer",
                      currentFontFamily === f.id
                        ? "bg-blue-600/20 border-blue-500/80 text-white ring-1 ring-blue-500/50 shadow-sm"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    )}
                  >
                    <div className="font-bold text-xs text-zinc-100 truncate w-full flex items-center justify-between" style={{ fontFamily: `"${f.id}", sans-serif` }}>
                      <span className="truncate">{f.name}</span>
                      {currentFontFamily === f.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-1 shadow-[0_0_8px_#3b82f6]" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate w-full font-mono mt-0.5">{f.category}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Selector (compact row) */}
            <div className="border-t border-zinc-800/80 pt-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">Tamaño de Letra</h2>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Compacto', size: 40 },
                  { label: 'Estándar', size: 50 },
                  { label: 'Impacto', size: 60 }
                ].map((s) => (
                  <button
                    key={s.size}
                    onClick={() => handleSizeSelect(s.size)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-center",
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

      {/* Bottom Bar: Compact Studio Player Dock with Integrated Navigation */}
      <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-2xl px-4 py-2 flex justify-center shadow-[0_-10px_35px_rgba(0,0,0,0.5)] z-20">
        <div className="w-full max-w-5xl">
          <TransportControls 
            audio={audio}
            compact={true}
            leftActions={
              <Button 
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setView('sync')}
                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8 px-2.5 rounded-lg cursor-pointer"
                title="Volver a Sincronizar"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
            }
            rightActions={
              <Button 
                type="button"
                size="sm"
                onClick={() => setView('export')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-8 px-3 rounded-lg cursor-pointer shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                title="Continuar a Exportar"
              >
                <span>{t('preview.continueToExport')}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      </footer>

      {/* Fullscreen Theater Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 md:p-6 animate-in fade-in duration-200 select-none">
          {/* Top Fullscreen Header */}
          <div className="w-full max-w-5xl flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                {project?.meta.title || 'Vista Previa'}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {project?.meta.artist ? `• ${project.meta.artist}` : ''}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="bg-zinc-900/90 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800 text-xs h-9 px-3 rounded-xl cursor-pointer"
            >
              <Minimize2 className="w-4 h-4 mr-1.5 text-zinc-400" />
              <span>Salir de Pantalla Completa (Esc)</span>
            </Button>
          </div>

          {/* Centered 9:16 Cinematic Viewer */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
            <div className="h-full aspect-[9/16] max-h-[84vh] rounded-2xl overflow-hidden border border-zinc-800 shadow-[0_0_80px_rgba(0,0,0,0.95)] bg-black relative flex items-center justify-center">
              <CanvasPreview 
                scene={scene} 
                getCurrentTime={() => audio.engine.getCurrentTime()} 
                isPlaying={audio.state.playbackState === 'playing'} 
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Bottom Floating Minimal Player */}
          <div className="w-full max-w-xl z-10 pt-2">
            <TransportControls audio={audio} />
          </div>
        </div>
      )}
    </div>
  );
}
