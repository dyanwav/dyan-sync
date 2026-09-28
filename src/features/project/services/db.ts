import Dexie, { type EntityTable } from 'dexie';
import type { Project } from '../types';

export interface ProjectRecord {
  id: string;
  data: Project;
  updatedAt: number;
}

export interface BlobRecord {
  id: string;
  blob: Blob;
  name: string;
  type: string;
}

const db = new Dexie('LyricSyncStudio') as Dexie & {
  projects: EntityTable<ProjectRecord, 'id'>;
  blobs: EntityTable<BlobRecord, 'id'>;
};

db.version(1).stores({
  projects: 'id, updatedAt',
  blobs: 'id',
});

export const saveProject = async (project: Project): Promise<void> => {
  await db.projects.put({
    id: project.id,
    data: project,
    updatedAt: project.updatedAt,
  });
};

export const loadProject = async (id: string): Promise<Project | undefined> => {
  const record = await db.projects.get(id);
  return record?.data;
};

export const listProjects = async (): Promise<ProjectRecord[]> => {
  return await db.projects.orderBy('updatedAt').reverse().toArray();
};

export const deleteProject = async (id: string): Promise<void> => {
  await db.projects.delete(id);
};

export const saveBlob = async (id: string, blob: Blob, name: string): Promise<void> => {
  await db.blobs.put({
    id,
    blob,
    name,
    type: blob.type,
  });
};

export const loadBlob = async (id: string): Promise<Blob | undefined> => {
  const record = await db.blobs.get(id);
  return record?.blob;
};

export const deleteBlob = async (id: string): Promise<void> => {
  await db.blobs.delete(id);
};

export { db };
