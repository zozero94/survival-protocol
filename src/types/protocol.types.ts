export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface Material {
  id: string;
  name: string;
  desc: string;
  isGathered?: boolean;
}

export interface ProtocolStep {
  stepNumber: string;
  title: string;
  description: string;
  actionNote: string;
  svgFileName: string;
  svgCode?: string;
}

export interface FatalMistake {
  title: string;
  description: string;
  consequence: string;
}

export type ProtocolCategory = 'FIRE' | 'WATER' | 'TOOLS' | 'SHELTER' | 'FOOD' | 'MEDICINE';

export interface Protocol {
  protocolId: string;
  category: ProtocolCategory;
  title: string;
  iconSvg?: string;

  threatLevel: ThreatLevel;
  threatLevelText: string;
  summary: string;
  timeRequired: string;
  successRate: string;
  difficulty: string;
  outputPerHour?: string;
  materials: Material[];
  steps: ProtocolStep[];
  fatalMistake: FatalMistake;
}
