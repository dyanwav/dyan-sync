import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store';
import { saveProject } from '../services/db';

export function useAutoSave() {
  const syncCountRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = useProjectStore.subscribe((state, prevState) => {
      if (!state.project) return;
      
      // Don't save if it's the exact same object reference or same updatedAt
      if (state.project === prevState.project || state.project.updatedAt === prevState.project?.updatedAt) return;

      const currentProject = state.project;

      // Handle debounce save (2 seconds of inactivity)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveProject(currentProject).catch(console.error);
        syncCountRef.current = 0; // Reset counter after debounced save
      }, 2000);

      // Handle every 5th sync action save
      const currentSynced = state.project.lines.filter(l => l.status === 'synced').length;
      const prevSynced = prevState.project?.lines.filter(l => l.status === 'synced').length || 0;
      const wasLineSynced = currentSynced > prevSynced;
      
      if (wasLineSynced) {
        syncCountRef.current += 1;
        if (syncCountRef.current >= 5) {
          saveProject(currentProject).catch(console.error);
          syncCountRef.current = 0;
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Save on beforeunload
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      const project = useProjectStore.getState().project;
      if (project) {
        // Can't reliably await in beforeunload, so just call it
        saveProject(project).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
