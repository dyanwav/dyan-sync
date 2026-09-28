import { useProjectStore } from '@/features/project/store';
import { Button } from '@/shared/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/features/i18n';

export function LegalDisclaimer() {
  const acceptLegal = useProjectStore((s) => s.acceptLegal);
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-blue-500/10 p-3">
            <ShieldAlert className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-50">{t('legal.title')}</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {t('legal.description')}
          </p>
        </div>

        <div className="mb-6 space-y-4 rounded-lg bg-zinc-950/50 p-4 text-sm text-zinc-300">
          <p>
            {t('legal.agreement')}
          </p>
          <div className="text-xs text-zinc-500 text-center mt-4">
            {t('legal.privacy')}
          </div>
        </div>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]" 
          onClick={acceptLegal}
        >
          {t('legal.accept')}
        </Button>
      </div>
    </div>
  );
}
