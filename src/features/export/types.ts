export interface LrcParseResult {
  lines: import('@/features/project/types').LyricLine[];
  meta: Partial<import('@/features/project/types').ProjectMeta>;
  offsetMs: number;
}
