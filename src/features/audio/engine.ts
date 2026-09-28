import type { AudioClock, PlaybackRate } from './types';

export class AudioEngine {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  
  public clock: AudioClock = { currentTime: 0, isPlaying: false, playbackRate: 1 };
  
  private startedAt: number = 0;
  private pausedAt: number = 0;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }
  
  async loadAudio(file: Blob | File): Promise<{ duration: number; buffer: AudioBuffer }> {
    if (file.size > 250 * 1024 * 1024) {
      console.warn('Audio file is very large (>250MB decoded equivalent). Performance may be impacted.');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
    }
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    this.clock = { currentTime: 0, isPlaying: false, playbackRate: 1 };
    this.pausedAt = 0;
    this.startedAt = 0;
    
    return { duration: this.audioBuffer.duration, buffer: this.audioBuffer };
  }
  
  play(fromTime?: number): void {
    if (!this.audioBuffer) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        if (this.clock.isPlaying) {
          this.startedAt = this.audioContext.currentTime;
        }
      });
    }
    
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    }
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.value = this.clock.playbackRate;
    this.sourceNode.connect(this.gainNode);
    
    this.sourceNode.onended = () => {
      if (this.clock.isPlaying) {
        const endTime = this.getCurrentTime();
        if (endTime >= this.getDuration() - 0.1) {
            this.stop();
        }
      }
    };
    
    const startTime = fromTime !== undefined ? fromTime : this.pausedAt;
    
    this.sourceNode.start(0, startTime);
    
    this.startedAt = this.audioContext.currentTime;
    this.pausedAt = startTime;
    this.clock.isPlaying = true;
  }
  
  pause(): void {
    if (!this.clock.isPlaying) return;
    
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    this.pausedAt = this.getCurrentTime();
    this.clock.isPlaying = false;
  }
  
  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    this.pausedAt = 0;
    this.clock.isPlaying = false;
    this.clock.currentTime = 0;
  }
  
  seek(time: number): void {
    if (!this.audioBuffer) return;
    
    const targetTime = Math.max(0, Math.min(time, this.getDuration()));
    
    if (this.clock.isPlaying) {
      this.pause();
      this.pausedAt = targetTime;
      this.play();
    } else {
      this.pausedAt = targetTime;
      this.clock.currentTime = targetTime;
    }
  }
  
  setPlaybackRate(rate: PlaybackRate): void {
    this.clock.playbackRate = rate;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = rate;
      const now = this.audioContext.currentTime;
      this.pausedAt = this.getCurrentTime();
      this.startedAt = now;
    }
  }
  
  setVolume(volume: number): void {
    const v = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.value = v;
  }
  
  getCurrentTime(): number {
    if (!this.clock.isPlaying) {
      return this.pausedAt;
    }
    const elapsed = (this.audioContext.currentTime - this.startedAt) * this.clock.playbackRate;
    return this.pausedAt + elapsed;
  }
  
  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }
  
  mapEventToAudioTime(eventTimeStamp: number, tapOffsetMs: number): number {
    if (!this.clock.isPlaying) return this.pausedAt;

    let contextTime = this.audioContext.currentTime;
    let performanceTime = performance.now();
    
    if (typeof this.audioContext.getOutputTimestamp === 'function') {
      const outputTimestamp = this.audioContext.getOutputTimestamp();
      contextTime = outputTimestamp.contextTime ?? contextTime;
      performanceTime = outputTimestamp.performanceTime ?? performanceTime;
    }
    
    const timeSinceEvent = (performanceTime - eventTimeStamp) / 1000;
    const contextTimeAtEvent = contextTime - timeSinceEvent;
    
    const elapsedAtEvent = (contextTimeAtEvent - this.startedAt) * this.clock.playbackRate;
    const audioTimeAtEvent = this.pausedAt + elapsedAtEvent;
    
    const outputLatency = (this.audioContext as any).outputLatency ?? 0;
    
    return Math.max(0, audioTimeAtEvent - outputLatency + (tapOffsetMs / 1000));
  }
  
  calculatePeaks(samplesPerPixel: number): Float32Array {
    if (!this.audioBuffer) return new Float32Array(0);
    
    const channelData = this.audioBuffer.getChannelData(0);
    const numPeaks = Math.ceil(channelData.length / samplesPerPixel);
    const peaks = new Float32Array(numPeaks);
    
    for (let i = 0; i < numPeaks; i++) {
      let max = 0;
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);
      
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      peaks[i] = max;
    }
    
    return peaks;
  }
  
  dispose(): void {
    this.stop();
    this.gainNode.disconnect();
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
