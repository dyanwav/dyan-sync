import { useState } from 'react';
import type { LyricLine } from '@/features/project/types';
import { useSyncStore } from '../store';
import { useAudioEngine } from '@/features/audio';
import { formatTime } from '@/shared/utils/format-time';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Pencil, Check, X, Clock, Trash2, RotateCcw, Target, ChevronUp, ChevronDown } from 'lucide-react';

interface LineItemProps {
  line: LyricLine;
  index: number;
  isActive: boolean;
  activeRef?: React.RefObject<HTMLDivElement | null>;
}

export function LineItem({ line, index, isActive, activeRef }: LineItemProps) {
  const { 
    mode, 
    updateLineText, 
    nudgeLineTiming, 
    setLineTiming, 
    clearLineTiming, 
    setCurrentLineIndex, 
    syncFromLine,
    goToPreviousLine,
    goToNextLine,
  } = useSyncStore();
  const audio = useAudioEngine();

  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(line.text);

  const isSynced = line.status === 'synced' && line.start !== null;
  const isSkipped = line.status === 'unassigned';
  const isSection = line.kind === 'section';

  if (isSection) {
    return (
      <div 
        key={line.id} 
        className="pt-6 pb-2 px-4 text-xs font-mono font-bold tracking-widest uppercase text-blue-400 border-b border-zinc-800/80 flex items-center justify-between"
      >
        <span>{line.text}</span>
        <span className="text-[10px] text-zinc-600 font-sans tracking-normal font-normal">Sección</span>
      </div>
    );
  }

  if (line.text === '') {
    return (
      <div key={line.id} className="h-6 my-1 flex items-center justify-center opacity-30">
        <div className="w-24 h-0.5 bg-zinc-700 rounded-full" />
      </div>
    );
  }

  const handleSaveText = () => {
    if (editText.trim()) {
      updateLineText(line.id, editText.trim());
    }
    setIsEditingText(false);
  };

  const handleCancelText = () => {
    setEditText(line.text);
    setIsEditingText(false);
  };

  const handleLineClick = () => {
    setCurrentLineIndex(index);
    if (line.start !== null) {
      audio.engine.seek(line.start);
    }
  };

  const handleSyncFromHere = (e: React.MouseEvent) => {
    e.stopPropagation();
    syncFromLine(index, (cueTime) => {
      audio.engine.seek(cueTime);
    });
    if (audio.state.playbackState !== 'playing') {
      audio.play();
      if (mode !== 'syncing') {
        useSyncStore.getState().setMode('syncing');
      }
    }
  };

  const handleRewindCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = audio.engine.getCurrentTime();
    const target = Math.max(0, current - 2.5);
    audio.engine.seek(target);
    if (audio.state.playbackState !== 'playing') {
      audio.play();
    }
  };

  const handlePrevLine = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToPreviousLine((cueTime) => {
      audio.engine.seek(cueTime);
    });
  };

  const handleNextLine = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToNextLine((cueTime) => {
      audio.engine.seek(cueTime);
    });
  };

  const handleSnapToPlayhead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = audio.engine.getCurrentTime();
    setLineTiming(line.id, current);
  };

  const handleNudge = (e: React.MouseEvent, deltaSec: number) => {
    e.stopPropagation();
    nudgeLineTiming(line.id, deltaSec);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearLineTiming(line.id);
  };

  return (
    <div
      ref={isActive ? activeRef : null}
      onClick={handleLineClick}
      className={cn(
        "group relative flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl transition-all duration-200 cursor-pointer border select-none w-full",
        isActive
          ? "bg-gradient-to-r from-blue-600/25 via-indigo-600/15 to-transparent border-blue-500/80 shadow-[0_0_30px_rgba(59,130,246,0.22)] ring-1 ring-blue-500/50 scale-[1.005]"
          : isSynced
          ? "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700/80"
          : isSkipped
          ? "bg-zinc-950/30 border-dashed border-zinc-800/50 opacity-40"
          : "bg-transparent hover:bg-zinc-900/30 border-transparent hover:border-zinc-800/50 opacity-60 hover:opacity-100"
      )}
    >
      {/* Left: Indicator, Index + Text */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {isActive && (
          <div className="w-1.5 h-6 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)] shrink-0" />
        )}

        <span className={cn(
          "font-mono text-xs shrink-0 w-6 text-center",
          isActive ? "text-blue-400 font-bold" : "text-zinc-600 font-medium"
        )}>
          {String(index + 1).padStart(2, '0')}
        </span>

        {isEditingText ? (
          <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveText();
                if (e.key === 'Escape') handleCancelText();
              }}
              autoFocus
              className="h-9 text-base bg-zinc-950 border-blue-500 text-white"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/20" onClick={handleSaveText}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:bg-zinc-800" onClick={handleCancelText}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={cn(
              "tracking-tight truncate transition-all duration-150",
              isActive ? "text-lg md:text-xl font-black text-white" :
              isSynced ? "text-base md:text-lg font-medium text-zinc-200" :
              isSkipped ? "text-base md:text-lg text-zinc-500 line-through" :
              "text-base md:text-lg text-zinc-400 font-normal"
            )}>
              {line.text}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingText(true);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-500 hover:text-zinc-200 rounded shrink-0"
              title="Editar texto de la línea"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Timestamp & Controls */}
      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
        {isActive && (
          <div className="flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/40 p-1 rounded-xl">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
              ACTIVA
            </span>

            {/* Musixmatch Navigation on Active Line */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handlePrevLine}
              className="h-7 text-xs font-mono text-zinc-300 hover:text-white hover:bg-blue-500/20 px-2"
              title="Línea anterior (-2.5s) (Atajo: ↑ o P)"
            >
              <ChevronUp className="h-3.5 w-3.5 mr-0.5 text-blue-400" />
              Ant.
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRewindCurrent}
              className="h-7 text-xs font-mono text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 px-2"
              title="Rebobinar 2.5s para volver a marcar esta línea (Atajo: R)"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Re-marcar
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleNextLine}
              className="h-7 text-xs font-mono text-zinc-300 hover:text-white hover:bg-blue-500/20 px-2"
              title="Línea siguiente (Atajo: ↓ o N)"
            >
              Sig.
              <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-blue-400" />
            </Button>
          </div>
        )}

        {isSynced && line.start !== null ? (
          <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
            {/* Fine Nudge Controls */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => handleNudge(e, -0.1)}
                className="px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800/80 transition-colors"
                title="Retroceder 100ms (-0.1s)"
              >
                -100ms
              </button>
              <button
                type="button"
                onClick={(e) => handleNudge(e, -0.01)}
                className="px-1 py-0.5 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800/80 transition-colors"
                title="Retroceder 10ms (-0.01s)"
              >
                -10ms
              </button>
            </div>

            {/* Current Timestamp Display */}
            <div className={cn(
              "font-mono text-xs font-bold px-2 py-0.5 rounded",
              isActive ? "bg-blue-600/30 text-blue-200 border border-blue-500/40" : "bg-zinc-900 text-zinc-200"
            )}>
              {formatTime(line.start)}
            </div>

            {/* Forward Nudge Controls */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => handleNudge(e, 0.01)}
                className="px-1 py-0.5 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800/80 transition-colors"
                title="Avanzar 10ms (+0.01s)"
              >
                +10ms
              </button>
              <button
                type="button"
                onClick={(e) => handleNudge(e, 0.1)}
                className="px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800/80 transition-colors"
                title="Avanzar 100ms (+0.1s)"
              >
                +100ms
              </button>
            </div>

            {/* Snap to current playhead */}
            <button
              type="button"
              onClick={handleSnapToPlayhead}
              className="p-1 text-zinc-400 hover:text-blue-400 rounded hover:bg-blue-500/10 transition-colors"
              title="Fijar al tiempo actual del audio"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>

            {/* Sync from here (jump to this line and start playback) */}
            {!isActive && (
              <button
                type="button"
                onClick={handleSyncFromHere}
                className="p-1 text-zinc-400 hover:text-blue-400 rounded hover:bg-blue-500/10 transition-colors"
                title="Sincronizar desde esta línea (rebobina 2.5s y reproduce)"
              >
                <Target className="h-3.5 w-3.5 text-blue-400" />
              </button>
            )}

            {/* Clear timing */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
              title="Quitar sincronización"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {!isActive && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSyncFromHere}
                className="h-7 text-xs font-mono text-zinc-400 hover:text-blue-300 hover:bg-blue-500/10 px-2"
                title="Sincronizar desde esta línea (rebobina 2.5s y reproduce)"
              >
                <Target className="mr-1 h-3 w-3 text-blue-400" />
                Sincronizar desde aquí
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleSnapToPlayhead}
              className="h-7 text-xs font-mono text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 px-2"
              title="Sincronizar esta línea con el tiempo actual del reproductor"
            >
              <Clock className="mr-1.5 h-3 w-3" />
              Sincronizar aquí
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
