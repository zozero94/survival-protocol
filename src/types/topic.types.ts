/**
 * [Topic Domain Types]
 * 자율 성장형 지식 트리 및 프로토콜 기획 명세서 타입 정의
 */

export interface TopicStep {
  stepNumber: '01' | '02' | '03';
  title: string;
  actionDescription: string;
  drawingSubject: string;
}

export interface FatalMistakeSpec {
  trap: string;        // 흔한 착각 (예: 연기가 나자마자 입으로 세게 분다)
  consequence: string; // 파국적 결과 (예: 산소 부족과 침으로 불씨가 꺼지고 저체온증 사망)
  rule: string;        // 타협 불가 절대 수칙 (예: 부싯깃 둥지에 감싸 부드럽게 스윙)
}

export interface PlannedTopicV2 {
  protocolId: string;
  domain: string;                  // 대분류 (예: 열 & 발화 공학)
  branch: string;                  // 세부 분과 (예: 마찰열 고속 회전 발화)
  tier: 1 | 2 | 3 | 4 | 5;         // 문명 발전 단계 (1: 급성생존 ~ 5: 영구자립)
  koreanTitle: string;             // 프로토콜 제목
  threatOrUrgency: 'CRITICAL' | 'HIGH' | 'MODERATE';
  
  coreKnowledge: {
    problemContext: string;        // 직면한 결핍 상황
    naturalResources: string[];    // 100% 현장 자연물
    scientificPrinciple: string;   // 과학/물리적 원리
  };

  steps: [TopicStep, TopicStep, TopicStep];
  fatalMistake: FatalMistakeSpec;
  stitchMasterPrompt: string;      // 스티치 1:1 도면 생성용 영문 프롬프트
}

export interface KnowledgeNode {
  protocolId: string;
  title: string;
  domain: string;
  branch: string;
  tier: number;
  naturalResources: string[];
  createdAt: string;
}

export interface KnowledgeTree {
  totalProtocols: number;
  lastUpdated: string;
  domains: Record<string, {
    name: string;
    branches: string[];
    protocolIds: string[];
  }>;
  protocols: KnowledgeNode[];
}
