import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { LyricLine } from '@/features/project/types';
import { useProjectStore } from '@/features/project/store';

export type SyncAction = {
  type: 'tap' | 'skip' | 'silence';
  lineId: string;
  timestamp: number;
  previousState: { start: number | null; end: number | null; status: 'pending' | 'synced' | 'unassigned' };
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
  tapLine: (audioTime: number, targetIndex?: number) => void;
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
  updateLineText: (id: string, text: string) => void;
  nudgeLineTiming: (id: string, deltaSeconds: number) => void;
  setLineTiming: (id: string, startSeconds: number) => void;
  clearLineTiming: (id: string) => void;
  goToPreviousLine: (seekCallback?: (time: number) => void) => void;
  goToNextLine: (seekCallback?: (time: number) => void) => void;
  syncFromLine: (targetIndex: number, seekCallback?: (time: number) => void) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  mode: 'idle',
  currentLineIndex: 0,
  syncHistory: [],
  isCalibrated: false,
  countdownValue: null,
  lines: [],

  setLines: (lines) => {
    let firstIdx = 0;
    while (firstIdx < lines.length && (lines[firstIdx].kind === 'section' || lines[firstIdx].text === '' || lines[firstIdx].status === 'synced')) {
      firstIdx++;
    }
    const initialIndex = firstIdx < lines.length ? firstIdx : 0;
    set({ lines, currentLineIndex: initialIndex, syncHistory: [], mode: 'idle' });
  },

  startSync: () => set({ mode: 'countdown', countdownValue: 3 }),

  tapLine: (audioTime, targetIndex) => {
    const { lines, currentLineIndex, syncHistory } = get();

    // Advance to next valid lyric line
    let activeIdx = targetIndex !== undefined ? targetIndex : currentLineIndex;
    while (activeIdx < lines.length && (lines[activeIdx].kind === 'section' || lines[activeIdx].text === '')) {
      activeIdx++;
    }

    if (activeIdx >= lines.length) {
      set({ mode: 'done' });
      return;
    }

    const currentLine = lines[activeIdx];
    const newLines = [...lines];

    // Set current line start and synced status
    newLines[activeIdx] = {
      ...currentLine,
      start: audioTime,
      status: 'synced',
    };

    // Close end of previous synced line
    for (let i = activeIdx - 1; i >= 0; i--) {
      if (newLines[i].status === 'synced') {
        newLines[i] = { ...newLines[i], end: audioTime };
        break;
      }
    }

    const action: SyncAction = {
      type: 'tap',
      lineId: currentLine.id,
      timestamp: audioTime,
      previousState: { start: currentLine.start, end: currentLine.end, status: currentLine.status },
    };

    // Move pointer to the next lyric line (auto-skipping section markers)
    let nextPointer = activeIdx + 1;
    while (nextPointer < lines.length && (newLines[nextPointer].kind === 'section' || newLines[nextPointer].text === '')) {
      nextPointer++;
    }

    const isFinished = nextPointer >= lines.length;

    set({
      lines: newLines,
      currentLineIndex: isFinished ? lines.length : nextPointer,
      syncHistory: [...syncHistory.slice(-49), action],
      mode: isFinished ? 'done' : 'syncing',
    });

    useProjectStore.getState().setLines(newLines);
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
      newLines.splice(lineIndex, 1);
      set({
        lines: newLines,
        currentLineIndex: Math.max(0, lineIndex),
        syncHistory: newHistory,
        mode: get().mode === 'done' ? 'syncing' : get().mode
      });
      useProjectStore.getState().setLines(newLines);
    } else {
      newLines[lineIndex] = {
        ...newLines[lineIndex],
        start: lastAction.previousState.start,
        end: lastAction.previousState.end,
        status: lastAction.previousState.status,
      };
      set({
        lines: newLines,
        currentLineIndex: lineIndex,
        syncHistory: newHistory,
        mode: get().mode === 'done' ? 'syncing' : get().mode
      });
      useProjectStore.getState().setLines(newLines);
    }
  },

  skipLine: () => {
    const { lines, currentLineIndex, syncHistory } = get();
    
    let activeIdx = currentLineIndex;
    while (activeIdx < lines.length && (lines[activeIdx].kind === 'section' || lines[activeIdx].text === '')) {
      activeIdx++;
    }

    if (activeIdx >= lines.length) return;

    const currentLine = lines[activeIdx];
    const newLines = [...lines];
    newLines[activeIdx] = {
      ...currentLine,
      status: 'unassigned',
    };

    const action: SyncAction = {
      type: 'skip',
      lineId: currentLine.id,
      timestamp: 0,
      previousState: { start: currentLine.start, end: currentLine.end, status: currentLine.status },
    };

    let nextPointer = activeIdx + 1;
    while (nextPointer < lines.length && (newLines[nextPointer].kind === 'section' || newLines[nextPointer].text === '')) {
      nextPointer++;
    }

    const isFinished = nextPointer >= lines.length;

    set({
      lines: newLines,
      currentLineIndex: isFinished ? lines.length : nextPointer,
      syncHistory: [...syncHistory.slice(-49), action],
      mode: isFinished ? 'done' : get().mode,
    });

    useProjectStore.getState().setLines(newLines);
  },

  markSilence: (audioTime) => {
    const { lines, currentLineIndex, syncHistory } = get();
    
    const silenceLine: LyricLine = {
      id: uuidv4(),
      text: '',
      start: audioTime,
      end: null,
      status: 'synced',
      kind: 'instrumental'
    };

    const newLines = [...lines];
    
    // Close end of previous synced line
    for (let i = currentLineIndex - 1; i >= 0; i--) {
      if (newLines[i].status === 'synced') {
        newLines[i] = { ...newLines[i], end: audioTime };
        break;
      }
    }

    newLines.splice(currentLineIndex, 0, silenceLine);

    const action: SyncAction = {
      type: 'silence',
      lineId: silenceLine.id,
      timestamp: audioTime,
      previousState: { start: null, end: null, status: 'pending' },
    };

    set({
      lines: newLines,
      currentLineIndex: currentLineIndex + 1,
      syncHistory: [...syncHistory.slice(-49), action],
    });

    useProjectStore.getState().setLines(newLines);
  },

  pauseSync: () => set({ mode: 'paused' }),
  resumeSync: () => set({ mode: 'countdown', countdownValue: 3 }),
  finishSync: () => set({ mode: 'done' }),
  setCurrentLineIndex: (index) => set({ currentLineIndex: index }),
  setCountdownValue: (val) => set({ countdownValue: val }),
  setMode: (mode) => set({ mode }),
  setCalibrated: (val) => set({ isCalibrated: val }),

  updateLineText: (id, text) => {
    const { lines } = get();
    const newLines = lines.map(l => l.id === id ? { ...l, text } : l);
    set({ lines: newLines });
    useProjectStore.getState().setLines(newLines);
  },

  nudgeLineTiming: (id, deltaSeconds) => {
    const { lines } = get();
    const newLines = lines.map(l => {
      if (l.id === id) {
        const currentStart = l.start ?? 0;
        const newStart = Math.max(0, Number((currentStart + deltaSeconds).toFixed(3)));
        return { ...l, start: newStart, status: 'synced' as const };
      }
      return l;
    });

    // Re-derive end times for synced lines
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].status === 'synced' && newLines[i].start !== null) {
        let nextStart: number | null = null;
        for (let j = i + 1; j < newLines.length; j++) {
          if (newLines[j].start !== null) {
            nextStart = newLines[j].start;
            break;
          }
        }
        newLines[i] = { ...newLines[i], end: nextStart };
      }
    }

    set({ lines: newLines });
    useProjectStore.getState().setLines(newLines);
  },

  setLineTiming: (id, startSeconds) => {
    const { lines } = get();
    const validStart = Math.max(0, Number(startSeconds.toFixed(3)));
    const newLines = lines.map(l => l.id === id ? { ...l, start: validStart, status: 'synced' as const } : l);

    // Re-derive end times
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].status === 'synced' && newLines[i].start !== null) {
        let nextStart: number | null = null;
        for (let j = i + 1; j < newLines.length; j++) {
          if (newLines[j].start !== null) {
            nextStart = newLines[j].start;
            break;
          }
        }
        newLines[i] = { ...newLines[i], end: nextStart };
      }
    }

    set({ lines: newLines });
    useProjectStore.getState().setLines(newLines);
  },

  clearLineTiming: (id) => {
    const { lines } = get();
    const newLines = lines.map(l => l.id === id ? { ...l, start: null, end: null, status: 'pending' as const } : l);

    // Re-derive end times for synced lines
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].status === 'synced' && newLines[i].start !== null) {
        let nextStart: number | null = null;
        for (let j = i + 1; j < newLines.length; j++) {
          if (newLines[j].start !== null) {
            nextStart = newLines[j].start;
            break;
          }
        }
        newLines[i] = { ...newLines[i], end: nextStart };
      }
    }

    set({ lines: newLines });
    useProjectStore.getState().setLines(newLines);
  },

  goToPreviousLine: (seekCallback) => {
    const { lines, currentLineIndex } = get();
    if (lines.length === 0) return;

    let targetIdx = currentLineIndex - 1;
    while (targetIdx >= 0 && (lines[targetIdx].kind === 'section' || lines[targetIdx].text === '')) {
      targetIdx--;
    }

    if (targetIdx < 0) {
      let first = 0;
      while (first < lines.length && (lines[first].kind === 'section' || lines[first].text === '')) {
        first++;
      }
      targetIdx = first < lines.length ? first : 0;
    }

    set({ currentLineIndex: targetIdx });

    const targetLine = lines[targetIdx];
    if (targetLine && targetLine.start !== null) {
      if (seekCallback) seekCallback(targetLine.start);
    } else {
      let prevSyncedStart: number | null = null;
      for (let i = targetIdx - 1; i >= 0; i--) {
        if (lines[i].status === 'synced' && lines[i].start !== null) {
          prevSyncedStart = lines[i].start;
          break;
        }
      }
      if (prevSyncedStart !== null && seekCallback) {
        seekCallback(prevSyncedStart);
      }
    }
  },

  goToNextLine: (seekCallback) => {
    const { lines, currentLineIndex } = get();
    if (lines.length === 0) return;

    let targetIdx = currentLineIndex + 1;
    while (targetIdx < lines.length && (lines[targetIdx].kind === 'section' || lines[targetIdx].text === '')) {
      targetIdx++;
    }

    if (targetIdx >= lines.length) return;

    set({ currentLineIndex: targetIdx });

    const targetLine = lines[targetIdx];
    if (targetLine && targetLine.start !== null && seekCallback) {
      seekCallback(targetLine.start);
    }
  },

  syncFromLine: (targetIndex, seekCallback) => {
    const { lines } = get();
    if (targetIndex < 0 || targetIndex >= lines.length) return;
    if (lines[targetIndex].kind === 'section' || lines[targetIndex].text === '') return;

    set({ currentLineIndex: targetIndex });

    const targetLine = lines[targetIndex];
    if (targetLine && targetLine.start !== null) {
      if (seekCallback) seekCallback(targetLine.start);
    } else {
      let prevSyncedStart: number | null = null;
      for (let i = targetIndex - 1; i >= 0; i--) {
        if (lines[i].status === 'synced' && lines[i].start !== null) {
          prevSyncedStart = lines[i].start;
          break;
        }
      }
      if (prevSyncedStart !== null && seekCallback) {
        seekCallback(Math.max(0, Number((prevSyncedStart - 1).toFixed(3))));
      }
    }
  },
}));
