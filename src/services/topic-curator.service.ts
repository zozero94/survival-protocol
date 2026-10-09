import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGeminiApi } from '../gemini-client.ts';
import type { PlannedTopicV2, KnowledgeTree, KnowledgeNode } from '../types/topic.types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TREE_PATH = path.resolve(__dirname, '../../content/knowledge-tree.json');

const FORBIDDEN_MODERN_ARTIFACTS = [
  '라이터',
  '라이타',
  '플라스틱',
  '페트병',
  '건전지',
  '배터리',
  '알루미늄',
  '캔',
  '나일론',
  '비닐',
  '철사',
  '스테인리스',
  '유리병',
  '고무줄',
  '합성섬유',
  '접착테이프',
  '테이프',
];

const CURATED_FALLBACK_TOPICS: PlannedTopicV2[] = [
  {
    protocolId: 'PR-02',
    domain: '열 & 발화 공학',
    branch: '마찰열 고속 회전 발화법',
    tier: 1,
    koreanTitle: '프로토콜 #02: 나무로 불 지피는 방법 (원시 활비비 발화법)',
    threatOrUrgency: 'CRITICAL',
    coreKnowledge: {
      problemContext: '저체온증으로 인한 3시간 이내 심정지 및 생존 정화수 가열을 위한 고온 열원 부재',
      naturalResources: [
        '건조된 참나무 밑받침 판 (Hearth Board)',
        '직경 2cm 곧은 활비비 회전축 (Spindle)',
        '자연 굽은 가지와 덩굴 활줄 (Bow with Cordage)',
        '새 둥지 형태의 마른 부싯깃 뭉치 (Tinder Nest)',
      ],
      scientificPrinciple: '목재 간 고속 회전 마찰력을 통해 탄화 목재 분말의 발화점(350~400℃)에 도달시켜 훈연 불씨(Ember) 형성',
    },
    steps: [
      {
        stepNumber: '01',
        title: '밑받침 판 45도 V자 홈 절삭 및 마찰면 형성',
        actionDescription: '단단한 부싯돌 조각으로 밑받침 판 가장자리에 45도 각도의 V자 홈을 파내어 고온 탄화 분말이 모일 집열 공간을 만듭니다.',
        drawingSubject: '밑받침 판에 45도 각도로 정확히 파인 V자 홈과 회전축 접점 단면도',
      },
      {
        stepNumber: '02',
        title: '활줄 1회 권선 및 수직 하향 고속 왕복 회전',
        actionDescription: '활줄에 회전축을 1회 감고, 돌 소켓으로 축 상단을 강하게 누르며 지면과 수직을 유지한 채 일정한 속도로 활을 왕복 운동시킵니다.',
        drawingSubject: '손바닥 소켓으로 축을 누르며 수평으로 활을 왕복 운동하는 전신 자세 투시도',
      },
      {
        stepNumber: '03',
        title: '연기 나는 흑색 불씨(Ember)를 부싯깃 둥지에 이식 및 불꽃 유도',
        actionDescription: '홈에 모인 검은 가루에서 연기가 피어오르면 칼날로 살며시 부싯깃 뭉치 중앙에 털어 넣고, 공기 중에 부드럽게 원을 그리며 산소를 공급해 불꽃을 피웁니다.',
        drawingSubject: '새 둥지 부싯깃에 감싸인 훈연 불씨를 양손으로 쥐고 공기 중에 불꽃을 일으키는 순간',
      },
    ],
    fatalMistake: {
      trap: '연기가 나자마자 기쁜 마음에 입으로 강하게 입김을 분다.',
      consequence: '입김 속 수분과 강한 기류로 모처럼 형성된 미세 탄화 불씨가 식어 꺼지고, 체력 고갈로 저체온증 사망 초래',
      rule: '연기가 난 뒤에도 30초간 안정화시키고, 반드시 부싯깃 둥지에 싸서 부드러운 산소 흐름으로 유도할 것',
    },
    stitchMasterPrompt: `[DESIGN PHILOSOPHY: Strict Minimalist Brutalism, Pure Black & White #000000 and #FFFFFF, 1px crisp borders, sharp corners, monospace stamps]
Create an ultra-readable responsive survival manual screen for 'PROTOCOL #02: Bow Drill Primitive Fire Ignition'.
Sections:
1. Header with [ARCHIVE-0] and Dark/Light toggle.
2. Hero hook with [THREAT: CRITICAL].
3. Checklist for 4 natural items: Dry hardwood hearth board, Carved spindle, Bow branch with cordage, Tinder nest.
4. 3-step vertical action cards with 1:1 technical line-art sketch containers:
   - Step 01: Carving the 45-degree V-notch on hearth board
   - Step 02: High-friction downward drilling with hand socket
   - Step 03: Transferring smoking ember into tinder nest and waving to flame
5. Bold inverted Fatal Mistake warning card ('FATAL: Blowing directly on fresh ember will kill it with moisture').
6. Sticky bottom bar for Save and Share.`,
  },
  {
    protocolId: 'PR-03',
    domain: '야전 의약 & 생체 위생',
    branch: '천연 살리실산 추출 및 송진 항균 연고',
    tier: 1,
    koreanTitle: '프로토콜 #03: 소나무 송진으로 상처 치료하는 방법 (천연 지혈 연고)',
    threatOrUrgency: 'HIGH',
    coreKnowledge: {
      problemContext: '열상 및 자상 환부의 급성 세균 감염과 패혈증, 야전 지혈 멸균 처치제 부재',
      naturalResources: [
        '흘러내린 소나무 생송진 (Pine Resin)',
        '모닥불 멸균 미세 숯가루 (Powdered Charcoal)',
        '깨끗한 조개껍데기 또는 평평한 가열 점토판',
        '삶아서 건조한 면포 또는 박피한 자작나무 속껍질',
      ],
      scientificPrinciple: '송진의 강력한 테르펜계 항균 및 수분 차단 피막 형성 능력과 활성 숯의 독소 흡착력을 결합하여 혐기성 균 침투 차단',
    },
    steps: [
      {
        stepNumber: '01',
        title: '생송진 채취 및 약한 불가 열탕 용융 정제',
        actionDescription: '소나무 수피의 송진 덩어리를 채취하여 조개껍데기에 담고, 모닥불 주변의 잔열로 서서히 녹여 나무껍질 부유물을 걸러냅니다.',
        drawingSubject: '조개껍데기 안에서 맑게 녹아내리는 송진과 나뭇가지 거름망',
      },
      {
        stepNumber: '02',
        title: '멸균 숯가루 1:1 혼합 및 흑색 연고 페이스트 반죽',
        actionDescription: '녹은 송진에 미세하게 빻은 숯가루를 1:1 비율로 조금씩 투입하며 나무 주걱으로 빠르게 저어 점성 있는 흑색 연고로 만듭니다.',
        drawingSubject: '송진 용액에 미세 숯가루를 섞어 흑색 페이스트를 반죽하는 단면도',
      },
      {
        stepNumber: '03',
        title: '출혈 환부 직접 도포 및 껍질 붕대 완전 밀폐 드레싱',
        actionDescription: '피가 멎지 않는 상처 부위에 식힌 연고를 두껍게 바르고, 얇게 저민 자작나무 속껍질로 환부를 덮어 외부 오염물질을 완벽히 차단합니다.',
        drawingSubject: '상처 부위에 도포된 흑색 연고와 자작나무 껍질 붕대 밀착 체결도',
      },
    ],
    fatalMistake: {
      trap: '불순물과 흙이 묻은 생송진을 가열 정제 없이 상처에 그대로 바른다.',
      consequence: '송진 속 이물질과 혐기성 세균이 피부 피하층에 갇혀 급성 봉와직염과 패혈증을 유발',
      rule: '반드시 열로 완전히 녹여 이물질을 걸러내고, 멸균 숯가루와 균일하게 혼합한 뒤 식혀 도포할 것',
    },
    stitchMasterPrompt: `[DESIGN PHILOSOPHY: Strict Minimalist Brutalism, Pure Black & White #000000 and #FFFFFF, 1px crisp borders, sharp corners, monospace stamps]
Create an ultra-readable responsive survival manual screen for 'PROTOCOL #03: Pine Resin Antiseptic Black Salve'.
Sections:
1. Header with [ARCHIVE-0] and Dark/Light toggle.
2. Hero hook with [THREAT: HIGH].
3. Checklist for natural items: Pine resin, Powdered charcoal, Clam shell melting dish, Birch bark wrap.
4. 3-step vertical action cards with 1:1 technical line-art sketch containers:
   - Step 01: Slow melting and straining raw resin over shell
   - Step 02: 1:1 blending of resin and sterile charcoal powder
   - Step 03: Direct application on wound with birch bark hermetic seal
5. Bold inverted Fatal Mistake warning card ('FATAL: Applying raw dirty resin traps pathogens causing sepsis').
6. Sticky bottom bar for Save and Share.`,
  },
];

/**
 * [Topic Curator Service]
 * 자율 성장형 지식 트리 기반 주제 자동 발굴, 고증 감사 및 정규화 엔진
 */
export class TopicCuratorService {
  /**
   * 현대 공산품 유입 여부 전수 감사
   */
  public static auditNaturalPurity(materials: string[]): { isPure: boolean; detectedArtifact?: string } {
    for (const mat of materials) {
      for (const forbidden of FORBIDDEN_MODERN_ARTIFACTS) {
        if (mat.toLowerCase().includes(forbidden.toLowerCase())) {
          return { isPure: false, detectedArtifact: forbidden };
        }
      }
    }
    return { isPure: true };
  }

  /**
   * 마크다운 코드블록이나 불필요한 텍스트가 섞인 LLM 응답에서 순수 JSON을 안전하게 추출
   */
  public static extractCleanJson(rawText: string): any {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('LLM 응답 텍스트가 비어 있습니다.');
    }

    let cleaned = rawText.trim();
    // 마크다운 백틱 코드블록 제거
    if (cleaned.includes('```')) {
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        cleaned = match[1].trim();
      }
    }

    // 앞뒤에 붙은 잡담 텍스트 제거 (첫 번째 { 부터 마지막 } 까지)
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleaned);
  }

  /**
   * 지식 트리 파일 로드
   */
  public static loadKnowledgeTree(treePath: string = DEFAULT_TREE_PATH): KnowledgeTree {
    if (fs.existsSync(treePath)) {
      return JSON.parse(fs.readFileSync(treePath, 'utf-8'));
    }
    return {
      totalProtocols: 0,
      lastUpdated: new Date().toISOString(),
      domains: {},
      protocols: [],
    };
  }

  /**
   * 지식 트리 파일 저장
   */
  public static saveKnowledgeTree(tree: KnowledgeTree, treePath: string = DEFAULT_TREE_PATH): void {
    fs.mkdirSync(path.dirname(treePath), { recursive: true });
    tree.lastUpdated = new Date().toISOString();
    tree.totalProtocols = tree.protocols.length;
    fs.writeFileSync(treePath, JSON.stringify(tree, null, 2), 'utf-8');
  }

  /**
   * 지식 맵을 스캔하고 자율적으로 다음 프론티어 주제 기획안 도출
   */
  public static async planNextTopic(
    apiKey?: string,
    treePath: string = DEFAULT_TREE_PATH
  ): Promise<PlannedTopicV2> {
    const tree = this.loadKnowledgeTree(treePath);
    const existingTitles = tree.protocols.map((p) => p.title);
    const coveredDomains = Object.values(tree.domains).map((d) => `${d.name} (${d.branches.join(', ')})`);

    const prompt = `당신은 '아카이브-0: 인류 멸망 후 원시 생존 및 문명 재건 매뉴얼'의 최고 기술 고증관입니다.
현대 문명이 붕괴되고 도구가 전무한 자연 상태에서, 사전에 이 프로토콜을 완벽히 숙지하고 두 손과 현장의 자연물만으로 생존 및 재건을 실행하는 사용자를 위한 다음 생존 프로토콜을 기획하십시오.

[절대 불변 원칙]
1. 현대 인공물(라이터, 플라스틱, 배터리, 캔 등)은 단 0.1%도 일체 언급하지 말 것. 오직 돌, 흙, 나무, 식물, 뼈, 물, 불만 사용.
2. 반드시 1:1 도면으로 표현 가능한 3단계 물리적 행동(Step 1, Step 2, Step 3)으로 구성할 것.
3. 치명적 실수(Fatal Mistake)는 흔한 착각, 파국적 결과, 절대 수칙 3요소를 포함할 것.
4. [직관적 제목 규칙]: koreanTitle은 딱딱한 학술/군사 용어를 피하고, 일반인이 '어? 이게 된다고?' 하며 즉시 클릭하고 싶어지는 직관적이고 흥미진진한 행동 중심 제목으로 작성할 것 (예: '프로토콜 #01: 오염된 물 마시는 방법 (야생 숯 여과)', '프로토콜 #02: 나무로 불 지피는 방법 (원시 활비비)', '프로토콜 #03: 소나무 송진으로 상처 치료하는 방법 (천연 연고)').

[현재까지 발행된 문명 지식 맵]
- 발행된 주제들:
${existingTitles.map((t) => `  * ${t}`).join('\n')}
- 다룬 도메인 현황:
${coveredDomains.map((d) => `  * ${d}`).join('\n')}

위 지식 맵과 겹치지 않으면서, 현재 생존 단계에서 가장 시급하거나 연계되는 '새로운 프론티어 분과' 또는 '기존 분과의 심화 기술' 1개를 기획하여 반드시 다음 JSON 형식으로만 응답하세요:
{
  "protocolId": "PR-0${tree.protocols.length + 1}",
  "domain": "대분류명",
  "branch": "세부 분과명",
  "tier": 1,
  "koreanTitle": "프로토콜 #0X: ...",
  "threatOrUrgency": "CRITICAL",
  "coreKnowledge": {
    "problemContext": "...",
    "naturalResources": ["자연물1", "자연물2", "자연물3"],
    "scientificPrinciple": "..."
  },
  "steps": [
    { "stepNumber": "01", "title": "...", "actionDescription": "...", "drawingSubject": "..." },
    { "stepNumber": "02", "title": "...", "actionDescription": "...", "drawingSubject": "..." },
    { "stepNumber": "03", "title": "...", "actionDescription": "...", "drawingSubject": "..." }
  ],
  "fatalMistake": {
    "trap": "...",
    "consequence": "...",
    "rule": "..."
  },
  "stitchMasterPrompt": "..."
}`;

    if (apiKey) {
      try {
        const rawResponse = await callGeminiApi(apiKey, 'gemini-3.8-flash', prompt, {
          responseMimeType: 'application/json',
          temperature: 0.3,
        });
        const parsed = this.extractCleanJson(rawResponse) as PlannedTopicV2;
        
        // 고증 감사 통과 여부 검증
        const purityCheck = this.auditNaturalPurity(parsed.coreKnowledge.naturalResources);
        if (purityCheck.isPure) {
          return parsed;
        }
        console.warn(`⚠️ [TopicCurator] LLM 응답에 비자연물(${purityCheck.detectedArtifact}) 감지됨. 큐레이션 풀에서 로드합니다.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`ℹ️ [TopicCurator] API 연동 실패 (${msg}). 큐레이션 풀에서 차기 프로토콜을 로드합니다.`);
      }
    }

    // Fallback: 큐레이션 풀에서 기존 트리와 중복되지 않는 것 선별
    const fallback = CURATED_FALLBACK_TOPICS.find(
      (f) => !existingTitles.some((t) => t.includes(f.koreanTitle) || f.koreanTitle.includes(t))
    ) || CURATED_FALLBACK_TOPICS[0];

    return fallback;
  }

  /**
   * 새롭게 채택된 프로토콜을 지식 트리에 영구 등록
   */
  public static registerTopicToTree(topic: PlannedTopicV2, treePath: string = DEFAULT_TREE_PATH): KnowledgeTree {
    const tree = this.loadKnowledgeTree(treePath);
    
    // 이미 존재하는지 확인
    const exists = tree.protocols.some((p) => p.protocolId === topic.protocolId);
    if (!exists) {
      const newNode: KnowledgeNode = {
        protocolId: topic.protocolId,
        title: topic.koreanTitle,
        domain: topic.domain,
        branch: topic.branch,
        tier: topic.tier,
        naturalResources: topic.coreKnowledge.naturalResources,
        createdAt: new Date().toISOString(),
      };

      tree.protocols.push(newNode);

      // 도메인 분류 맵 갱신
      const domainKey = topic.domain.replace(/\s+/g, '_');
      if (!tree.domains[domainKey]) {
        tree.domains[domainKey] = {
          name: topic.domain,
          branches: [],
          protocolIds: [],
        };
      }
      if (!tree.domains[domainKey].branches.includes(topic.branch)) {
        tree.domains[domainKey].branches.push(topic.branch);
      }
      if (!tree.domains[domainKey].protocolIds.includes(topic.protocolId)) {
        tree.domains[domainKey].protocolIds.push(topic.protocolId);
      }

      this.saveKnowledgeTree(tree, treePath);
    }

    return tree;
  }
}
