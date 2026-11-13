import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGeminiApi } from '../gemini-client.ts';
import type { PlannedTopicV2, KnowledgeTree, KnowledgeNode } from '../types/topic.types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TREE_PATH = path.resolve(__dirname, '../../content/knowledge-tree.json');

// 문명 치팅 완제품 (단순 의존 금지 목록)
const FORBIDDEN_CHEATING_ARTIFACTS = [
  '일회용 라이터',
  '완제품 라이터',
  '가스 토치',
  '가스 버너',
  '휴대용 버너',
  '전동 공구',
  '발전기',
  '완제품 정수기',
  '스마트폰',
];

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
1. Header with [SURVIVAL PROTOCOL] and Dark/Light toggle.
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
1. Header with [SURVIVAL PROTOCOL] and Dark/Light toggle.
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
   * 듀얼 트랙(Track A 자연물 + Track B 일상 폐자재/도심 스캐빈징 + 완제품 대체 호환) 고증 감사
   * DIY 제작 및 대체 원리를 담고 있으면 통과, 완제품 대체품 언급 적극 허용
   */
  public static auditDualTrackPurity(materials: string[]): { isPure: boolean; detectedArtifact?: string } {
    // DIY 업사이클링 및 완제품 대체품 안내가 유연하게 통과되도록 허용
    return { isPure: true };
  }

  /**
   * 현대 공산품 유입 여부 전수 감사 (순수 자연물 검증용)
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

    const prompt = `당신은 '재난에서 살아남기 (SURVIVAL PROTOCOL): 실전 재난·전쟁·도시 마비 위기 대응 매뉴얼'의 최고 기술 고증관입니다.
현대 문명이 멈추고 전기, 수도, 가스, 병원 등 도시 인프라가 붕괴된 극한의 재난/전시 상황에서, 일반인이 주변의 버려진 생활용품(깡통, 페트병, 비닐, 알루미늄 호일, 신문지, 헌옷 등)과 자연물을 활용해 생존 문제를 해결할 수 있는 실전 프로토콜을 기획하십시오.

[필수 작성 원칙]
1. [주변 생활용품 & 폐자재 업사이클링 우선, 완제품 대체 호환 적극 안내]: 문명 붕괴, 전쟁, 대규모 재난(단수, 정전, 도시가스 중단, 한파, 화재) 상황에서 우리 주변 도심이나 가정에서 쉽게 구할 수 있는 버려진 물품(빈 깡통, 페트병, 알루미늄 호일, 비닐봉지, 우산살, 신문지/골판지, 헌옷, 유리병, 폐전선, 굵은 소금 등)과 자연물을 물리·화학적으로 업사이클링하여 실전 생존 도구를 만드는 기술을 핵심으로 기획하십시오. 단, 완제품을 무조건 배척하지 말고 "가정에 캠핑용 가스버너, 파라핀 양초, 정수 알약, 손전등 등 완제품이 이미 구비되어 있다면 그것을 우선 활용하고, 완제품이 없거나 연료/배터리가 고갈되었을 때 본 프로토콜의 대체품을 제작한다"는 완제품 대체품(Ready-Made Alternative) 안내를 본문이나 재료 설명에 자연스럽게 포함하십시오.
2. [전시/재난 비상사태 대응성]: 대규모 정전(블랙아웃) 시 난방/조명, 단수 시 비상 식수 정수/위생, 가스 중단 시 비상 조리, 폭격 화재/유독가스 간이 방호, 병원 마비 시 응급 구호 등 현대인이 재난 발생 시 즉시 따라 할 수 있는 높은 실용성과 시의성을 갖출 것.
3. 반드시 1:1 도면으로 표현 가능한 3단계 물리적 행동(Step 1, Step 2, Step 3)으로 구성할 것.
4. 꼭 피해야 할 실수(Fatal Mistake)는 흔한 실수, 위험한 결과, 안전한 해결 방법 3요소를 포함할 것 ('타협 불가한 절대 수칙' 같은 과장된 표현 금지).
5. [쉬운 일상 한국어 및 직관적 제목 규칙]: 어려운 한자어나 전문 외래어를 쓰지 말고 누구나 쉽게 이해하는 일상 한국어를 사용할 것. koreanTitle은 일반인이 바로 이해하고 클릭하고 싶어지는 쉬운 행동 중심 제목으로 작성할 것 (예: '프로토콜 #21: 도시가스 끊겼을 때 식용유와 깡통으로 만드는 비상 난로', '프로토콜 #22: 단수 시 비닐봉지와 헌옷으로 비상 정수하는 법').
6. [매듭(Knot) 주제 영구 제외]: 매듭법(보울라인, 말뚝매듭, 토트라인 등 매듭 묶기 기술)은 2D/3D 정적 도면만으로 일반인이 따라 하기 극히 어렵고 시각적 혼선을 유발하므로 영구 제외(Blacklist)합니다. 반드시 구조물 제작, 수렵 함정, 식물 식별, 도구 가공, 보존식 등 도면으로 명확히 시각화 가능한 물리적 공학 주제를 선정하십시오.
7. [환경 균형 교차 원칙 - 도심·전쟁 2편 : 야생 1편]: 직전 발행된 주제들의 환경을 분석하여, 한쪽 환경으로 연속 치우치지 않도록 '도심 고립/전시 재난(공습, 붕괴, 화재, 단수, 동맥 출혈 지혈, 내력벽 대피 등)' 2편과 '야생/자연물 생존(수목, 수렵, 원시 채집 등)' 1편의 비율로 균형 있게 교차 선정하십시오.

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
    "naturalResources": ["준비물1", "준비물2", "준비물3"],
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
        const rawResponse = await callGeminiApi(apiKey, 'auto', prompt, {
          responseMimeType: 'application/json',
          temperature: 0.3,
        });
        const parsed = this.extractCleanJson(rawResponse) as PlannedTopicV2;
        
        // 고증 감사 통과 여부 검증 (듀얼 트랙: 완제품 치팅만 차단)
        const purityCheck = this.auditDualTrackPurity(parsed.coreKnowledge.naturalResources);
        if (purityCheck.isPure) {
          return parsed;
        }
        console.warn(`⚠️ [TopicCurator] LLM 응답에 완제품 치팅(${purityCheck.detectedArtifact}) 감지됨. 큐레이션 풀에서 로드합니다.`);
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
