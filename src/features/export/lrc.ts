import { v4 as uuidv4 } from 'uuid';
import type { LyricLine, ProjectMeta } from '@/features/project/types';
import type { LrcParseResult } from './types';

function parseTimestamp(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const minutes = parseInt(parts[0], 10) || 0;
  const secondsStr = parts[1];
  const seconds = parseFloat(secondsStr) || 0;
  return Number((minutes * 60 + seconds).toFixed(3));
}

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remSec = totalSeconds % 60;
  const minStr = String(minutes).padStart(2, '0');
  const secStr = remSec.toFixed(2).padStart(5, '0');
  return `[${minStr}:${secStr}]`;
}

export function parseLrc(content: string): LrcParseResult {
  const lines = content.split(/\r?\n/);
  const meta: Partial<ProjectMeta> = {};
  const parsedLines: LyricLine[] = [];
  let offsetMs = 0;

  const timeRegex = /\[(\d{2,}:\d{2}(?:\.\d{2,3})?)\]/g;
  const tagRegex = /\[([a-z]+):(.*?)\]/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for tags first if no time regex matches, or even if it does but it's a known tag
    const tagMatch = tagRegex.exec(trimmed);
    if (tagMatch && !timeRegex.test(trimmed)) {
      const tag = tagMatch[1].toLowerCase();
      const value = tagMatch[2].trim();
      
      switch (tag) {
        case 'ti': meta.title = value; break;
        case 'ar': meta.artist = value; break;
        case 'al': meta.album = value; break;
        case 'length': break; // ProjectMeta does not have length
        case 'offset':
          offsetMs = parseInt(value, 10) || 0;
          break;
        default:
          // Unknown tags are ignored since ProjectMeta doesn't have an index signature
          break;
      }
      continue;
    }

    let match;
    const timestamps: number[] = [];
    timeRegex.lastIndex = 0; // reset
    while ((match = timeRegex.exec(trimmed)) !== null) {
      timestamps.push(parseTimestamp(match[1]));
    }

    if (timestamps.length > 0) {
      const text = trimmed.replace(timeRegex, '').trim();
      for (const ts of timestamps) {
        // If text is empty, it's an instrumental marker
        parsedLines.push({
          id: uuidv4(),
          text,
          start: ts,
          end: null, // End times aren't standard in LRC, though could be inferred
          status: 'synced',
          kind: 'lyric'
        });
      }
    } else {
      // It's just a text line without timestamp
      parsedLines.push({
        id: uuidv4(),
        text: trimmed,
        start: null,
        end: null,
        status: 'pending',
        kind: 'lyric'
      });
    }
  }

  // Sort parsed lines by start time
  parsedLines.sort((a, b) => {
    if (a.start === null && b.start === null) return 0;
    if (a.start === null) return 1;
    if (b.start === null) return -1;
    return a.start - b.start;
  });

  return {
    lines: parsedLines,
    meta,
    offsetMs
  };
}

export function exportLrc(
  lines: LyricLine[],
  meta: ProjectMeta,
  options?: { includeSections?: boolean; duration?: number }
): string {
  const result: string[] = [];

  if (meta.title) result.push(`[ti:${meta.title}]`);
  if (meta.artist) result.push(`[ar:${meta.artist}]`);
  if (meta.album) result.push(`[al:${meta.album}]`);
  
  if (options?.duration) {
    const totalSeconds = Math.floor(options.duration);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    result.push(`[length:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`);
  }
  
  // Note: LRC specific fields like length and offset aren't in ProjectMeta
  // We handle them separately if needed, but for now we skip them.

  const sortedLines = [...lines].sort((a, b) => {
    if (a.start === null && b.start === null) return 0;
    if (a.start === null) return 1;
    if (b.start === null) return -1;
    return a.start - b.start;
  });

  for (const line of sortedLines) {
    if (!options?.includeSections && line.kind === 'section') {
      continue;
    }
    // Only export lines with a start time
    if (line.start !== null) {
      result.push(`${formatTimestamp(line.start)}${line.text}`);
    }
  }

  return result.join('\n');
}

export function downloadLrc(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.lrc') ? filename : `${filename}.lrc`;
  a.click();
  URL.revokeObjectURL(url);
}
