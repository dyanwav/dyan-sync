import { useEffect, useState } from 'react';
import { useProjectStore } from '@/features/project/store';
import { listProjects, deleteProject, deleteBlob, loadBlob } from '@/features/project/services/db';
import type { ProjectRecord } from '@/features/project/services/db';
import { useAudioEngine } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { Plus, Music, Clock, Trash2, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/features/i18n';

export function HomeScreen() {
  const setProject = useProjectStore((s) => s.setProject);
  const setView = useProjectStore((s) => s.setView);
  const audio = useAudioEngine();
  const { t } = useTranslation();
  
  const [recentProjects, setRecentProjects] = useState<ProjectRecord[]>([]);

  useEffect(() => {
    listProjects().then(records => {
      setRecentProjects(records);
    }).catch(console.error);
  }, []);

  const handleNewProject = () => {
    setProject({
      id: crypto.randomUUID(),
      schemaVersion: 1,
      meta: { title: '', artist: '' },
      audio: { blobId: '', name: '', size: 0, duration: 0 },
      settings: {
        tapOffsetMs: -120,
        debounceMs: 70,
        playbackRate: 1,
        theme: {
          preset: 'dark',
          fontFamily: 'Inter',
          fontSize: 24,
          lineSpacing: 1.5,
          lookaheadMs: 150,
        }
      },
      lines: [],
      updatedAt: Date.now(),
    });
    setView('setup');
  };

  const handleOpenProject = async (record: ProjectRecord) => {
    const proj = record.data;
    setProject(proj);
    
    // Restore audio from IndexedDB blob store if exists
    if (proj.audio?.blobId) {
      try {
        const blob = await loadBlob(proj.audio.blobId);
        if (blob) {
          await audio.loadAudio(blob);
        }
      } catch (err) {
        console.error('Failed to restore audio blob from IndexedDB:', err);
      }
    }
    
    if (proj.lines && proj.lines.length > 0 && proj.lines.some(l => l.start !== null)) {
      setView('sync');
    } else {
      setView('setup');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('home.deleteConfirm'))) {
      await deleteProject(id);
      await deleteBlob(id).catch(() => {});
      setRecentProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="flex flex-col items-center pt-16 md:pt-24 max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent drop-shadow-sm">
          {t('app.name')}
        </h1>
        <p className="text-lg text-zinc-400 max-w-lg mx-auto">
          {t('app.tagline')}
        </p>
      </div>

      <Button 
        onClick={handleNewProject}
        size="lg"
        className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300"
      >
        <Plus className="mr-2 h-5 w-5" />
        {t('home.newProject')}
      </Button>

      <div className="w-full mt-12 space-y-6">
        <h2 className="text-xl font-medium text-zinc-100 border-b border-zinc-800 pb-2">
          {t('home.recentProjects')}
        </h2>

        {recentProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm border-dashed">
            <Music className="h-12 w-12 text-zinc-700 mb-4" />
            <p className="text-zinc-400 text-center">{t('home.noProjects')}</p>
            <p className="text-sm text-zinc-600 text-center mt-1">
              {t('home.noProjectsDescription')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentProjects.map((record) => {
              const proj = record.data;
              const syncedCount = proj.lines?.filter(l => l.start !== null).length || 0;
              const totalCount = proj.lines?.length || 0;

              return (
                <div 
                  key={record.id}
                  className="group relative flex flex-col justify-between p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl hover:bg-zinc-800/60 transition-all duration-300 cursor-pointer"
                  onClick={() => handleOpenProject(record)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-zinc-100 truncate max-w-[200px]">
                        {proj.meta?.title || 'Untitled'}
                      </h3>
                      <p className="text-sm text-zinc-400 truncate max-w-[200px]">
                        {proj.meta?.artist || 'Unknown Artist'}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, record.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-zinc-500 mt-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(proj.updatedAt || record.updatedAt).toLocaleDateString()}
                      </span>
                      {totalCount > 0 && (
                        <span>{syncedCount}/{totalCount} {t('home.linesSync')}</span>
                      )}
                    </div>
                    <div className="flex items-center text-blue-400 group-hover:translate-x-1 transition-transform">
                      {t('home.open')} <ChevronRight className="ml-1 h-3 w-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
