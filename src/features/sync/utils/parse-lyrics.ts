import { v4 as uuidv4 } from 'uuid';
import type { LyricLine } from '@/features/project/types';

export function parseLyrics(text: string): LyricLine[] {
  const lines = text.split(/\r?\n/);
  const result: LyricLine[] = [];
  let previousWasEmpty = false;

  const sectionRegex = /^\[.*?\]$/;
  const commonSections = ['intro', 'verse', 'chorus', 'bridge', 'outro', 'pre-chorus', 'hook'];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (!previousWasEmpty && result.length > 0) {
        // We could insert an empty lyric line to represent a gap, or just ignore.
        // Wait, the instructions say: "Strip consecutive empty lines (max 1 blank between groups)"
        // But the `LyricLine` type doesn't have an explicit 'empty' kind, just 'lyric'.
        // So maybe we skip storing blank lines altogether, or just add an empty string 'lyric'.
        // Actually, often empty lines just aren't tracked, but let's include one empty line
        // between groups if we want visual spacing, or skip entirely. I'll include it.
        result.push({
          id: uuidv4(),
          text: '',
          start: null,
          end: null,
          status: 'pending',
          kind: 'lyric'
        });
        previousWasEmpty = true;
      }
      continue;
    }

    previousWasEmpty = false;

    let isSection = sectionRegex.test(trimmed);
    if (!isSection) {
      const lower = trimmed.toLowerCase();
      isSection = commonSections.some(sec => lower.startsWith(sec + ' ') || lower === sec || lower === sec + ':');
    }

    result.push({
      id: uuidv4(),
      text: trimmed,
      start: null,
      end: null,
      status: 'pending',
      kind: isSection ? 'section' : 'lyric'
    });
  }

  // Remove trailing empty line if exists
  if (result.length > 0 && result[result.length - 1].text === '') {
    result.pop();
  }

  return result;
}
