import { useState } from 'react';
import type { LyricLine } from '@/features/project/types';
import { useSyncStore } from '../store';
import { useAudioEngine } from '@/features/audio';
import { formatTime } from '@/shared/utils/format-time';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Pencil, Check, X, Clock, Trash2 } from 'lucide-react';

interface LineItemProps {
  line: LyricLine;
  index: number;
  isActive: boolean;
  activeRef?: React.RefObject<HTMLDivElement | null>;
}

export function LineItem({ line, index, isActive, activeRef }: LineItemProps) {
  const { updateLineText, nudgeLineTiming, setLineTiming, clearLineTiming, setCurrentLineIndex } = useSyncStore();
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
        className="pt-4 pb-1.5 px-3 text-xs font-mono font-bold tracking-widest uppercase text-blue-400/90 border-b border-zinc-800/60 flex items-center justify-between"
      >
        <span>{line.text}</span>
        <span className="text-[10px] text-zinc-600 font-sans tracking-normal font-normal">Sección</span>
      </div>
    );
  }

  if (line.text === '') {
    return (
      <div key={line.id} className="h-4 my-0.5 flex items-center justify-center opacity-30">
        <div className="w-16 h-0.5 bg-zinc-700 rounded-full" />
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
        "group relative flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer border select-none",
        isActive
          ? "bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-transparent border-blue-500/70 shadow-[0_0_25px_rgba(59,130,246,0.18)] ring-1 ring-blue-500/40"
          : isSynced
          ? "bg-zinc-900/50 hover:bg-zinc-900/80 border-zinc-800/70 hover:border-zinc-700/80"
          : isSkipped
          ? "bg-zinc-950/40 border-dashed border-zinc-800/40 opacity-50"
          : "bg-transparent hover:bg-zinc-900/40 border-transparent hover:border-zinc-800/50 opacity-70 hover:opacity-100"
      )}
    >
      {/* Left: Index + Text */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
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
              className="h-8 text-sm bg-zinc-950 border-blue-500 text-white"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/20" onClick={handleSaveText}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:bg-zinc-800" onClick={handleCancelText}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={cn(
              "text-base md:text-lg tracking-tight truncate",
              isActive ? "text-white font-extrabold" :
              isSynced ? "text-zinc-100 font-semibold" :
              isSkipped ? "text-zinc-500 line-through" :
              "text-zinc-400 font-normal"
            )}>
              {line.text}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingText(true);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-zinc-200 rounded shrink-0"
              title="Editar texto"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Timestamp & Millisecond Fine-Tuning Controls */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
        {isSynced && line.start !== null ? (
          <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
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
          <div className="flex items-center gap-2">
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
