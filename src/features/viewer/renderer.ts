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
  
  ctx.font = `800 ${fontSize}px "${fontFamily}", system-ui, sans-serif`;
  const maxWidth = width * 0.88; // 88% of screen width

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
    currentY += layout.totalHeight + fontSize * 1.1; 
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
  
  // Anchor target: exactly centered in the frame vertically
  const anchorY = (height / 2) - (currentLayout.totalHeight / 2);
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
      const prevAnchorY = (height / 2) - (prevLayout.totalHeight / 2);
      const prevTargetScroll = prevLayout.y - prevAnchorY;
      
      const progress = Math.max(0, (t - start) / transitionDuration);
      const easedProgress = easeOutCubic(progress);
      
      return prevTargetScroll + (currentTargetScroll - prevTargetScroll) * easedProgress;
    }
  }
  
  return currentTargetScroll;
}

/**
 * Calculates distance in vocal/sung lines between two indices (ignoring sections/blank lines)
 */
function getVocalLineDistance(lines: LyricLine[], fromIndex: number, toIndex: number): number {
  if (fromIndex === toIndex) return 0;
  const min = Math.min(fromIndex, toIndex);
  const max = Math.max(fromIndex, toIndex);
  let dist = 0;
  for (let i = min + 1; i <= max; i++) {
    if (lines[i].kind === 'lyric' && lines[i].text.trim() !== '') {
      dist++;
    }
  }
  return dist;
}

function getLineStyle(
  index: number,
  activeIndex: number,
  lines: LyricLine[],
  t: number,
  lookaheadMs: number
): { opacity: number; scale: number } {
  const line = lines[index];
  const lookaheadSec = lookaheadMs / 1000;
  
  if (line.start === null) {
    return { opacity: 0.18, scale: 1.0 };
  }

  if (activeIndex < 0) {
    const start = line.start;
    if (t >= start - lookaheadSec) {
      return { opacity: 0.45, scale: 1.0 };
    }
    const isFirstVocal = lines.findIndex(l => l.kind === 'lyric' && l.text.trim() !== '') === index;
    return isFirstVocal
      ? { opacity: 0.45, scale: 1.0 }
      : { opacity: 0, scale: 1.0 };
  }

  const dist = getVocalLineDistance(lines, index, activeIndex);

  // Active line: Centered, 100% opacity, bright luminous glow
  if (dist === 0) {
    const start = line.start;
    if (t >= start) {
      return { opacity: 1.0, scale: 1.05 };
    } else if (t >= start - lookaheadSec) {
      return { opacity: 0.85, scale: 1.02 };
    }
    return { opacity: 0.7, scale: 1.0 };
  }

  // Immediate previous or next line (±1): 45% opacity
  if (dist === 1) {
    return { opacity: 0.45, scale: 1.0 };
  }

  // Second previous or next line (±2): 18% opacity
  if (dist === 2) {
    return { opacity: 0.18, scale: 1.0 };
  }

  // Third line and beyond (≥ 3): completely invisible
  return { opacity: 0, scale: 1.0 };
}

function drawLine(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  _text: string,
  wrappedLines: string[],
  x: number,
  y: number,
  options: { fontFamily: string; fontSize: number; opacity: number; lineHeight: number; width: number }
) {
  if (options.opacity <= 0) return;

  ctx.save();
  const isActive = options.opacity >= 0.85;

  ctx.font = `${isActive ? '800' : '700'} ${Math.round(options.fontSize)}px "${options.fontFamily}", system-ui, sans-serif`;
  ctx.fillStyle = isActive ? '#FFFFFF' : '#D4D4D8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = options.opacity;

  if (isActive) {
    // Luminous double-pass glow for active line
    ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
  }
  
  // Pass 1: Render glowing base for all wrapped lines
  let currentY = y;
  for (const line of wrappedLines) {
    ctx.fillText(line, x, currentY);
    currentY += options.fontSize * options.lineHeight;
  }

  // Pass 2: Crisp overlay pass without shadow blur so active text stays razor sharp
  if (isActive) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    currentY = y;
    for (const line of wrappedLines) {
      ctx.fillText(line, x, currentY);
      currentY += options.fontSize * options.lineHeight;
    }
  }
  
  ctx.restore();
}

/**
 * Pure render function. Given a canvas context, scene data, and time t,
 * draws the complete 9:16 viewer frame with Instagram-worthy typography.
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
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Elegant top music header pill
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 18px 'Syne', system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.letterSpacing = '0.15em';
  ctx.fillText('LYRICSYNC STUDIO', width / 2, 80);
  ctx.restore();
  
  // 3. Find active line index
  const activeIndex = findActiveLineIndex(lines, t, lookaheadMs);
  
  // 4. Calculate layout and positions with enhanced spacing
  const layout = calculateLayout(ctx, lines, width, height, fontFamily, fontSize, lineHeight);
  
  // 5. Calculate scroll offset (centers active line vertically)
  const scrollY = calculateScrollY(lines, activeIndex, t, layout, height);
  
  // 6. Draw each visible line (restricted to ±2 vocal distance)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.kind === 'section') continue;
    
    // Quick skip if beyond distance 2
    if (activeIndex >= 0) {
      const dist = getVocalLineDistance(lines, i, activeIndex);
      if (dist >= 3) continue;
    }
    
    const lineLayout = layout[i];
    if (!lineLayout) continue;
    
    const drawY = lineLayout.y - scrollY;
    
    // Skip lines that are off-screen
    if (drawY + lineLayout.totalHeight < -150 || drawY > height + 150) continue;
    
    // Determine line state and styling
    const { opacity, scale } = getLineStyle(i, activeIndex, lines, t, lookaheadMs);
    if (opacity <= 0) continue;
    
    // Draw the line with pure progressive opacity
    drawLine(ctx, line.text, lineLayout.wrappedLines, width / 2, drawY, {
      fontFamily,
      fontSize: fontSize * scale,
      opacity,
      lineHeight,
      width,
    });
  }
}
