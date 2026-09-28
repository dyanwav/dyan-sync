import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project, LyricLine, ProjectSettings, ProjectMeta, ViewState } from './types';

export interface ProjectState {
  // Project Data
  project: Project | null;
  
  // UI State
  view: ViewState;
  hasAcceptedLegal: boolean;
  
  // Actions
  setProject: (project: Project | null) => void;
  acceptLegal: () => void;
  updateLine: (id: string, updates: Partial<LyricLine>) => void;
  updateLines: (updates: Array<{ id: string; changes: Partial<LyricLine> }>) => void;
  setLineTiming: (id: string, start: number) => void;
  clearLineTiming: (id: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  updateMeta: (meta: Partial<ProjectMeta>) => void;
  setView: (view: ViewState) => void;
  addLine: (line: LyricLine, index?: number) => void;
  removeLine: (id: string) => void;
  setLines: (lines: LyricLine[]) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    project: null,
    view: 'home',
    hasAcceptedLegal: localStorage.getItem('lyricsync_legal_accepted') === 'true',

    acceptLegal: () => {
      localStorage.setItem('lyricsync_legal_accepted', 'true');
      set((state) => {
        state.hasAcceptedLegal = true;
      });
    },

    setProject: (project) => set((state) => {
      state.project = project;
    }),

    updateLine: (id, updates) => set((state) => {
      if (!state.project) return;
      const line = state.project.lines.find(l => l.id === id);
      if (line) {
        Object.assign(line, updates);
        state.project.updatedAt = Date.now();
      }
    }),

    updateLines: (updates) => set((state) => {
      if (!state.project) return;
      updates.forEach(({ id, changes }) => {
        const line = state.project?.lines.find(l => l.id === id);
        if (line) {
          Object.assign(line, changes);
        }
      });
      state.project.updatedAt = Date.now();
    }),

    setLineTiming: (id, start) => set((state) => {
      if (!state.project) return;
      const line = state.project.lines.find(l => l.id === id);
      if (line) {
        line.start = start;
        line.status = 'synced';
        state.project.updatedAt = Date.now();
      }
    }),

    clearLineTiming: (id) => set((state) => {
      if (!state.project) return;
      const line = state.project.lines.find(l => l.id === id);
      if (line) {
        line.start = null;
        line.end = null;
        line.status = 'pending';
        state.project.updatedAt = Date.now();
      }
    }),

    updateSettings: (settings) => set((state) => {
      if (!state.project) return;
      Object.assign(state.project.settings, settings);
      state.project.updatedAt = Date.now();
    }),

    updateMeta: (meta) => set((state) => {
      if (!state.project) return;
      Object.assign(state.project.meta, meta);
      state.project.updatedAt = Date.now();
    }),

    setView: (view) => set((state) => {
      state.view = view;
    }),

    addLine: (line, index) => set((state) => {
      if (!state.project) return;
      if (index !== undefined && index >= 0) {
        state.project.lines.splice(index, 0, line);
      } else {
        state.project.lines.push(line);
      }
      state.project.updatedAt = Date.now();
    }),

    removeLine: (id) => set((state) => {
      if (!state.project) return;
      state.project.lines = state.project.lines.filter(l => l.id !== id);
      state.project.updatedAt = Date.now();
    }),

    setLines: (lines) => set((state) => {
      if (!state.project) return;
      state.project.lines = lines;
      state.project.updatedAt = Date.now();
    }),

    resetProject: () => set((state) => {
      state.project = null;
      state.view = 'home';
    }),
  }))
);
