export type ShortsScreenType = 
  | 'HOOK' 
  | 'CHECKLIST' 
  | 'STEP_1' 
  | 'STEP_2' 
  | 'STEP_3' 
  | 'FATAL_WARNING' 
  | 'OUTRO';

export interface ShortsScene {
  sceneNumber: number;
  startSecond: number;
  endSecond: number;
  screenType: ShortsScreenType;
  visualAsset: string;
  caption: string;
  voiceoverScript: string;
  motionDirection: string;
}

export interface ShortsStoryboard {
  protocolId: string;
  title: string;
  totalDurationSeconds: number;
  aspectRatio: '9:16';
  scenes: ShortsScene[];
}
