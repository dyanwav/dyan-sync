import type { LyricLine, ThemeConfig } from '@/features/project/types';

export interface RenderScene {
  lines: LyricLine[];
  theme: ThemeConfig;
  background: ImageBitmap | null;  // Pre-rendered gradient/cover background
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;           // base font size in pixels
  lineHeight: number;         // line height multiplier
  lookaheadMs: number;        // ms to pre-highlight next line (default 150)
}

export interface TextMetrics {
  lineIndex: number;
  text: string;
  wrappedLines: string[];
  y: number;                  // calculated Y position
  totalHeight: number;
  isCached: boolean;
}

export type GradientPreset = {
  name: string;
  id: string;
  colors: string[];           // CSS color strings
  angle?: number;             // degrees for linear gradient
  type: 'linear' | 'radial';
};
