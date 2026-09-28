import { useProjectStore } from '@/features/project/store';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SyncScreen } from './screens/SyncScreen';
import { PreviewScreen } from './screens/PreviewScreen';
import { ExportScreen } from './screens/ExportScreen';
import { AppHeader } from './components/AppHeader';
import { LegalDisclaimer } from './components/LegalDisclaimer';

function App() {
  const view = useProjectStore((s) => s.view);
  const hasAcceptedLegal = useProjectStore((s) => s.hasAcceptedLegal);
  
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden">
      {!hasAcceptedLegal && <LegalDisclaimer />}
      
      <AppHeader />
      <main className="container mx-auto px-4 pb-8 h-[calc(100vh-4rem)]">
        {view === 'home' && <HomeScreen />}
        {view === 'setup' && <SetupScreen />}
        {view === 'sync' && <SyncScreen />}
        {view === 'preview' && <PreviewScreen />}
        {view === 'export' && <ExportScreen />}
      </main>
    </div>
  );
}

export default App;
