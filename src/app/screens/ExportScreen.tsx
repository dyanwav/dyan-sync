import { useProjectStore } from '@/features/project/store';
import { exportLrc, downloadLrc } from '@/features/export';
import { Button } from '@/shared/ui/button';
import { Download, Copy, CheckCircle2, ChevronLeft, FileText, Video } from 'lucide-react';
import { useState, useMemo } from 'react';

export function ExportScreen() {
  const { project, setView } = useProjectStore();
  const [copied, setCopied] = useState(false);

  const lrcContent = useMemo(() => {
    if (!project) return '';
    return exportLrc(project.lines, project.meta);
  }, [project]);

  const handleDownload = () => {
    if (!project) return;
    const filename = `${project.meta.artist || 'Artist'} - ${project.meta.title || 'Title'}`.trim();
    downloadLrc(lrcContent, filename);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(lrcContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Export Project</h2>
          <p className="text-zinc-400 mt-1">Download your synced lyrics or export as video.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Export Content */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-zinc-100 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-400" />
                LRC File Preview
              </h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopy}
                  className="bg-zinc-950/50 border-zinc-800"
                >
                  {copied ? (
                    <><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Copied!</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-4 font-mono text-sm text-zinc-300 h-[400px] overflow-y-auto whitespace-pre-wrap">
              {lrcContent || 'No synced lyrics found.'}
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">Export Options</h3>
            
            <div className="space-y-4">
              <Button 
                onClick={handleDownload}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all"
              >
                <Download className="mr-2 h-5 w-5" />
                Download .LRC File
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">Coming Soon</span>
                </div>
              </div>

              <Button 
                disabled
                variant="outline"
                className="w-full h-12 bg-zinc-950/50 border-zinc-800 text-zinc-500"
              >
                <Video className="mr-2 h-5 w-5" />
                Export Video (Pro)
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-medium text-zinc-100 mb-2">Project Stats</h3>
            <dl className="space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between">
                <dt>Total Lines</dt>
                <dd className="text-zinc-100">{project?.lines.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Synced Lines</dt>
                <dd className="text-zinc-100">
                  {project?.lines.filter(l => l.start !== null).length || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Completion</dt>
                <dd className="text-zinc-100">
                  {project?.lines.length ? 
                    Math.round((project.lines.filter(l => l.start !== null).length / project.lines.length) * 100) 
                  : 0}%
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="flex justify-start pt-4 border-t border-zinc-800/80">
        <Button 
          variant="ghost"
          onClick={() => setView('preview')}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Preview
        </Button>
      </div>
    </div>
  );
}
