export type PlaybackState = 'stopped' | 'playing' | 'paused';
export type PlaybackRate = 0.75 | 1 | 1.25;

export interface AudioEngineState {
  playbackState: PlaybackState;
  duration: number;
  playbackRate: PlaybackRate;
  isLoaded: boolean;
}

export interface AudioClock {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
}
