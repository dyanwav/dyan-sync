import { useProjectStore } from '@/features/project/store';
import { StepIndicator } from './StepIndicator';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Keyboard } from 'lucide-react';
import { KeyboardShortcutsPanel } from '@/features/sync';
import { useState } from 'react';
import { useTranslation } from '@/features/i18n';

export function AppHeader() {
  const view = useProjectStore((s) => s.view);
  const setView = useProjectStore((s) => s.setView);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { t, locale, setLocale } = useTranslation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {view !== 'home' ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('home')}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-9" /> // Placeholder for alignment
          )}
          
          <div className="flex flex-col">
            <h1 className="font-spaceGrotesk text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
              {t('app.name')}
            </h1>
          </div>
        </div>

        <StepIndicator currentView={view} />

        <div className="flex items-center gap-2">
          {view === 'sync' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowShortcuts(true)}
              className="text-zinc-400 hover:text-zinc-100"
              title={t('nav.shortcuts')}
            >
              <Keyboard className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="text-zinc-400 hover:text-zinc-100 font-medium"
          >
            {locale === 'en' ? 'ES' : 'EN'}
          </Button>
        </div>
      </div>
      
      {showShortcuts && (
        <div className="absolute right-4 top-16 z-50">
          <div className="relative">
            <button 
              onClick={() => setShowShortcuts(false)}
              className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-full w-6 h-6 flex items-center justify-center text-xs border border-zinc-700"
            >
              ×
            </button>
            <KeyboardShortcutsPanel />
          </div>
        </div>
      )}
    </header>
  );
}
