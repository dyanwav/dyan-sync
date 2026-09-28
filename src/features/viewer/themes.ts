import type { GradientPreset } from './types';

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'dark',
    name: 'Midnight Velvet',
    colors: ['#1e1b4b', '#0f172a', '#020617'],
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
    id: 'golden',
    name: 'Amber Glow',
    colors: ['#78350f', '#451a03', '#18181b', '#09090b'],
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
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  
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

  return canvas.transferToImageBitmap();
}
