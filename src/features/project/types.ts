export type LineKind = 'lyric' | 'section' | 'instrumental';
export type LineStatus = 'pending' | 'synced' | 'unassigned';

export type LyricLine = {
  id: string;
  text: string;
  kind: LineKind;
  start: number | null;
  end: number | null;
  status: LineStatus;
};

export type ThemePreset = 
  | 'dark' 
  | 'acid' 
  | 'sunset' 
  | 'cyberpunk' 
  | 'golden'
  | 'monochrome' 
  | 'ocean' 
  | 'tokyo' 
  | 'cosmic' 
  | 'blood' 
  | 'emerald'
  | 'amethyst'
  | 'cover' 
  | 'custom';

export type ThemeConfig = {
  preset: ThemePreset;
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  lookaheadMs: number;
  customImageDataUrl?: string;
  customImageBlobId?: string;
  contrast?: number; // 0 to 100, default 60
};

export type ProjectMeta = {
  title: string;
  artist: string;
  album?: string;
  coverId?: string;
};

export type AudioMeta = {
  blobId: string;
  name: string;
  size: number;
  duration: number;
};

export type ExportRange = {
  start: number;
  end: number;
};

export type ProjectSettings = {
  tapOffsetMs: number;
  debounceMs: number;
  playbackRate: 0.75 | 1 | 1.25;
  theme: ThemeConfig;
  exportRange?: ExportRange;
};

export type Project = {
  id: string;
  schemaVersion: number;
  meta: ProjectMeta;
  audio: AudioMeta;
  lines: LyricLine[];
  settings: ProjectSettings;
  updatedAt: number;
};

export type ViewState = 'home' | 'setup' | 'sync' | 'preview' | 'export';
