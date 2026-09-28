import { useState, useEffect } from 'react';
import { useProjectStore } from '@/features/project/store';
import { useAudioEngine } from '@/features/audio';
import { parseLyrics } from '@/features/sync';
import { parseLrc } from '@/features/export';
import { saveBlob } from '@/features/project/services/db';
import { AudioDropzone } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { ArrowRight, Upload } from 'lucide-react';
import { useTranslation } from '@/features/i18n';

export function SetupScreen() {
  const { project, updateMeta, setLines, setView } = useProjectStore();
  const { state, loadAudio } = useAudioEngine();
  const { t } = useTranslation();
  
  const [lyricsInput, setLyricsInput] = useState('');
  
  // Load lyrics into input if they exist in project
  useEffect(() => {
    if (project && project.lines.length > 0 && !lyricsInput) {
      setLyricsInput(project.lines.map(l => l.text).join('\n'));
    }
  }, [project, lyricsInput]);

  const handleAudioLoad = async (file: File) => {
    const res = await loadAudio(file);
    if (project) {
      saveBlob(project.id, file, file.name).catch(console.error);
      const cleanedName = file.name.replace(/\.[^/.]+$/, '');
      if (!project.meta.title) {
        updateMeta({ title: cleanedName });
      }
      useProjectStore.setState((s) => {
        if (s.project) {
          s.project.audio = {
            blobId: project.id,
            name: file.name,
            size: file.size,
            duration: res.duration,
          };
          s.project.updatedAt = Date.now();
        }
      });
    }
  };

  const handleLyricsImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLrc = file.name.toLowerCase().endsWith('.lrc');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (isLrc) {
          const parsed = parseLrc(content);
          if (parsed.meta.title && !project?.meta.title) {
            updateMeta({ title: parsed.meta.title });
          }
          if (parsed.meta.artist && !project?.meta.artist) {
            updateMeta({ artist: parsed.meta.artist });
          }
          setLines(parsed.lines);
          setLyricsInput(parsed.lines.map(l => l.text).join('\n'));
        } else {
          setLyricsInput(content);
        }
      }
    };
    reader.readAsText(file);
  };

  const isReady = state.isLoaded && lyricsInput.trim().length > 0;

  const handleContinue = () => {
    if (!project) return;
    if (!state.isLoaded) {
      alert(t('setup.needAudioAndLyrics'));
      return;
    }
    
    // If lines weren't already parsed from LRC, parse plain text
    if (project.lines.length === 0 || project.lines.map(l => l.text).join('\n') !== lyricsInput.trim()) {
      const lines = parseLyrics(lyricsInput);
      setLines(lines);
    }
    
    setView('sync');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Audio */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl flex flex-col h-full">
            <h2 className="text-xl font-semibold text-zinc-100 flex items-center mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm mr-2">1</span>
              {t('setup.uploadAudio')}
            </h2>
            <div className="flex-1 flex flex-col justify-center">
              <AudioDropzone onLoad={handleAudioLoad} />
            </div>
          </div>
        </div>

        {/* Right Column - Lyrics & Meta */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-zinc-100 flex items-center mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm mr-2">2</span>
              {t('setup.metadata')}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('setup.title_field')}</Label>
                <Input 
                  id="title"
                  placeholder="" 
                  value={project?.meta.title || ''}
                  onChange={(e) => updateMeta({ title: e.target.value })}
                  className="bg-zinc-950/50 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">{t('setup.artist')}</Label>
                <Input 
                  id="artist"
                  placeholder="" 
                  value={project?.meta.artist || ''}
                  onChange={(e) => updateMeta({ artist: e.target.value })}
                  className="bg-zinc-950/50 border-zinc-800"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-100 flex items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm mr-2">3</span>
                {t('setup.lyrics')}
              </h2>
              <div>
                <input 
                  type="file" 
                  id="lyrics-upload" 
                  accept=".txt,.lrc" 
                  className="hidden" 
                  onChange={handleLyricsImport}
                />
                <Label 
                  htmlFor="lyrics-upload"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 h-9 px-3"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('setup.importLrc')}
                </Label>
              </div>
            </div>
            
            <Textarea
              placeholder={t('setup.lyricsPlaceholder')}
              className="flex-1 min-h-[200px] resize-y bg-zinc-950/50 border-zinc-800 font-mono text-sm"
              value={lyricsInput}
              onChange={(e) => setLyricsInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-800/80">
        <div className="flex flex-col items-end">
          {!isReady && (
            <span className="text-sm text-amber-500/80 mb-2">{t('setup.needAudioAndLyrics')}</span>
          )}
          <Button 
            size="lg"
            onClick={handleContinue}
            disabled={!isReady}
            className="bg-blue-600 hover:bg-blue-500 text-white min-w-[200px]"
          >
            {t('setup.continueToSync')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
