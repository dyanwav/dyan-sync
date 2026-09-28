import { useEffect, useRef } from 'react';
import { useSyncStore } from '../store';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/utils/cn';
import { formatTime } from '@/shared/utils/format-time';
import { CheckCircle, Clock, SkipForward } from 'lucide-react';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';

export function SyncView() {
  const { lines, currentLineIndex, mode, startSync, pauseSync, resumeSync } = useSyncStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex]);

  const syncedCount = lines.filter(l => l.status === 'synced').length;
  const totalLyrics = lines.filter(l => l.kind === 'lyric' && l.text !== '').length;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sync Lyrics</h2>
          <p className="text-zinc-400 text-sm">
            Progress: {syncedCount} / {totalLyrics} synced
          </p>
        </div>
        <div className="flex gap-4">
          {mode === 'idle' || mode === 'done' ? (
            <Button onClick={startSync} variant="default">Start Sync</Button>
          ) : mode === 'syncing' ? (
            <Button onClick={pauseSync} variant="secondary">Pause</Button>
          ) : (
            <Button onClick={resumeSync} variant="default">Resume</Button>
          )}
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50 relative">
          <ScrollArea className="h-full w-full p-4" ref={scrollRef}>
            <div className="flex flex-col gap-2">
              {lines.map((line, index) => {
                const isActive = index === currentLineIndex;
                const isSynced = line.status === 'synced';
                const isSkipped = line.status === 'unassigned';
                const isSection = line.kind === 'section';

                if (isSection) {
                  return (
                    <div key={line.id} className="py-2 text-zinc-500 font-semibold text-sm uppercase tracking-wider">
                      {line.text}
                    </div>
                  );
                }

                if (line.text === '') {
                  return (
                    <div key={line.id} className="h-4" />
                  );
                }

                return (
                  <div
                    key={line.id}
                    ref={isActive ? activeLineRef : null}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-md transition-all duration-200 border-l-4",
                      isActive
                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                        : isSynced
                        ? "border-green-500/50 bg-green-500/10"
                        : "border-transparent hover:bg-zinc-800/50"
                    )}
                  >
                    <div className="w-8 flex justify-center text-zinc-500">
                      {isSynced ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : isSkipped ? (
                        <SkipForward className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 text-lg">
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-blue-100 font-medium" :
                        isSynced ? "text-zinc-200" :
                        isSkipped ? "text-amber-500/70" :
                        "text-zinc-600"
                      )}>
                        {line.text}
                      </span>
                    </div>

                    {line.start !== null && (
                      <div className="text-xs font-mono text-zinc-500">
                        {formatTime(line.start)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="w-80 flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col gap-4">
            <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">Current Line</h3>
            <div className="text-xl font-medium min-h-[4rem] flex items-center text-blue-100 text-center justify-center">
              {lines[currentLineIndex]?.text || "---"}
            </div>
          </div>
          <KeyboardShortcutsPanel />
        </div>
      </div>
    </div>
  );
}

