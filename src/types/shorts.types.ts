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
  flowPrompt?: string;
}

export interface ShortsStoryboard {
  protocolId: string;
  title: string;
  totalDurationSeconds: number;
  aspectRatio: '9:16';
  scenes: ShortsScene[];
}

export interface GoogleFlowPromptItem {
  sceneNumber: number;
  startSecond: number;
  endSecond: number;
  durationSeconds: number;
  screenType: ShortsScreenType;
  flowPrompt: string;
  referencePlate: string;
}

export interface GoogleFlowPackage {
  protocolId: string;
  title: string;
  aspectRatio: '9:16';
  totalDurationSeconds: number;
  scenes: GoogleFlowPromptItem[];
}
