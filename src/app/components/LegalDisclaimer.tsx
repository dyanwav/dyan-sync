import { useProjectStore } from '@/features/project/store';
import { Button } from '@/shared/ui/button';
import { ShieldAlert } from 'lucide-react';

export function LegalDisclaimer() {
  const acceptLegal = useProjectStore((s) => s.acceptLegal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-blue-500/10 p-3">
            <ShieldAlert className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-50">Welcome to LyricSync Studio</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Before you begin, please read our usage guidelines.
          </p>
        </div>

        <div className="mb-6 space-y-4 rounded-lg bg-zinc-950/50 p-4 text-sm text-zinc-300">
          <p>
            By using this software, you acknowledge and agree that:
          </p>
          <ul className="list-disc space-y-2 pl-4 text-zinc-400">
            <li>You have the legal rights or necessary permissions to use the audio files you upload.</li>
            <li>You have the legal rights or necessary permissions to use the lyrics you process.</li>
            <li>This tool is for personal or authorized use only. Do not infringe on copyright.</li>
          </ul>
        </div>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]" 
          onClick={acceptLegal}
        >
          I Understand & Accept
        </Button>
      </div>
    </div>
  );
}
