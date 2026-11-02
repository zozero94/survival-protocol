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

/**
 * [SSOT: Single Source of Truth]
 * 생존 교범 5대 핵심 생존 공학 카테고리 정의
 * - FOOD: [물·식량·보존] (수분 확보 및 정수, 식량 수렵·채집, 보존식)
 * - SHELTER: [불·거처·보온] (발화 공학, 은신처/대피소 구축, 축열 화덕)
 * - TOOLS: [도구·의복·공작] (도끼·칼, 끈·로프, 봉제·의복, 뼈·석기)
 * - MATERIALS: [소재·천연화학] (숯 가마, 송진 접착제, 탄닌 가죽)
 * - MEDICINE: [의약·위생·방호] (잿물 비누, 방독 마스크, 야전 부목)
 */
export const PROTOCOL_CATEGORIES = [
  'FOOD',
  'SHELTER',
  'TOOLS',
  'MATERIALS',
  'MEDICINE',
] as const;

export type ProtocolCategory = (typeof PROTOCOL_CATEGORIES)[number];

export const FEED_CATEGORY_KEYS = ['ALL', ...PROTOCOL_CATEGORIES] as const;
export type FeedCategoryKey = (typeof FEED_CATEGORY_KEYS)[number];

export function isProtocolCategory(value: unknown): value is ProtocolCategory {
  return typeof value === 'string' && (PROTOCOL_CATEGORIES as readonly string[]).includes(value);
}

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
