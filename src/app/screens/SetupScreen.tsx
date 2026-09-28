import { useState, useEffect } from 'react';
import { useProjectStore } from '@/features/project/store';
import { useAudioEngine } from '@/features/audio';
import { parseLyrics } from '@/features/sync';
import { AudioDropzone } from '@/features/audio';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { ArrowRight, Upload } from 'lucide-react';

export function SetupScreen() {
  const { project, updateMeta, setLines, setView } = useProjectStore();
  const { state, loadAudio } = useAudioEngine();
  
  const [lyricsInput, setLyricsInput] = useState('');
  
  // When audio is loaded, we can auto-fill meta if we wanted, but we rely on the component for now
  
  // Also load lyrics into input if they exist in project
  useEffect(() => {
    if (project && project.lines.length > 0 && !lyricsInput) {
      setLyricsInput(project.lines.map(l => l.text).join('\n'));
    }
  }, [project]);

  const handleAudioLoad = async (file: File) => {
    await loadAudio(file);
    // Note: AudioEngine currently doesn't parse ID3 tags in this MVP.
    // If we wanted to, we would updateMeta here.
  };

  const handleLyricsImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setLyricsInput(content);
      }
    };
    reader.readAsText(file);
  };

  const handleContinue = () => {
    if (!project) return;
    
    // Parse lyrics and save to project
    const lines = parseLyrics(lyricsInput);
    setLines(lines);
    
    setView('sync');
  };

  const isReady = state.isLoaded && lyricsInput.trim().length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Audio */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl flex flex-col h-full">
            <h2 className="text-xl font-semibold text-zinc-100 flex items-center mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm mr-2">1</span>
              Audio Track
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
              Track Metadata
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Song Title</Label>
                <Input 
                  id="title"
                  placeholder="e.g. Bohemian Rhapsody" 
                  value={project?.meta.title || ''}
                  onChange={(e) => updateMeta({ title: e.target.value })}
                  className="bg-zinc-950/50 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">Artist</Label>
                <Input 
                  id="artist"
                  placeholder="e.g. Queen" 
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
                Lyrics
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
                  Import File
                </Label>
              </div>
            </div>
            
            <Textarea
              placeholder="Paste your lyrics here...&#10;&#10;One line per line of the song.&#10;Empty lines will be treated as instrumental breaks."
              className="flex-1 min-h-[200px] resize-y bg-zinc-950/50 border-zinc-800 font-mono text-sm"
              value={lyricsInput}
              onChange={(e) => setLyricsInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-800/80">
        <Button 
          size="lg"
          onClick={handleContinue}
          disabled={!isReady}
          className="bg-blue-600 hover:bg-blue-500 text-white min-w-[200px]"
        >
          Continue to Sync
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
