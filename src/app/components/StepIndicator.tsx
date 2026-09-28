import { Check } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { ViewState } from '@/features/project/types';
import { useTranslation } from '@/features/i18n';

interface StepIndicatorProps {
  currentView: ViewState;
}

const STEPS: { id: ViewState; key: string }[] = [
  { id: 'setup', key: 'nav.setup' },
  { id: 'sync', key: 'nav.sync' },
  { id: 'preview', key: 'nav.preview' },
  { id: 'export', key: 'nav.export' },
];

export function StepIndicator({ currentView }: StepIndicatorProps) {
  const { t } = useTranslation();
  if (currentView === 'home') return null;

  const currentIndex = STEPS.findIndex(s => s.id === currentView);

  return (
    <div className="flex items-center space-x-2 md:space-x-4">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300",
                isCompleted ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]" :
                isCurrent ? "border-2 border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]" :
                "border border-zinc-800 bg-zinc-900/50 text-zinc-500"
              )}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                "ml-2 hidden text-sm font-medium transition-colors md:block",
                isCurrent ? "text-zinc-100" :
                isCompleted ? "text-zinc-300" : "text-zinc-600",
                isUpcoming && "opacity-50"
              )}
            >
              {t(step.key)}
            </span>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "ml-2 h-[2px] w-4 rounded-full md:ml-4 md:w-8 transition-colors duration-300",
                  isCompleted ? "bg-blue-600/50" : "bg-zinc-800"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
