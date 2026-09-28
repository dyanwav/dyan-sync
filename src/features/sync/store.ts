import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { LyricLine } from '@/features/project/types';

export type SyncAction = {
  type: 'tap' | 'skip' | 'silence';
  lineId: string;
  timestamp: number;
  previousState: { start: number | null; status: 'pending' | 'synced' | 'unassigned' };
};

export interface SyncState {
  mode: 'idle' | 'countdown' | 'syncing' | 'paused' | 'done';
  currentLineIndex: number;
  syncHistory: SyncAction[];
  isCalibrated: boolean;
  countdownValue: number | null;
  lines: LyricLine[];

  setLines: (lines: LyricLine[]) => void;
  startSync: () => void;
  tapLine: (audioTime: number) => void;
  undoLastTap: () => void;
  skipLine: () => void;
  markSilence: (audioTime: number) => void;
  pauseSync: () => void;
  resumeSync: () => void;
  finishSync: () => void;
  setCurrentLineIndex: (index: number) => void;
  setCountdownValue: (val: number | null) => void;
  setMode: (mode: SyncState['mode']) => void;
  setCalibrated: (val: boolean) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  mode: 'idle',
  currentLineIndex: 0,
  syncHistory: [],
  isCalibrated: false,
  countdownValue: null,
  lines: [],

  setLines: (lines) => set({ lines, currentLineIndex: 0, syncHistory: [], mode: 'idle' }),

  startSync: () => set({ mode: 'countdown', countdownValue: 3 }),

  tapLine: (audioTime) => {
    const { lines, currentLineIndex, syncHistory } = get();
    if (currentLineIndex >= lines.length) {
      set({ mode: 'done' });
      return;
    }

    const currentLine = lines[currentLineIndex];
    if (currentLine.text === '') {
      // Empty line skip automatically
      set({ currentLineIndex: currentLineIndex + 1 });
      get().tapLine(audioTime);
      return;
    }

    const newLines = [...lines];
    newLines[currentLineIndex] = {
      ...currentLine,
      start: audioTime,
      status: 'synced',
    };

    const action: SyncAction = {
      type: 'tap',
      lineId: currentLine.id,
      timestamp: audioTime,
      previousState: { start: currentLine.start, status: currentLine.status },
    };

    set({
      lines: newLines,
      currentLineIndex: currentLineIndex + 1,
      syncHistory: [...syncHistory.slice(-49), action],
    });

    if (currentLineIndex + 1 >= lines.length) {
      set({ mode: 'done' });
    }
  },

  undoLastTap: () => {
    const { lines, syncHistory } = get();
    if (syncHistory.length === 0) return;

    const lastAction = syncHistory[syncHistory.length - 1];
    const newHistory = syncHistory.slice(0, -1);
    
    // Find index of the line that was modified
    const lineIndex = lines.findIndex(l => l.id === lastAction.lineId);
    if (lineIndex === -1) return;

    const newLines = [...lines];
    
    if (lastAction.type === 'silence') {
      // Silence adds a new empty line. So we remove it.
      newLines.splice(lineIndex, 1);
      set({ lines: newLines, syncHistory: newHistory });
    } else {
      newLines[lineIndex] = {
        ...newLines[lineIndex],
        start: lastAction.previousState.start,
        status: lastAction.previousState.status,
      };
      set({
        lines: newLines,
        currentLineIndex: lineIndex,
        syncHistory: newHistory,
        mode: get().mode === 'done' ? 'syncing' : get().mode
      });
    }
  },

  skipLine: () => {
    const { lines, currentLineIndex, syncHistory } = get();
    if (currentLineIndex >= lines.length) return;

    const currentLine = lines[currentLineIndex];
    const newLines = [...lines];
    newLines[currentLineIndex] = {
      ...currentLine,
      status: 'unassigned',
    };

    const action: SyncAction = {
      type: 'skip',
      lineId: currentLine.id,
      timestamp: 0,
      previousState: { start: currentLine.start, status: currentLine.status },
    };

    set({
      lines: newLines,
      currentLineIndex: currentLineIndex + 1,
      syncHistory: [...syncHistory.slice(-49), action],
    });

    if (currentLineIndex + 1 >= lines.length) {
      set({ mode: 'done' });
    }
  },

  markSilence: (audioTime) => {
    const { lines, currentLineIndex, syncHistory } = get();
    
    const silenceLine: LyricLine = {
      id: uuidv4(),
      text: '',
      start: audioTime,
      end: null,
      status: 'synced',
      kind: 'lyric'
    };

    const newLines = [...lines];
    newLines.splice(currentLineIndex, 0, silenceLine);

    const action: SyncAction = {
      type: 'silence',
      lineId: silenceLine.id,
      timestamp: audioTime,
      previousState: { start: null, status: 'pending' },
    };

    set({
      lines: newLines,
      currentLineIndex: currentLineIndex + 1,
      syncHistory: [...syncHistory.slice(-49), action],
    });
  },

  pauseSync: () => set({ mode: 'paused' }),
  resumeSync: () => set({ mode: 'countdown', countdownValue: 3 }),
  finishSync: () => set({ mode: 'done' }),
  setCurrentLineIndex: (index) => set({ currentLineIndex: index }),
  setCountdownValue: (val) => set({ countdownValue: val }),
  setMode: (mode) => set({ mode }),
  setCalibrated: (val) => set({ isCalibrated: val }),
}));
