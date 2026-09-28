import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { Project } from '@/features/project/types';
import { loadBlob } from '@/features/project/services/db';
import { renderFrame, GRADIENT_PRESETS, createGradientBackground, createCustomPhotoBackground } from '@/features/viewer';
import type { RenderScene } from '@/features/viewer/types';

export interface VideoExportOptions {
  resolution?: '1080p' | '720p';
  fps?: 30 | 60;
  startTime: number;
  endTime: number;
  bitrate?: number;
  onProgress?: (progress: number, status: string) => void;
  signal?: AbortSignal;
}

export async function getDecodedAudio(
  project: Project,
  audioBuffer: AudioBuffer | null
): Promise<AudioBuffer | null> {
  if (audioBuffer) return audioBuffer;
  if (!project.audio?.blobId) return null;

  try {
    const blob = await loadBlob(project.audio.blobId);
    if (!blob) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      return await ctx.decodeAudioData(arrayBuffer);
    } finally {
      if (ctx.state !== 'closed') {
        await ctx.close().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Failed to load and decode audio from IndexedDB blob:', err);
    return null;
  }
}

async function findSupportedVideoCodec(
  width: number,
  height: number,
  fps: number,
  bitrate: number
): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  const candidates = [
    'avc1.4d002a', // Main Profile Level 4.2
    'avc1.640028', // High Profile Level 4.0
    'avc1.42001f', // Baseline Level 3.1
    'avc1.4d001f', // Main Level 3.1
    'avc1.420028', // Baseline Level 4.0
  ];

  for (const candidate of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: candidate,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (support.supported) {
        return candidate;
      }
    } catch {
      // test next candidate
    }
  }

  return null;
}

async function findSupportedAudioCodec(
  numberOfChannels: number,
  sampleRate: number
): Promise<'mp4a.40.2' | null> {
  if (typeof AudioEncoder === 'undefined') return null;

  try {
    const support = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      numberOfChannels,
      sampleRate,
      bitrate: 192_000,
    });
    if (support.supported) {
      return 'mp4a.40.2';
    }
  } catch {
    // not supported
  }

  return null;
}

async function exportWithWebCodecs(
  _project: Project,
  audioBuffer: AudioBuffer | null,
  options: VideoExportOptions,
  scene: RenderScene,
  videoCodec: string,
  audioCodec: 'mp4a.40.2' | null
): Promise<Blob> {
  const { fps = 30, startTime, endTime, onProgress, signal } = options;
  const { width, height } = scene;
  const duration = Math.max(0.5, endTime - startTime);
  const totalFrames = Math.max(1, Math.ceil(duration * fps));

  const bitrate = options.bitrate || (width === 720 ? 4_500_000 : (fps === 60 ? 12_000_000 : 8_000_000));

  const target = new ArrayBufferTarget();
  const hasAudio = Boolean(audioBuffer && audioCodec);

  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    audio: hasAudio && audioBuffer ? {
      codec: 'aac',
      numberOfChannels: 2,
      sampleRate: audioBuffer.sampleRate,
    } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      console.error('VideoEncoder error:', err);
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: videoCodec,
    width,
    height,
    bitrate,
    framerate: fps,
  });

  let audioEncoder: AudioEncoder | null = null;
  if (hasAudio && audioBuffer) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (err) => {
        console.error('AudioEncoder error:', err);
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });

    audioEncoder.configure({
      codec: 'mp4a.40.2',
      numberOfChannels: 2,
      sampleRate: audioBuffer.sampleRate,
      bitrate: 192_000,
    });
  }

  try {
    // 1. Encode Audio track (if present)
    if (hasAudio && audioBuffer && audioEncoder) {
      onProgress?.(3, 'Codificando pista de audio AAC...');
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.max(0, Math.floor(startTime * sampleRate));
      const endSample = Math.min(audioBuffer.length, Math.ceil(endTime * sampleRate));
      const totalSamples = Math.max(0, endSample - startSample);

      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;
      const chunkFrames = 1024;

      for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
        if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
        if (encoderError) throw encoderError;

        const actualFrames = Math.min(chunkFrames, totalSamples - offset);
        const chunkBuffer = new Float32Array(chunkFrames * 2);

        const srcStart = startSample + offset;
        chunkBuffer.set(leftChannel.subarray(srcStart, Math.min(audioBuffer.length, srcStart + actualFrames)), 0);
        chunkBuffer.set(rightChannel.subarray(srcStart, Math.min(audioBuffer.length, srcStart + actualFrames)), chunkFrames);

        const timestampUs = Math.round((offset / sampleRate) * 1_000_000);
        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: chunkFrames,
          numberOfChannels: 2,
          timestamp: timestampUs,
          data: chunkBuffer,
        });

        audioEncoder.encode(audioData);
        audioData.close();
      }

      await audioEncoder.flush();
      audioEncoder.close();
      audioEncoder = null;
    }

    // 2. Render and encode video frames
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      if (encoderError) throw encoderError;

      const frameTime = startTime + (i / fps);
      renderFrame(ctx, scene, frameTime);

      const timestampUs = Math.round((i / fps) * 1_000_000);
      const durationUs = Math.round((1 / fps) * 1_000_000);

      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: durationUs,
      });

      const isKeyFrame = i % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      if (videoEncoder.encodeQueueSize > 5) {
        await new Promise<void>((resolve) => {
          const wait = () => {
            if (videoEncoder.encodeQueueSize <= 2) resolve();
            else setTimeout(wait, 8);
          };
          wait();
        });
      }

      if (i % 6 === 0 || i === totalFrames - 1) {
        const pct = Math.min(95, Math.round(5 + ((i + 1) / totalFrames) * 90));
        onProgress?.(pct, `Renderizando frame ${i + 1}/${totalFrames}...`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress?.(96, 'Finalizando contenedor MP4...');
    await videoEncoder.flush();
    videoEncoder.close();

    muxer.finalize();
    const mp4Buffer = muxer.target.buffer;
    const blob = new Blob([mp4Buffer], { type: 'video/mp4' });

    onProgress?.(100, '¡Video completado con éxito!');
    return blob;
  } catch (err) {
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch {}
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {}
    throw err;
  }
}

async function exportWithMediaRecorder(
  _project: Project,
  audioBuffer: AudioBuffer | null,
  options: VideoExportOptions,
  scene: RenderScene
): Promise<Blob> {
  const { fps = 30, startTime, endTime, bitrate = 8_000_000, onProgress, signal } = options;
  const { width, height } = scene;
  const duration = Math.max(0.5, endTime - startTime);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const canvasStream = canvas.captureStream(fps);

  let audioCtx: AudioContext | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;

  if (audioBuffer) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(dest);
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }
  }

  const mimeTypes = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  let chosenMime = '';
  for (const m of mimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      chosenMime = m;
      break;
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    try {
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(canvasStream, {
        mimeType: chosenMime || undefined,
        videoBitsPerSecond: bitrate,
      });

      let animationFrameId: number;
      let startPerf = 0;

      const cleanup = () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        try {
          if (sourceNode) {
            sourceNode.stop();
            sourceNode.disconnect();
          }
        } catch {}
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          cleanup();
          try {
            if (recorder.state !== 'inactive') recorder.stop();
          } catch {}
          reject(new DOMException('Export cancelled', 'AbortError'));
        });
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        cleanup();
        const type = chosenMime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(chunks, { type });
        onProgress?.(100, '¡Video completado con éxito!');
        resolve(blob);
      };

      recorder.onerror = (e) => {
        cleanup();
        reject((e as any).error || new Error('MediaRecorder error'));
      };

      renderFrame(ctx, scene, startTime);

      onProgress?.(5, 'Iniciando captura en tiempo real...');
      recorder.start(250);

      if (sourceNode && audioCtx) {
        sourceNode.start(0, startTime, duration);
      }

      startPerf = performance.now();

      const loop = () => {
        if (signal?.aborted) return;

        const elapsed = (performance.now() - startPerf) / 1000;
        const currentAudioTime = startTime + elapsed;

        renderFrame(ctx, scene, currentAudioTime);

        const pct = Math.min(99, Math.round(5 + (elapsed / duration) * 90));
        onProgress?.(pct, `Grabando... ${elapsed.toFixed(1)}s / ${duration.toFixed(1)}s`);

        if (elapsed >= duration) {
          onProgress?.(98, 'Finalizando video...');
          try {
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
          } catch (err) {
            reject(err);
          }
        } else {
          animationFrameId = requestAnimationFrame(loop);
        }
      };

      animationFrameId = requestAnimationFrame(loop);
    } catch (err) {
      reject(err);
    }
  });
}

export async function exportVideo(
  project: Project,
  audioBuffer: AudioBuffer | null,
  options: VideoExportOptions
): Promise<Blob> {
  const resolvedAudio = await getDecodedAudio(project, audioBuffer);

  const { resolution = '1080p', fps = 30 } = options;
  const width = resolution === '720p' ? 720 : 1080;
  const height = resolution === '720p' ? 1280 : 1920;
  const scale = width / 800;
  const fontSize = (project.settings.theme.fontSize || 50) * scale;

  let background: ImageBitmap;
  if (project.settings.theme.preset === 'custom' && project.settings.theme.customImageDataUrl) {
    try {
      const contrast = project.settings.theme.contrast ?? 60;
      background = await createCustomPhotoBackground(project.settings.theme.customImageDataUrl, width, height, contrast);
    } catch {
      const presetId = 'dark';
      const preset = GRADIENT_PRESETS.find((p) => p.id === presetId) || GRADIENT_PRESETS[0];
      background = createGradientBackground(preset, width, height);
    }
  } else {
    const presetId = project.settings.theme.preset || 'dark';
    const preset = GRADIENT_PRESETS.find((p) => p.id === presetId) || GRADIENT_PRESETS[0];
    background = createGradientBackground(preset, width, height);
  }

  const scene: RenderScene = {
    lines: project.lines,
    theme: project.settings.theme,
    background,
    width,
    height,
    fontFamily: project.settings.theme.fontFamily || 'Syne',
    fontSize,
    lineHeight: 1.35,
    lookaheadMs: project.settings.theme.lookaheadMs || 200,
  };

  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
      await document.fonts.load(`800 ${fontSize}px "${scene.fontFamily}"`);
    } catch {}
  }

  const bitrate = options.bitrate || (resolution === '720p' ? 4_500_000 : (fps === 60 ? 12_000_000 : 8_000_000));

  try {
    const videoCodec = await findSupportedVideoCodec(width, height, fps, bitrate);
    const audioCodec = resolvedAudio ? await findSupportedAudioCodec(2, resolvedAudio.sampleRate) : null;

    const canUseWebCodecs = Boolean(videoCodec && (!resolvedAudio || audioCodec));

    if (canUseWebCodecs) {
      try {
        options.onProgress?.(2, 'Preparando codificador acelerado...');
        return await exportWithWebCodecs(project, resolvedAudio, options, scene, videoCodec!, audioCodec);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          throw err;
        }
        console.warn('WebCodecs export failed, falling back to MediaRecorder:', err);
        options.onProgress?.(5, 'Cambiando a modo de compatibilidad (MediaRecorder)...');
      }
    }

    return await exportWithMediaRecorder(project, resolvedAudio, options, scene);
  } finally {
    if (background && typeof background.close === 'function') {
      background.close();
    }
  }
}

export function downloadVideoBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const cleanName = filename.replace(/[<>:"/\\|?*]+/g, '').trim() || 'lyricsync-video';
  const fullFilename = cleanName.toLowerCase().endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fullFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}
