export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface Material {
  id: string;
  name: string;
  desc: string;
  isGathered?: boolean;
}

export interface FieldTrait {
  label: string;
  value: string;
}

export interface FieldIdentificationSpec {
  name: string;
  scientificName?: string;
  categoryTag?: string;
  imageFileName: string;
  hudCode?: string;
  hudStatus?: string;
  traits: FieldTrait[];
  fieldUse?: string;
}

export interface StepDeepDive {
  badge?: string;
  title: string;
  text: string;
  fieldSpecs?: FieldIdentificationSpec[];
}

export interface ProtocolStep {
  stepNumber: string;
  title: string;
  description: string;
  actionNote: string;
  svgFileName?: string;
  svgCode?: string;
  svgLabels?: string[];
  imageFileName?: string;
  deepDive?: StepDeepDive;
}

export interface ProtocolOutcome {
  title: string;
  description: string;
  svgFileName?: string;
  svgCode?: string;
  svgLabels?: string[];
  imageFileName?: string;
}

export interface FatalMistake {
  title: string;
  description: string;
  consequence: string;
}

export type ProtocolCategory = 'FOOD' | 'SHELTER' | 'TOOLS' | 'MATERIALS' | 'MEDICINE' | 'WATER' | 'FIRE';

export interface ProtocolFaqItem {
  question: string;
  causeDiagnostic: string;
  resolution: string;
}

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
  outcome?: ProtocolOutcome;
  materials: Material[];
  steps: ProtocolStep[];
  fatalMistake: FatalMistake;
  faqs?: ProtocolFaqItem[];
  nextProtocolTitle?: string;
  createdAt?: string;
  updatedAt?: string;
  contentHash?: string;
  shortsScript?: { hook: string; body: string; outro?: string };
}
