import type { RenderScene, TextMetrics } from './types';
import type { LyricLine } from '@/features/project/types';

// Simple map-based layout cache.
const layoutCache = new Map<string, { wrappedLines: string[], totalHeight: number }>();

function wrapText(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [''];
}

function calculateLayout(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  lines: LyricLine[],
  width: number,
  _height: number,
  fontFamily: string,
  fontSize: number,
  lineHeightMultiplier: number
): TextMetrics[] {
  const result: TextMetrics[] = [];
  let currentY = 0;
  
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const maxWidth = width * 0.85; // 85% of screen width

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip layout for non-vocal lines, but compute them so indexing stays aligned
    if (line.kind === 'section') {
      result.push({
        lineIndex: i,
        text: line.text,
        wrappedLines: [],
        y: currentY,
        totalHeight: 0,
        isCached: true
      });
      continue;
    }

    const cacheKey = `${line.text}|${fontFamily}|${fontSize}|${width}`;
    let layout = layoutCache.get(cacheKey);
    let isCached = true;
    
    if (!layout) {
      isCached = false;
      const wrappedLines = wrapText(ctx, line.text, maxWidth);
      const totalHeight = wrappedLines.length * (fontSize * lineHeightMultiplier);
      layout = { wrappedLines, totalHeight };
      layoutCache.set(cacheKey, layout);
    }
    
    result.push({
      lineIndex: i,
      text: line.text,
      wrappedLines: layout.wrappedLines,
      y: currentY,
      totalHeight: layout.totalHeight,
      isCached
    });
    
    // Add gap between lines
    currentY += layout.totalHeight + fontSize * 1.5; 
  }
  
  return result;
}

function findActiveLineIndex(lines: LyricLine[], t: number, lookaheadMs: number): number {
  const lookaheadSec = lookaheadMs / 1000;
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.kind === 'section' || line.start === null) continue;
    
    // If the line has started, or is about to start (within lookahead)
    if (t >= line.start - lookaheadSec) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function calculateScrollY(lines: LyricLine[], activeIndex: number, t: number, layout: TextMetrics[], height: number): number {
  if (activeIndex < 0) return 0;
  if (activeIndex >= layout.length) return layout[layout.length - 1].y;

  const currentLine = lines[activeIndex];
  const currentLayout = layout[activeIndex];
  
  // Anchor target: ~35% from the top
  const anchorY = height * 0.35;
  const currentTargetScroll = currentLayout.y - anchorY;

  // Animate scroll during 350ms (0.35s) window after line start
  const transitionDuration = 0.35;
  const start = currentLine.start ?? 0;
  
  if (t < start + transitionDuration) {
    // Find the previous visible line
    let prevIndex = activeIndex - 1;
    while (prevIndex >= 0 && lines[prevIndex].kind === 'section') {
      prevIndex--;
    }
    
    if (prevIndex >= 0) {
      const prevLayout = layout[prevIndex];
      const prevTargetScroll = prevLayout.y - anchorY;
      
      const progress = Math.max(0, (t - start) / transitionDuration);
      const easedProgress = easeOutCubic(progress);
      
      return prevTargetScroll + (currentTargetScroll - prevTargetScroll) * easedProgress;
    }
  }
  
  return currentTargetScroll;
}

function getLineStyle(index: number, activeIndex: number, lines: LyricLine[], t: number, lookaheadMs: number): { opacity: number, scale: number } {
  const line = lines[index];
  const lookaheadSec = lookaheadMs / 1000;
  
  if (line.start === null) {
    return { opacity: 0.2, scale: 1.0 };
  }

  if (index === activeIndex) {
    // Determine if it's currently active or pre-highlighting
    const start = line.start;
    if (t >= start) {
      return { opacity: 1.0, scale: 1.05 };
    } else if (t >= start - lookaheadSec) {
      return { opacity: 0.4, scale: 1.0 };
    }
    return { opacity: 0.4, scale: 1.0 };
  } else if (index < activeIndex) {
    return { opacity: 0.6, scale: 1.0 };
  } else {
    // Future lines
    const start = line.start;
    if (t >= start - lookaheadSec) {
      return { opacity: 0.4, scale: 1.0 };
    }
    return { opacity: 0.2, scale: 1.0 };
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  _text: string,
  wrappedLines: string[],
  x: number,
  y: number,
  options: { fontFamily: string, fontSize: number, opacity: number, lineHeight: number, width: number }
) {
  ctx.save();
  ctx.font = `bold ${options.fontSize}px ${options.fontFamily}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = options.opacity;
  
  if (options.opacity > 0.8) {
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  
  let currentY = y;
  for (const line of wrappedLines) {
    ctx.fillText(line, x, currentY);
    currentY += options.fontSize * options.lineHeight;
  }
  
  ctx.restore();
}

/**
 * Pure render function. Given a canvas context, scene data, and time t,
 * draws the complete 9:16 viewer frame.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  scene: RenderScene,
  t: number
): void {
  const { width, height, lines, background, fontFamily, fontSize, lineHeight, lookaheadMs } = scene;
  
  // 1. Draw background
  if (background) {
    ctx.drawImage(background, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
  }
  
  // 2. Find active line index
  const activeIndex = findActiveLineIndex(lines, t, lookaheadMs);
  
  // 3. Calculate layout and positions
  const layout = calculateLayout(ctx, lines, width, height, fontFamily, fontSize, lineHeight);
  
  // 4. Calculate scroll offset
  const scrollY = calculateScrollY(lines, activeIndex, t, layout, height);
  
  // 5. Draw each visible line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.kind === 'section') continue;
    
    const lineLayout = layout[i];
    if (!lineLayout) continue;
    
    const drawY = lineLayout.y - scrollY;
    
    // Skip lines that are off-screen
    if (drawY + lineLayout.totalHeight < -100 || drawY > height + 100) continue;
    
    // Determine line state and styling
    const { opacity, scale } = getLineStyle(i, activeIndex, lines, t, lookaheadMs);
    
    // Draw the line
    drawLine(ctx, line.text, lineLayout.wrappedLines, width / 2, drawY, {
      fontFamily,
      fontSize: fontSize * scale,
      opacity,
      lineHeight,
      width,
    });
  }
}
