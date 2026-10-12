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
  trap: string;        // 흔한 실수 (예: 연기가 나자마자 입으로 세게 분다)
  consequence: string; // 위험한 결과 (예: 산소 부족과 침으로 불씨가 꺼지고 체온이 떨어짐)
  rule: string;        // 안전한 해결 방법 (예: 마른 풀 둥지에 감싸 살살 흔들어 바람 주기)
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
