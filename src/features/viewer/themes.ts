import type { GradientPreset } from './types';

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'dark',
    name: 'Dark',
    colors: ['#0a0a0a', '#171717', '#0a0a0a'],
    type: 'radial',
  },
  {
    id: 'acid',
    name: 'Acid',
    colors: ['#052e16', '#14532d', '#022c22'],
    type: 'radial',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#431407', '#7c2d12', '#451a03'],
    type: 'radial',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: ['#1e1b4b', '#312e81', '#0c0a3e'],
    type: 'radial',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: ['#0a0a0a', '#262626', '#0a0a0a'],
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
  
  if (preset.type === 'radial') {
    const gradient = ctx.createRadialGradient(
      width / 2, height * 0.3,   // center, slightly above middle
      0,
      width / 2, height * 0.3,
      Math.max(width, height) * 0.8
    );
    preset.colors.forEach((color, i) => {
      gradient.addColorStop(i / (preset.colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    // Linear gradient
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
  }
  
  ctx.fillRect(0, 0, width, height);
  return canvas.transferToImageBitmap();
}
