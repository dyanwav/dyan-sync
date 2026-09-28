import { useState } from 'react';
import type { LyricLine } from '@/features/project/types';
import { useSyncStore } from '../store';
import { useAudioEngine } from '@/features/audio';
import { formatTime } from '@/shared/utils/format-time';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Pencil, Check, X, Trash2, Minus, Plus, Play } from 'lucide-react';

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

  const handlePlayFromLine = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentLineIndex(index);

    let seekTarget = 0;
    if (line.start !== null) {
      seekTarget = line.start;
    } else {
      const { lines } = useSyncStore.getState();
      for (let i = index - 1; i >= 0; i--) {
        if (lines[i].start !== null) {
          seekTarget = lines[i].start!;
          break;
        }
      }
    }

    audio.engine.seek(seekTarget);
    audio.play();
    if (mode !== 'syncing') {
      useSyncStore.getState().setMode('syncing');
    }
  };

  const handleSnapToPlayhead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = audio.engine.getCurrentTime();
    setLineTiming(line.id, current);
  };

  const handleNudge = (e: React.MouseEvent, deltaSec: number) => {
    e.stopPropagation();
    if (line.start === null) {
      const current = audio.engine.getCurrentTime();
      setLineTiming(line.id, current);
    } else {
      nudgeLineTiming(line.id, deltaSec);
    }
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
        "group relative flex items-center justify-between gap-4 px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer border select-none w-full",
        isActive
          ? "bg-gradient-to-r from-blue-600/25 via-indigo-600/15 to-transparent border-blue-500/80 shadow-[0_0_30px_rgba(59,130,246,0.22)] ring-1 ring-blue-500/50 scale-[1.004]"
          : isSynced
          ? "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700/80"
          : isSkipped
          ? "bg-zinc-950/30 border-dashed border-zinc-800/50 opacity-40"
          : "bg-transparent hover:bg-zinc-900/30 border-transparent hover:border-zinc-800/50 opacity-60 hover:opacity-100"
      )}
    >
      {/* Left: Indicator + Timing cluster [-] timestamp [+] [>] */}
      <div className="flex items-center gap-3 shrink-0">
        {isActive && (
          <div className="w-1.5 h-6 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)] shrink-0" />
        )}

        {/* Timing cluster: [-] timestamp [+] [>] */}
        <div className="flex items-center bg-zinc-950/90 rounded-xl border border-zinc-800 p-0.5 shadow-inner">
          {/* Subtract button [-] */}
          <button
            type="button"
            onClick={(e) => handleNudge(e, e.shiftKey ? -0.01 : -0.05)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Restar 50ms (Shift+clic: -10ms)"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          {/* Timestamp text */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleSnapToPlayhead(e);
            }}
            className={cn(
              "font-mono text-xs font-bold px-2 py-0.5 rounded min-w-[65px] text-center select-none cursor-pointer hover:bg-zinc-800/60 transition-colors",
              isActive
                ? "bg-blue-600/30 text-blue-200 border border-blue-500/40"
                : isSynced
                ? "text-zinc-200"
                : "text-zinc-600"
            )}
            title={isSynced ? "Tiempo [mm:ss.xx] (clic para fijar a cabezal)" : "Pendiente (clic para fijar al audio actual)"}
          >
            {isSynced && line.start !== null ? formatTime(line.start) : "--:--.--"}
          </div>

          {/* Add button [+] */}
          <button
            type="button"
            onClick={(e) => handleNudge(e, e.shiftKey ? 0.01 : 0.05)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Sumar 50ms (Shift+clic: +10ms)"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {/* Play from this line button [>] */}
          <button
            type="button"
            onClick={handlePlayFromLine}
            className="ml-1 p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 transition-all shadow-sm"
            title="Reproducir desde esta línea [>]"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </button>
        </div>

        {/* Delete timestamp button (hover only if synced) */}
        {isSynced && (
          <button
            type="button"
            onClick={handleClear}
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 rounded transition-opacity"
            title="Quitar sincronización"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Main Lyric Text Area (takes remaining width) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
              isSynced ? "text-base md:text-lg font-semibold text-zinc-200" :
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
    </div>
  );
}
