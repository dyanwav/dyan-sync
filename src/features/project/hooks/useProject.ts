import { useProjectStore } from '../store';
import { saveProject, loadProject as dbLoadProject, saveBlob } from '../services/db';
import type { ProjectMeta, LyricLine, ProjectSettings, Project } from '../types';

export function useProject() {
  const { setProject, resetProject, project, setView } = useProjectStore();

  const createProject = async (
    meta: ProjectMeta,
    audioBlob: Blob,
    lines: LyricLine[]
  ): Promise<Project> => {
    const id = crypto.randomUUID();
    const blobId = `audio_${id}`;
    
    // Save the audio blob
    await saveBlob(blobId, audioBlob, (audioBlob as File).name || 'audio.mp3');

    const defaultSettings: ProjectSettings = {
      tapOffsetMs: 0,
      debounceMs: 100,
      playbackRate: 1,
      theme: {
        preset: 'dark',
        fontFamily: 'Inter',
        fontSize: 24,
        lineSpacing: 1.5,
        lookaheadMs: 500,
      }
    };

    const newProject: Project = {
      id,
      schemaVersion: 1,
      meta,
      audio: {
        blobId,
        name: (audioBlob as File).name || 'audio.mp3',
        size: audioBlob.size,
        duration: 0, // Should be populated by audio element later
      },
      lines,
      settings: defaultSettings,
      updatedAt: Date.now(),
    };

    await saveProject(newProject);
    setProject(newProject);
    setView('sync');

    return newProject;
  };

  const loadProject = async (id: string): Promise<Project> => {
    const loaded = await dbLoadProject(id);
    if (!loaded) {
      throw new Error(`Project ${id} not found`);
    }
    setProject(loaded);
    setView('sync'); // or whatever logic dictates the view
    return loaded;
  };

  const saveCurrentProject = async (): Promise<void> => {
    const current = useProjectStore.getState().project;
    if (current) {
      await saveProject(current);
    }
  };

  return {
    project,
    createProject,
    loadProject,
    saveProject: saveCurrentProject,
    resetProject,
  };
}
