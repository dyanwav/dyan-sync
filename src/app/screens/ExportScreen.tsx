import { useProjectStore } from '@/features/project/store';
import { exportLrc, downloadLrc, exportVideo, downloadVideoBlob, getDecodedAudio } from '@/features/export';
import { useAudioEngine } from '@/features/audio';
import { loadBlob } from '@/features/project/services/db';
import { Button } from '@/shared/ui/button';
import { Slider } from '@/shared/ui/slider';
import { 
  Download, 
  Copy, 
  CheckCircle2, 
  ChevronLeft, 
  FileText, 
  Video, 
  Sparkles, 
  Clock, 
  Sliders, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Film,
  Play,
  Pause
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '@/features/i18n';
import { cn } from '@/shared/utils/cn';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ExportScreen() {
  const { project, setView } = useProjectStore();
  const audio = useAudioEngine();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'video' | 'lrc'>('video');
  const [copied, setCopied] = useState(false);

  // Video Export Settings
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [rangeType, setRangeType] = useState<'full' | '15s' | '30s' | '60s' | 'custom'>('full');
  
  const totalDuration = useMemo(() => {
    return project?.audio.duration || audio.engine.getDuration() || 180;
  }, [project?.audio.duration, audio.engine]);

  // First synced line start time
  const firstSyncedStart = useMemo(() => {
    const first = project?.lines.find(l => l.start !== null && l.start > 0);
    return first?.start ?? 0;
  }, [project?.lines]);

  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(30);

  // Initialize or update range when song loads
  useEffect(() => {
    if (totalDuration > 0 && customEnd === 30 && customStart === 0) {
      setCustomEnd(Math.min(totalDuration, 30));
    }
  }, [totalDuration]);

  // Calculate actual export start and end times
  const { exportStart, exportEnd } = useMemo(() => {
    switch (rangeType) {
      case '15s': {
        const start = Math.max(0, firstSyncedStart);
        const end = Math.min(totalDuration, start + 15);
        return { exportStart: start, exportEnd: end };
      }
      case '30s': {
        const start = Math.max(0, firstSyncedStart);
        const end = Math.min(totalDuration, start + 30);
        return { exportStart: start, exportEnd: end };
      }
      case '60s': {
        const start = Math.max(0, firstSyncedStart);
        const end = Math.min(totalDuration, start + 60);
        return { exportStart: start, exportEnd: end };
      }
      case 'custom': {
        const start = Math.max(0, Math.min(customStart, totalDuration));
        const end = Math.max(start + 1, Math.min(customEnd, totalDuration));
        return { exportStart: start, exportEnd: end };
      }
      case 'full':
      default:
        return { exportStart: 0, exportEnd: totalDuration };
    }
  }, [rangeType, firstSyncedStart, totalDuration, customStart, customEnd]);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Audio preview playback for selected export range
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Auto-load audio into engine if not loaded (e.g. direct reload on export view)
  useEffect(() => {
    if (!audio.state.isLoaded && project?.audio?.blobId) {
      loadBlob(project.audio.blobId).then((blob) => {
        if (blob) {
          audio.loadAudio(blob).catch((err) => console.warn('Could not auto-load audio for preview:', err));
        }
      });
    }
  }, [audio.state.isLoaded, project?.audio?.blobId]);

  const handleTogglePreviewAudio = () => {
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
    } else {
      audio.engine.seek(exportStart);
      audio.play();
      setIsPreviewPlaying(true);
    }
  };

  useEffect(() => {
    if (!isPreviewPlaying) return;

    let animId: number;
    const checkSnippet = () => {
      const current = audio.engine.getCurrentTime();
      if (current >= exportEnd || !audio.engine.clock.isPlaying) {
        audio.pause();
        audio.engine.seek(exportStart);
        setIsPreviewPlaying(false);
        return;
      }
      animId = requestAnimationFrame(checkSnippet);
    };

    animId = requestAnimationFrame(checkSnippet);
    return () => cancelAnimationFrame(animId);
  }, [isPreviewPlaying, exportStart, exportEnd, audio]);

  // Stop preview if range changes
  useEffect(() => {
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
    }
  }, [rangeType, customStart, customEnd]);

  // Cleanup audio preview on unmount
  useEffect(() => {
    return () => {
      if (audio.engine.clock.isPlaying) {
        audio.pause();
      }
    };
  }, [audio]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (exportedVideoUrl) {
        URL.revokeObjectURL(exportedVideoUrl);
      }
    };
  }, [exportedVideoUrl]);

  // LRC Content
  const lrcContent = useMemo(() => {
    if (!project) return '';
    return exportLrc(project.lines, project.meta);
  }, [project]);

  const handleDownloadLrc = () => {
    if (!project) return;
    const filename = `${project.meta.artist || 'Artist'} - ${project.meta.title || 'Title'}`.trim();
    downloadLrc(lrcContent, filename);
  };

  const handleCopyLrc = () => {
    navigator.clipboard.writeText(lrcContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateVideo = async () => {
    if (!project) return;

    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
    }

    if (exportedVideoUrl) {
      URL.revokeObjectURL(exportedVideoUrl);
      setExportedVideoUrl(null);
    }
    setExportedBlob(null);
    setExportError(null);
    setIsExporting(true);
    setExportProgress(1);
    setExportStatus(t('export.readyToExport'));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let audioBuffer = audio.engine.getAudioBuffer();
      if (!audioBuffer) {
        setExportStatus('Cargando pista de audio...');
        audioBuffer = await getDecodedAudio(project, null);
      }

      const blob = await exportVideo(project, audioBuffer, {
        resolution,
        fps,
        startTime: exportStart,
        endTime: exportEnd,
        onProgress: (pct, msg) => {
          setExportProgress(pct);
          setExportStatus(msg);
        },
        signal: controller.signal,
      });

      setExportedBlob(blob);
      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
      setExportProgress(100);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setExportStatus('Exportación cancelada');
      } else {
        console.error('Video export error:', err);
        setExportError(err?.message || 'Error al exportar el video');
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDownloadVideo = () => {
    if (!exportedBlob || !project) return;
    const artist = project.meta.artist || 'Artist';
    const title = project.meta.title || 'Title';
    const rangeSuffix = rangeType === 'full' ? 'full' : `${formatTime(exportStart)}-${formatTime(exportEnd)}`;
    const filename = `${artist} - ${title} (9x16 ${resolution} ${rangeSuffix})`;
    downloadVideoBlob(exportedBlob, filename);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pt-4 pb-12">
      {/* Header and Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Film className="w-6 h-6 text-blue-500" />
            {t('export.title')}
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {activeTab === 'video' ? t('export.videoDescription') : t('export.lrcDescription')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('video')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === 'video'
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Video className="w-4 h-4" />
            {t('export.videoTab')}
          </button>
          <button
            onClick={() => setActiveTab('lrc')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === 'lrc'
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <FileText className="w-4 h-4" />
            {t('export.lrcTab')}
          </button>
        </div>
      </div>

      {activeTab === 'video' ? (
        /* Video Export Section */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 9:16 Video Player or Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl relative flex flex-col items-center justify-center">
              {exportedVideoUrl ? (
                <video
                  src={exportedVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center space-y-4 flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-200 text-base">{t('export.previewPlaceholder')}</h4>
                    <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                      {t('export.previewPlaceholderDesc')}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    9:16 Vertical • {resolution === '1080p' ? '1080×1920' : '720×1280'}
                  </div>
                </div>
              )}
            </div>

            {/* Quick action button under video when completed */}
            {exportedVideoUrl && (
              <div className="w-full max-w-[340px] mt-4 space-y-2">
                <Button
                  onClick={handleDownloadVideo}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t('export.downloadVideo')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
                    setExportedVideoUrl(null);
                    setExportedBlob(null);
                  }}
                  className="w-full border-zinc-800 text-zinc-400 hover:text-zinc-200 bg-zinc-950/40"
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  {t('export.regenerate')}
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Settings & Export Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Range Selector Card */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  {t('export.timeRange')}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePreviewAudio}
                    className={cn(
                      "h-7 px-2.5 text-[11px] font-semibold rounded-lg cursor-pointer transition-all",
                      isPreviewPlaying
                        ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)] animate-pulse"
                        : "bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:text-white"
                    )}
                    title={isPreviewPlaying ? "Pausar preescucha" : "Escuchar fragmento seleccionado"}
                  >
                    {isPreviewPlaying ? (
                      <>
                        <Pause className="w-3 h-3 mr-1 text-white fill-white" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1 text-blue-400 fill-blue-400" />
                        <span>Escuchar selección</span>
                      </>
                    )}
                  </Button>
                  <span className="text-xs font-mono text-zinc-300 bg-zinc-950/70 px-2.5 py-1 rounded-md border border-zinc-800">
                    {formatTime(exportStart)} - {formatTime(exportEnd)} ({Math.round(exportEnd - exportStart)}s)
                  </span>
                </div>
              </div>

              {/* Range Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'full', label: t('export.fullSong') },
                  { id: '15s', label: t('export.preset15s') },
                  { id: '30s', label: t('export.preset30s') },
                  { id: '60s', label: t('export.preset60s') },
                  { id: 'custom', label: t('export.customRange') },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setRangeType(p.id as any)}
                    className={cn(
                      "py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      rangeType === p.id
                        ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Range Sliders / Inputs */}
              {rangeType === 'custom' && (
                <div className="pt-4 border-t border-zinc-800/60 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      Rango Personalizado (Doble Control)
                    </span>
                    <span className="font-mono text-blue-400 font-bold bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded">
                      {formatTime(customStart)} → {formatTime(customEnd)} ({((customEnd - customStart)).toFixed(1)}s)
                    </span>
                  </div>

                  {/* Dual-Thumb Range Slider */}
                  <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-3">
                    <Slider
                      value={[customStart, customEnd]}
                      min={0}
                      max={totalDuration}
                      step={0.5}
                      minStepsBetweenThumbs={1}
                      onValueChange={([start, end]) => {
                        const s = Math.max(0, Math.min(start, totalDuration - 0.5));
                        const e = Math.max(s + 0.5, Math.min(end, totalDuration));
                        setCustomStart(s);
                        setCustomEnd(e);
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500 px-1">
                      <span>00:00</span>
                      <span className="text-zinc-400 text-center">
                        Desliza el botón izquierdo para el inicio y el derecho para el final
                      </span>
                      <span>{formatTime(totalDuration)}</span>
                    </div>
                  </div>

                  {/* Range Detail Inputs & Listen Snippet Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                        <span className="text-[11px] text-zinc-400 font-medium">Inicio:</span>
                        <input
                          type="number"
                          min={0}
                          max={Math.max(0, customEnd - 0.5)}
                          step={0.5}
                          value={Number(customStart.toFixed(1))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCustomStart(Math.max(0, Math.min(val, customEnd - 0.5)));
                          }}
                          className="w-16 bg-transparent text-xs text-zinc-100 font-mono focus:outline-none text-right"
                        />
                        <span className="text-[11px] font-mono text-zinc-500">s</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                        <span className="text-[11px] text-zinc-400 font-medium">Fin:</span>
                        <input
                          type="number"
                          min={customStart + 0.5}
                          max={totalDuration}
                          step={0.5}
                          value={Number(customEnd.toFixed(1))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || totalDuration;
                            setCustomEnd(Math.min(totalDuration, Math.max(customStart + 0.5, val)));
                          }}
                          className="w-16 bg-transparent text-xs text-zinc-100 font-mono focus:outline-none text-right"
                        />
                        <span className="text-[11px] font-mono text-zinc-500">s</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTogglePreviewAudio}
                      className={cn(
                        "h-8 px-3 text-xs font-semibold rounded-lg cursor-pointer transition-all",
                        isPreviewPlaying
                          ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse"
                          : "bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:text-white"
                      )}
                    >
                      {isPreviewPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 mr-1.5 text-white fill-white" />
                          <span>Pausar escucha</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 mr-1.5 text-blue-400 fill-blue-400" />
                          <span>Escuchar selección ({formatTime(customStart)} - {formatTime(customEnd)})</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Quality & Resolution Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Resolution */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  {t('export.resolution')}
                </h3>
                <div className="space-y-2">
                  {[
                    { id: '1080p', label: '1080×1920 (Full HD)', desc: 'Instagram Reels / TikTok' },
                    { id: '720p', label: '720×1280 (HD)', desc: 'Renderizado más rápido' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setResolution(r.id as any)}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-all cursor-pointer",
                        resolution === r.id
                          ? "bg-blue-600/15 border-blue-500/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                          : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <div className="font-semibold text-xs text-zinc-100">{r.label}</div>
                      <div className="text-[11px] text-zinc-500">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  {t('export.framerate')}
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 30, label: '30 FPS (Recomendado)', desc: 'Balance óptimo de calidad y peso' },
                    { id: 60, label: '60 FPS (Ultra Fluido)', desc: 'Movimiento hiperfluido' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFps(f.id as any)}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-all cursor-pointer",
                        fps === f.id
                          ? "bg-blue-600/15 border-blue-500/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                          : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <div className="font-semibold text-xs text-zinc-100">{f.label}</div>
                      <div className="text-[11px] text-zinc-500">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {exportError && (
              <div className="rounded-xl bg-red-950/30 border border-red-800/50 p-4 flex items-start gap-3 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-200">Error durante la exportación</div>
                  <div className="text-xs text-red-300/80 mt-1">{exportError}</div>
                </div>
                <button
                  onClick={() => setExportError(null)}
                  className="text-red-400 hover:text-red-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Progress & Generation Panel */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl space-y-5">
              {isExporting ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300 font-medium flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      {exportStatus || 'Renderizando...'}
                    </span>
                    <span className="font-mono font-bold text-blue-400">{exportProgress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-200 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-zinc-500 font-mono">
                      {resolution} • {fps} FPS • {Math.round(exportEnd - exportStart)}s de video
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelExport}
                      className="border-red-900/50 text-red-400 hover:bg-red-950/40"
                    >
                      {t('export.cancel')}
                    </Button>
                  </div>
                </div>
              ) : exportedVideoUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    onClick={handleDownloadVideo}
                    className="flex-1 w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {t('export.downloadVideo')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateVideo}
                    className="h-14 px-6 border-zinc-800 bg-zinc-950/50 text-zinc-300 hover:text-white"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('export.regenerate')}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateVideo}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all cursor-pointer"
                >
                  <Video className="mr-2.5 h-5 w-5" />
                  {t('export.generateVideo')}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* LRC Export Section */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main LRC Preview */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-zinc-100 flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-400" />
                  {t('export.preview')}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLrc}
                    className="bg-zinc-950/50 border-zinc-800 text-zinc-300 hover:text-white"
                  >
                    {copied ? (
                      <><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> {t('export.copied')}</>
                    ) : (
                      <><Copy className="mr-2 h-4 w-4" /> {t('export.copyLrc')}</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-4 font-mono text-sm text-zinc-300 h-[400px] overflow-y-auto whitespace-pre-wrap select-all">
                {lrcContent || 'No synced lyrics found.'}
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl">
              <h3 className="text-lg font-medium text-zinc-100 mb-4">{t('export.lrcExport')}</h3>

              <div className="space-y-4">
                <Button
                  onClick={handleDownloadLrc}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all cursor-pointer"
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t('export.download')}
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
                    {project?.lines.filter((l) => l.start !== null).length || 0}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Completion</dt>
                  <dd className="text-zinc-100">
                    {project?.lines.length
                      ? Math.round(
                          (project.lines.filter((l) => l.start !== null).length / project.lines.length) * 100
                        )
                      : 0}
                    %
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Back Button */}
      <div className="flex justify-start pt-4 border-t border-zinc-800/80">
        <Button
          variant="ghost"
          onClick={() => setView('preview')}
          className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t('export.backToPreview')}
        </Button>
      </div>
    </div>
  );
}
