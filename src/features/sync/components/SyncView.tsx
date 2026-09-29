import { useState, useEffect, useRef } from 'react';
import { useSyncStore } from '../store';
import { useProjectStore } from '@/features/project/store';
import { useAudioEngine } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/cn';
import { 
  Undo2, 
  FileEdit, 
  Settings2, 
  ChevronUp, 
  ChevronDown, 
  RotateCcw,
  ArrowRight,
  Music2,
  ChevronLeft
} from 'lucide-react';
import { TransportControls } from '@/features/audio';
import { LineItem } from './LineItem';
import { EditLyricsModal } from './EditLyricsModal';
import { useTranslation } from '@/features/i18n';

interface SyncViewProps {
  onOpenCalibration?: () => void;
  onContinueToPreview?: () => void;
  onBackToSetup?: () => void;
}

export function SyncView({ onOpenCalibration, onContinueToPreview, onBackToSetup }: SyncViewProps) {
  const { 
    lines, 
    currentLineIndex, 
    mode, 
    tapLine,
    undoLastTap, 
    goToPreviousLine,
    goToNextLine,
  } = useSyncStore();
  const project = useProjectStore((s) => s.project);
  const audio = useAudioEngine();
  const { t } = useTranslation();
  
  const isPlaying = audio.state.playbackState === 'playing' || Boolean(audio.engine?.clock?.isPlaying);

  const [showEditModal, setShowEditModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Buttery-smooth rAF scroll animator with cubic ease-out
  const smoothScrollTo = (container: HTMLElement, targetTop: number, durationMs = 340) => {
    const startTop = container.scrollTop;
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 2) return;

    const startTime = performance.now();

    if ((container as any)._scrollAnimId) {
      cancelAnimationFrame((container as any)._scrollAnimId);
    }

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic ease out curve
      const ease = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = startTop + distance * ease;

      if (progress < 1) {
        (container as any)._scrollAnimId = requestAnimationFrame(step);
      } else {
        (container as any)._scrollAnimId = null;
      }
    };

    (container as any)._scrollAnimId = requestAnimationFrame(step);
  };

  // Auto-scroll active line to vertical center smoothly without jumps
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    
    // Find active element reliably via data-line-index attribute
    const el = container.querySelector<HTMLElement>(`[data-line-index="${currentLineIndex}"]`);
    if (el) {
      const targetScroll = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
      smoothScrollTo(container, Math.max(0, targetScroll), 340);
    }
  }, [currentLineIndex]);

  // Auto-follow active line in real time as audio plays or seeks
  useEffect(() => {
    let rAF: number;
    let lastCheckedTime = -1;

    const followPlayback = () => {
      if (audio.engine) {
        const currentTime = audio.engine.getCurrentTime();

        if (Math.abs(currentTime - lastCheckedTime) > 0.04) {
          lastCheckedTime = currentTime;

          // Find the synced line currently active at currentTime
          let matchedIdx: number | null = null;
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (l.kind === 'section' || l.text === '') continue;
            if (l.start !== null && l.start <= currentTime + 0.03) {
              matchedIdx = i;
            } else if (l.start !== null && l.start > currentTime + 0.03) {
              break;
            }
          }

          if (matchedIdx !== null && matchedIdx !== useSyncStore.getState().currentLineIndex) {
            // When in syncing mode, only auto-advance through already synced lines or if audio seeked
            if (mode === 'syncing') {
              const currentLine = lines[useSyncStore.getState().currentLineIndex];
              if (currentLine && currentLine.status === 'pending' && currentLine.start === null) {
                if (matchedIdx < useSyncStore.getState().currentLineIndex) {
                  useSyncStore.getState().setCurrentLineIndex(matchedIdx);
                }
              } else {
                useSyncStore.getState().setCurrentLineIndex(matchedIdx);
              }
            } else {
              useSyncStore.getState().setCurrentLineIndex(matchedIdx);
            }
          }
        }
      }
      rAF = requestAnimationFrame(followPlayback);
    };

    rAF = requestAnimationFrame(followPlayback);
    return () => cancelAnimationFrame(rAF);
  }, [audio.engine, lines, mode]);

  const syncedCount = lines.filter(l => l.status === 'synced').length;
  const totalLyrics = lines.filter(l => l.kind === 'lyric' && l.text !== '').length;
  const progressPercent = totalLyrics > 0 ? Math.round((syncedCount / totalLyrics) * 100) : 0;
  const hasSyncedLines = lines.some(l => l.start !== null);

  const handleUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();
    undoLastTap();
    if (audio.engine.clock.isPlaying) {
      audio.engine.seek(Math.max(0, audio.engine.getCurrentTime() - 2.5));
    }
  };


  const handlePrevLine = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();
    if (isPlaying) {
      goToPreviousLine((cueTime) => {
        const target = Math.max(0, cueTime > 0 ? cueTime - 1.5 : audio.engine.getCurrentTime() - 2.5);
        audio.engine.seek(target);
      });
    } else {
      goToPreviousLine((cueTime) => {
        audio.engine.seek(cueTime);
      });
    }
  };

  const handleNextLine = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();
    if (isPlaying) {
      const audioTime = audio.engine.mapEventToAudioTime(performance.now(), project?.settings.tapOffsetMs ?? -120);
      tapLine(audioTime);
    } else {
      goToNextLine((cueTime) => {
        audio.engine.seek(cueTime);
      });
    }
  };

  const handleRewindCurrent = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();
    const current = audio.engine.getCurrentTime();
    audio.engine.seek(Math.max(0, current - 2.5));
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none">
      
      {/* Top Studio Header Bar */}
      <header className="shrink-0 px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl flex flex-wrap justify-between items-center gap-2 sm:gap-4">
        {/* Left: Back button & Project info & Sync Mode */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          {onBackToSetup && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToSetup}
              disabled={mode === 'syncing' || mode === 'countdown'}
              className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8 sm:h-9 px-2 sm:px-2.5 shrink-0 cursor-pointer"
              title="Volver a Configuración"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1 text-zinc-400" />
              <span className="hidden sm:inline">Configuración</span>
            </Button>
          )}

          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Music2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-white truncate max-w-[110px] xs:max-w-[160px] sm:max-w-xs md:max-w-md">
                {project?.meta.title || t('sync.title')}
              </h1>
              <span className={cn(
                "text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full border shrink-0",
                mode === 'syncing' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse" :
                mode === 'paused' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                mode === 'countdown' ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                "bg-zinc-800 text-zinc-400 border-zinc-700"
              )}>
                {mode.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
              {project?.meta.artist || 'Sin artista'} • {syncedCount} de {totalLyrics} ({progressPercent}%)
            </p>
          </div>
        </div>

        {/* Center: Thin Progress Bar */}
        <div className="hidden lg:flex flex-col items-center gap-1 w-64">
          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Progreso general: {progressPercent}%
          </span>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowEditModal(true)}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8 sm:h-9 px-2 sm:px-3"
            title="Editar Letras"
          >
            <FileEdit className="h-3.5 w-3.5 sm:mr-1.5 text-blue-400" />
            <span className="hidden sm:inline">Editar Letras</span>
          </Button>

          {onOpenCalibration && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCalibration}
              className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8 sm:h-9 px-2 sm:px-3"
              title={t('sync.calibrate')}
            >
              <Settings2 className="h-3.5 w-3.5 sm:mr-1.5 text-zinc-400" />
              <span className="hidden sm:inline">{t('sync.calibrate')}</span>
            </Button>
          )}

          {onContinueToPreview && (
            <Button
              type="button"
              size="sm"
              onClick={onContinueToPreview}
              disabled={!hasSyncedLines || mode === 'syncing' || mode === 'countdown'}
              className={cn(
                "font-semibold text-xs h-8 sm:h-9 px-2.5 sm:px-3.5 transition-all cursor-pointer",
                hasSyncedLines && mode !== 'syncing' && mode !== 'countdown'
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.35)]"
                  : "bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-zinc-700/40"
              )}
              title={
                !hasSyncedLines
                  ? "Sincroniza al menos una línea con timestamp para continuar a la Vista Previa"
                  : mode === 'syncing' || mode === 'countdown'
                  ? "Pausa o detén la sincronización para continuar"
                  : "Continuar a Vista Previa"
              }
            >
              <span className="hidden xs:inline">{t('sync.continueToPreview')}</span>
              <span className="xs:hidden">Vista Previa</span>
              <ArrowRight className="ml-1 sm:ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Full-Width Lyric Stream (Musixmatch Style) */}
      <main className="flex-1 min-h-0 flex flex-col relative w-full overflow-hidden bg-black/40">
        
        {/* Subtle background cues */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),rgba(255,255,255,0))]" />

        {/* Native Smooth Scroll Container with Custom Scrollbar */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 sm:px-8 md:px-16 lg:px-28 py-4 sm:py-10 space-y-2 sm:space-y-3 custom-scrollbar relative z-10"
        >
          {lines.map((line, index) => (
            <LineItem
              key={line.id}
              line={line}
              index={index}
              isActive={index === currentLineIndex}
              activeRef={index === currentLineIndex ? activeLineRef : undefined}
            />
          ))}
          
          {/* Bottom extra cushion so last lines can be centered */}
          <div className="h-36 sm:h-44" />
        </div>
      </main>

      {/* Bottom Compact Studio Dock with Integrated Controls */}
      <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-2xl px-2 sm:px-4 py-1.5 sm:py-2 flex justify-center shadow-[0_-10px_35px_rgba(0,0,0,0.6)] z-20">
        <div className="w-full max-w-5xl">
          <TransportControls 
            audio={audio}
            leftActions={
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handlePrevLine}
                  disabled={currentLineIndex <= 0}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-zinc-900 border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-800 cursor-pointer shrink-0 transition-transform active:scale-95 flex items-center justify-center p-0"
                  title={isPlaying ? "Reintentar línea anterior (retrocede 1.5s) (Atajo: ↑ o P)" : "Línea anterior (Atajo: ↑ o P)"}
                >
                  <ChevronUp className="h-5 w-5 sm:h-5.5 sm:w-5.5 stroke-[2.2] text-zinc-300" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleNextLine}
                  disabled={currentLineIndex >= lines.length - 1}
                  className={cn(
                    "h-9 w-9 sm:h-10 sm:w-10 rounded-xl cursor-pointer shrink-0 transition-all active:scale-95 flex items-center justify-center p-0",
                    isPlaying
                      ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-800"
                  )}
                  title={isPlaying ? "Marcar timestamp de esta línea y avanzar (Atajo: ↓ o N)" : "Línea siguiente (Atajo: ↓ o N)"}
                >
                  <ChevronDown className={cn(
                    "h-5 w-5 sm:h-5.5 sm:w-5.5 stroke-[2.2]",
                    isPlaying ? "text-white" : "text-zinc-300"
                  )} />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRewindCurrent}
                  className="text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 h-8 sm:h-9 px-1.5 sm:px-2 rounded-lg cursor-pointer flex items-center"
                  title="Rebobinar 2.5s en línea actual (Atajo: R)"
                >
                  <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                  <span className="text-[10px] sm:text-xs">-2.5s</span>
                </Button>
              </div>
            }
            centerActions={
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-0.5 rounded-full border border-zinc-800/80">
                <span>Play/Pausa: <kbd className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700">Espacio</kbd></span>
                <span className="text-zinc-600">•</span>
                <span>Marcar/Avanzar: <kbd className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700">↓</kbd></span>
                <span className="text-zinc-600">•</span>
                <span>Anterior: <kbd className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700">↑</kbd></span>
              </div>
            }
            rightActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUndo}
                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white h-8 sm:h-9 px-2 sm:px-2.5 text-xs rounded-xl cursor-pointer flex items-center"
                title="Deshacer última marca (Backspace / Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5 sm:mr-1 text-amber-400" />
                <span className="hidden sm:inline">Deshacer</span>
              </Button>
            }
          />
        </div>
      </footer>

      {/* Edit Lyrics Modal */}
      <EditLyricsModal open={showEditModal} onOpenChange={setShowEditModal} />
    </div>
  );
}
