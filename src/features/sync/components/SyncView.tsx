import { useEffect, useRef } from 'react';
import { useSyncStore } from '../store';
import { useProjectStore } from '@/features/project/store';
import { useAudioEngine } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/utils/cn';
import { formatTime } from '@/shared/utils/format-time';
import { CheckCircle, Clock, SkipForward, Undo2, VolumeX, FastForward, Play, Pause } from 'lucide-react';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { useTranslation } from '@/features/i18n';

export function SyncView() {
  const { lines, currentLineIndex, mode, startSync, pauseSync, resumeSync, tapLine, undoLastTap, skipLine, markSilence } = useSyncStore();
  const project = useProjectStore((s) => s.project);
  const audio = useAudioEngine();
  const { t } = useTranslation();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex]);

  const syncedCount = lines.filter(l => l.status === 'synced').length;
  const totalLyrics = lines.filter(l => l.kind === 'lyric' && l.text !== '').length;

  const handleTap = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();

    if (mode === 'idle') {
      startSync();
      return;
    }

    if (mode === 'paused') {
      resumeSync();
      return;
    }

    if (mode === 'syncing' && audio.engine) {
      const audioTime = audio.engine.mapEventToAudioTime(e.timeStamp, project?.settings.tapOffsetMs ?? -120);
      tapLine(audioTime);
    }
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();
    undoLastTap();
    if (audio.engine.clock.isPlaying) {
      audio.engine.seek(Math.max(0, audio.engine.getCurrentTime() - 2.5));
    }
  };

  const handleSilence = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();
    if (audio.engine) {
      const audioTime = audio.engine.mapEventToAudioTime(e.timeStamp, project?.settings.tapOffsetMs ?? -120);
      markSilence(audioTime);
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).blur();
    skipLine();
  };

  const currentActiveLine = lines[currentLineIndex];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 gap-6 font-sans">
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading tracking-tight text-white flex items-center gap-3">
            <span>{t('sync.title')}</span>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {mode.toUpperCase()}
            </span>
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {t('sync.progress', { synced: syncedCount, total: totalLyrics })}
          </p>
        </div>
        <div className="flex gap-3">
          {mode === 'idle' || mode === 'done' ? (
            <Button 
              onClick={startSync} 
              variant="default"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              <Play className="mr-2 h-4 w-4 fill-white" />
              {t('sync.startSync')}
            </Button>
          ) : mode === 'syncing' ? (
            <Button 
              onClick={pauseSync} 
              variant="secondary"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-semibold"
            >
              <Pause className="mr-2 h-4 w-4 fill-zinc-100" />
              {t('sync.pauseSync')}
            </Button>
          ) : (
            <Button 
              onClick={resumeSync} 
              variant="default"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              <Play className="mr-2 h-4 w-4 fill-white" />
              {t('sync.resumeSync')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Main Lyrics Column */}
        <div className="flex-1 border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/40 backdrop-blur-xl relative">
          <ScrollArea className="h-full w-full p-4" ref={scrollRef}>
            <div className="flex flex-col gap-2.5 pb-20">
              {lines.map((line, index) => {
                const isActive = index === currentLineIndex;
                const isSynced = line.status === 'synced';
                const isSkipped = line.status === 'unassigned';
                const isSection = line.kind === 'section';

                if (isSection) {
                  return (
                    <div 
                      key={line.id} 
                      className="pt-4 pb-1 px-3 text-xs font-mono font-bold tracking-widest uppercase text-blue-400/80 border-b border-zinc-800/50"
                    >
                      {line.text}
                    </div>
                  );
                }

                if (line.text === '') {
                  return (
                    <div key={line.id} className="h-3 my-0.5 flex items-center justify-center opacity-30">
                      <div className="w-12 h-0.5 bg-zinc-700 rounded-full" />
                    </div>
                  );
                }

                return (
                  <div
                    key={line.id}
                    ref={isActive ? activeLineRef : null}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 border-l-4",
                      isActive
                        ? "border-blue-500 bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30"
                        : isSynced
                        ? "border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10"
                        : "border-transparent hover:bg-zinc-800/40 opacity-70"
                    )}
                  >
                    <div className="w-7 flex justify-center text-zinc-500 shrink-0">
                      {isSynced ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 animate-in zoom-in-75 duration-200" />
                      ) : isSkipped ? (
                        <SkipForward className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-base md:text-lg tracking-tight block truncate",
                        isActive ? "text-white font-bold tracking-normal" :
                        isSynced ? "text-zinc-200 font-medium" :
                        isSkipped ? "text-amber-400/80 line-through" :
                        "text-zinc-400"
                      )}>
                        {line.text}
                      </span>
                    </div>

                    {line.start !== null && (
                      <div className="text-xs font-mono font-semibold px-2 py-1 rounded bg-zinc-800/80 text-emerald-400/90 border border-zinc-700/60 shrink-0">
                        {formatTime(line.start)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Side Control Panel */}
        <div className="w-80 flex flex-col gap-4 shrink-0">
          {/* Active Phrase Hero Card */}
          <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/90 rounded-xl p-5 flex flex-col gap-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                Línea Actual
              </span>
              <span className="text-xs font-mono text-zinc-500">
                #{currentLineIndex + 1}
              </span>
            </div>
            <div className="min-h-[4.5rem] flex items-center justify-center p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/60">
              <p className="text-lg md:text-xl font-extrabold text-center text-white leading-snug line-clamp-2">
                {currentActiveLine?.text || "—"}
              </p>
            </div>
          </div>

          {/* Big Tactile TAP Button */}
          <button
            type="button"
            onClick={handleTap}
            className={cn(
              "w-full h-24 rounded-2xl text-white font-black text-xl transition-all duration-150 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 border select-none",
              mode === 'syncing'
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-white/30 shadow-[0_0_35px_rgba(79,70,229,0.4)]"
                : mode === 'paused'
                ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-white/20 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                : "bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 hover:from-zinc-700 hover:to-zinc-600 border-zinc-600"
            )}
          >
            <span className="tracking-wide">
              {mode === 'syncing' ? 'MARCAR LÍNEA' : mode === 'paused' ? 'REANUDAR' : 'EMPEZAR SYNC'}
            </span>
            <span className="text-xs font-mono font-medium px-3 py-0.5 rounded-full bg-black/40 text-white/80 border border-white/10">
              Presiona Espacio
            </span>
          </button>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white flex flex-col h-14 gap-1 p-1 text-xs"
              title="Deshacer (Backspace / Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4 text-amber-400" />
              <span>Deshacer</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSilence}
              className="bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white flex flex-col h-14 gap-1 p-1 text-xs"
              title="Silencio / Instrumental (B)"
            >
              <VolumeX className="h-4 w-4 text-purple-400" />
              <span>Silencio</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white flex flex-col h-14 gap-1 p-1 text-xs"
              title="Saltar línea (S)"
            >
              <FastForward className="h-4 w-4 text-blue-400" />
              <span>Saltar</span>
            </Button>
          </div>

          {/* Shortcuts Panel */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <KeyboardShortcutsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

