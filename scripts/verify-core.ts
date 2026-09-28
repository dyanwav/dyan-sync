import { parseLyrics } from '../src/features/sync/utils/parse-lyrics';
import { parseLrc, exportLrc } from '../src/features/export/lrc';
import type { LyricLine, ProjectMeta } from '../src/features/project/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log('--- Testing Lyric Parser ---');
const rawLyrics = `
[Verse 1]
First line of the verse
Second line of the verse

[Chorus]
This is the chorus
Second chorus line
`;

const parsedLines = parseLyrics(rawLyrics);
assert(parsedLines.length === 7, `Expected 7 lines (including 1 blank separator), got ${parsedLines.length}`);
assert(parsedLines[0].kind === 'section' && parsedLines[0].text === '[Verse 1]', 'First line is section');
assert(parsedLines[1].kind === 'lyric' && parsedLines[1].text === 'First line of the verse', 'Second line is lyric');
assert(parsedLines[3].kind === 'lyric' && parsedLines[3].text === '', 'Fourth line is empty separator');
assert(parsedLines[4].kind === 'section' && parsedLines[4].text === '[Chorus]', 'Fifth line is section');
assert(parsedLines.every(l => l.status === 'pending'), 'All parsed lines start as pending');
assert(parsedLines.every(l => typeof l.id === 'string' && l.id.length > 0), 'All lines have IDs');

console.log('\n--- Testing LRC Parser & Exporter ---');
const sampleLrc = `[ti:Test Title]
[ar:Test Artist]
[al:Test Album]
[00:10.50]First line
[00:15.25]Second line
[00:20.00][Chorus]
[00:22.00]Chorus line
`;

const lrcResult = parseLrc(sampleLrc);
assert(lrcResult.meta.title === 'Test Title', 'Extracted title correctly');
assert(lrcResult.meta.artist === 'Test Artist', 'Extracted artist correctly');
assert(lrcResult.lines.length === 4, `Parsed 4 lines from LRC, got ${lrcResult.lines.length}`);
assert(lrcResult.lines[0].start === 10.5, `Line 1 start is 10.5s, got ${lrcResult.lines[0].start}`);
assert(lrcResult.lines[1].start === 15.25, `Line 2 start is 15.25s, got ${lrcResult.lines[1].start}`);

// Test Exporter
const linesToExport: LyricLine[] = [
  { id: '1', text: '[Intro]', kind: 'section', start: null, end: null, status: 'unassigned' },
  { id: '2', text: 'Hello world', kind: 'lyric', start: 5.2, end: 10.0, status: 'synced' },
  { id: '3', text: 'Second synced line', kind: 'lyric', start: 10.05, end: 15.0, status: 'synced' },
];

const meta: ProjectMeta = {
  title: 'My Song',
  artist: 'Super Artist',
  album: 'Debut'
};

const exportedString = exportLrc(linesToExport, meta);
assert(exportedString.includes('[ti:My Song]'), 'Contains title tag');
assert(exportedString.includes('[ar:Super Artist]'), 'Contains artist tag');
assert(exportedString.includes('[00:05.20]Hello world'), `Contains formatted line 1: ${exportedString}`);
assert(exportedString.includes('[00:10.05]Second synced line'), `Contains formatted line 2: ${exportedString}`);

console.log('\n🎉 ALL CORE LOGIC VERIFICATION CHECKS PASSED!\n');
