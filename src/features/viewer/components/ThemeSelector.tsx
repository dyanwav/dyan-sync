import { useRef, useState } from 'react';
import { GRADIENT_PRESETS } from '../themes';
import { cn } from '@/shared/utils/cn';
import { ImagePlus, X, RefreshCw, Check, Loader2 } from 'lucide-react';

interface ThemeSelectorProps {
  selectedThemeId: string;
  customImageDataUrl?: string;
  onSelect: (themeId: string) => void;
  onUploadCustomImage?: (dataUrl: string) => void;
  onRemoveCustomImage?: () => void;
  className?: string;
}

function processUploadedImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Max target dimension (preserves quality for 1080x1920 9:16 export)
      const maxW = 1080;
      const maxH = 1920;
      let targetW = img.width || 1;
      let targetH = img.height || 1;

      const scale = Math.min(1, Math.min(maxW / targetW, maxH / targetH));
      targetW = Math.max(1, Math.round(targetW * scale));
      targetH = Math.max(1, Math.round(targetH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback: read directly as Data URL
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      resolve(optimizedDataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

export function ThemeSelector({
  selectedThemeId,
  customImageDataUrl,
  onSelect,
  onUploadCustomImage,
  onRemoveCustomImage,
  className,
}: ThemeSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const dataUrl = await processUploadedImage(file);
      if (dataUrl && onUploadCustomImage) {
        onUploadCustomImage(dataUrl);
      }
    } catch (err) {
      console.error('Error processing uploaded image:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Custom Photo Section */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Foto Personalizada
        </div>

        {customImageDataUrl ? (
          <div className="flex items-center gap-3 bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-xl">
            {/* Thumbnail */}
            <button
              type="button"
              onClick={() => onSelect('custom')}
              className={cn(
                "w-12 h-16 rounded-lg overflow-hidden relative shrink-0 border-2 transition-all cursor-pointer shadow-md",
                selectedThemeId === 'custom'
                  ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-2 ring-blue-500/30"
                  : "border-zinc-700 opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={customImageDataUrl}
                alt="Custom background"
                className="w-full h-full object-cover"
              />
              {selectedThemeId === 'custom' && (
                <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white drop-shadow" />
                </div>
              )}
            </button>

            {/* Controls */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-zinc-200 truncate">Foto del usuario</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Recorte 9:16 + oscurecido automático</div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {isProcessing ? 'Procesando...' : 'Cambiar'}
                </button>
                {onRemoveCustomImage && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={onRemoveCustomImage}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 cursor-pointer ml-2 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/40 text-zinc-300 hover:text-white hover:border-blue-500/80 hover:bg-blue-600/10 transition-all text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4 text-blue-400" />
            )}
            <span>{isProcessing ? 'Procesando imagen...' : 'Subir imagen o foto de fondo'}</span>
          </button>
        )}
      </div>

      {/* Preset Gradients Section */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Gradientes Cinematográficos
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={cn(
                "h-14 rounded-xl relative overflow-hidden transition-all duration-200 cursor-pointer focus:outline-none group",
                selectedThemeId === preset.id
                  ? "ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.35)] scale-105"
                  : "ring-1 ring-zinc-800 hover:ring-zinc-600 hover:scale-102 opacity-80 hover:opacity-100"
              )}
              title={preset.name}
              style={{
                background: preset.type === 'linear'
                  ? `linear-gradient(${preset.angle || 180}deg, ${preset.colors.join(', ')})`
                  : `radial-gradient(circle at 50% 30%, ${preset.colors[0]}, ${preset.colors[preset.colors.length - 1]})`
              }}
            >
              {selectedThemeId === preset.id && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                </div>
              )}
              <span className="sr-only">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
