import type { GradientPreset } from './types';

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'dark',
    name: 'Midnight Velvet',
    colors: ['#1e1b4b', '#0f172a', '#020617'],
    type: 'radial',
  },
  {
    id: 'ocean',
    name: 'Sapphire Abyss',
    colors: ['#0284c7', '#075985', '#0f172a', '#020617'],
    type: 'radial',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Neon',
    colors: ['#db2777', '#9333ea', '#3b0764', '#09090b'],
    type: 'radial',
  },
  {
    id: 'acid',
    name: 'Emerald Aurora',
    colors: ['#065f46', '#022c22', '#020617'],
    type: 'radial',
  },
  {
    id: 'sunset',
    name: 'Sunset Crimson',
    colors: ['#881337', '#4c0519', '#1e1b4b', '#09090b'],
    type: 'radial',
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Violet',
    colors: ['#6366f1', '#3b0764', '#0f172a'],
    type: 'radial',
  },
  {
    id: 'cosmic',
    name: 'Cosmic Nebula',
    colors: ['#8b5cf6', '#4f46e5', '#1e1b4b', '#030712'],
    type: 'radial',
  },
  {
    id: 'golden',
    name: 'Amber Glow',
    colors: ['#78350f', '#451a03', '#18181b', '#09090b'],
    type: 'radial',
  },
  {
    id: 'blood',
    name: 'Blood Orange',
    colors: ['#ea580c', '#9a3412', '#451a03', '#09090b'],
    type: 'radial',
  },
  {
    id: 'emerald',
    name: 'Jade Nocturne',
    colors: ['#059669', '#064e3b', '#022c22', '#020617'],
    type: 'radial',
  },
  {
    id: 'amethyst',
    name: 'Amethyst Dream',
    colors: ['#a855f7', '#6b21a8', '#3b0764', '#09090b'],
    type: 'radial',
  },
  {
    id: 'monochrome',
    name: 'Studio Minimal',
    colors: ['#27272a', '#18181b', '#09090b'],
    type: 'radial',
  },
];

export function createGradientBackground(
  preset: GradientPreset,
  width: number,
  height: number
): ImageBitmap {
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(width, height)
    : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  
  // Base background fill
  ctx.fillStyle = preset.colors[preset.colors.length - 1] || '#09090b';
  ctx.fillRect(0, 0, width, height);

  // 1. Dynamic Primary Gradient
  if (preset.type === 'radial') {
    const gradient = ctx.createRadialGradient(
      width * 0.5, height * 0.35,  // Centered slightly above middle
      40,
      width * 0.5, height * 0.45,
      Math.max(width, height) * 0.85
    );
    preset.colors.forEach((color, i) => {
      gradient.addColorStop(i / (preset.colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else {
    const angle = (preset.angle ?? 180) * (Math.PI / 180);
    const x1 = width / 2 - Math.sin(angle) * width / 2;
    const y1 = height / 2 - Math.cos(angle) * height / 2;
    const x2 = width / 2 + Math.sin(angle) * width / 2;
    const y2 = height / 2 + Math.cos(angle) * height / 2;
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    preset.colors.forEach((color, i) => {
      gradient.addColorStop(i / (preset.colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  // 2. Soft Ambient Lighting Orb behind active lyrics area
  const ambientGlow = ctx.createRadialGradient(
    width * 0.5, height * 0.38,
    0,
    width * 0.5, height * 0.38,
    width * 0.6
  );
  ambientGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  ambientGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
  ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, width, height);

  // 3. Subtle Vignette edges for cinematic depth
  const vignette = ctx.createRadialGradient(
    width * 0.5, height * 0.5,
    height * 0.3,
    width * 0.5, height * 0.5,
    height * 0.75
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  if ('transferToImageBitmap' in canvas) {
    return (canvas as OffscreenCanvas).transferToImageBitmap();
  }
  // Fallback for HTMLCanvasElement
  const offscreen = new OffscreenCanvas(width, height);
  const offCtx = offscreen.getContext('2d')!;
  offCtx.drawImage(canvas as HTMLCanvasElement, 0, 0);
  return offscreen.transferToImageBitmap();
}

/**
 * Creates a cinematic, 9:16 aspect ratio background from any user-uploaded image.
 * Automatically cover-fits the image (no distortion, 100% full frame) and applies
 * a multi-tier darkening overlay and vignette to ensure perfect lyric readability.
 */
export async function createCustomPhotoBackground(
  imageSource: string | ImageBitmap | HTMLImageElement,
  width: number,
  height: number
): Promise<ImageBitmap> {
  // 1. Load HTMLImageElement or use existing ImageBitmap
  let imgElement: HTMLImageElement | ImageBitmap;
  if (typeof imageSource === 'string') {
    imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load custom background image: ' + String(e)));
      img.src = imageSource;
    });
  } else {
    imgElement = imageSource;
  }

  const srcW = imgElement.width || 1;
  const srcH = imgElement.height || 1;

  // 2. Cover fit (object-fit: cover) to preserve aspect ratio without stretching
  const scale = Math.max(width / srcW, height / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const dx = (width - drawW) / 2;
  const dy = (height - drawH) / 2;

  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(width, height)
    : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  // Base background fill
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, width, height);

  // Draw user image centered & cover-fitted
  ctx.drawImage(imgElement, dx, dy, drawW, drawH);

  // 3. Multi-layer Darkening & Contrast Overlay:
  // Layer A: Base Darkening Tint (0.64 alpha)
  ctx.fillStyle = 'rgba(9, 9, 11, 0.64)';
  ctx.fillRect(0, 0, width, height);

  // Layer B: Vertical Readability Gradient
  const lyricOverlay = ctx.createLinearGradient(0, 0, 0, height);
  lyricOverlay.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  lyricOverlay.addColorStop(0.2, 'rgba(0, 0, 0, 0.45)');
  lyricOverlay.addColorStop(0.38, 'rgba(0, 0, 0, 0.35)'); // Sweet spot for active line
  lyricOverlay.addColorStop(0.65, 'rgba(0, 0, 0, 0.55)');
  lyricOverlay.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
  ctx.fillStyle = lyricOverlay;
  ctx.fillRect(0, 0, width, height);

  // Layer C: Ambient dark shadow orb behind active lyrics reading area
  const readingGlow = ctx.createRadialGradient(
    width * 0.5, height * 0.38,
    0,
    width * 0.5, height * 0.38,
    width * 0.55
  );
  readingGlow.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  readingGlow.addColorStop(0.6, 'rgba(0, 0, 0, 0.2)');
  readingGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = readingGlow;
  ctx.fillRect(0, 0, width, height);

  // Layer D: Subtle Vignette edges for cinematic depth
  const vignette = ctx.createRadialGradient(
    width * 0.5, height * 0.5,
    height * 0.22,
    width * 0.5, height * 0.5,
    height * 0.76
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.55, 'rgba(0, 0, 0, 0.4)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  if ('transferToImageBitmap' in canvas) {
    return (canvas as OffscreenCanvas).transferToImageBitmap();
  }
  const offscreen = new OffscreenCanvas(width, height);
  const offCtx = offscreen.getContext('2d')!;
  offCtx.drawImage(canvas as HTMLCanvasElement, 0, 0);
  return offscreen.transferToImageBitmap();
}
