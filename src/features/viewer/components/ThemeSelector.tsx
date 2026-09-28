import { GRADIENT_PRESETS } from '../themes';
import { cn } from '@/shared/utils/cn';

interface ThemeSelectorProps {
  selectedThemeId: string;
  onSelect: (themeId: string) => void;
  className?: string;
}

export function ThemeSelector({ selectedThemeId, onSelect, className }: ThemeSelectorProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {GRADIENT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className={cn(
            "w-12 h-16 rounded-md relative overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-blue-500",
            selectedThemeId === preset.id ? "ring-2 ring-white" : "ring-1 ring-white/20 hover:ring-white/50"
          )}
          title={preset.name}
          style={{
            background: preset.type === 'linear' 
              ? `linear-gradient(${preset.angle || 180}deg, ${preset.colors.join(', ')})`
              : `radial-gradient(circle at 50% 30%, ${preset.colors[0]}, ${preset.colors[preset.colors.length - 1]})`
          }}
        >
          <span className="sr-only">{preset.name}</span>
        </button>
      ))}
    </div>
  );
}
