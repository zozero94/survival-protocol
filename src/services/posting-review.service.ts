import type { Protocol } from '../types/protocol.types.ts';
import { SeoService } from './seo.service.ts';

export interface ReviewPillarResult {
  pillar:
    | 'SAFETY_RED_TEAM'
    | 'FIELD_REPRODUCIBILITY'
    | 'SEO_SEARCH_INTENT'
    | 'GLOBAL_ECO_LOCALIZATION'
    | 'LEGAL_GOOGLE_POLICY';
  passed: boolean;
  score: number;
  checks: string[];
  warnings: string[];
}

export interface PostingReviewReport {
  protocolId: string;
  passed: boolean;
  totalScore: number;
  pillars: {
    safetyRedTeam: ReviewPillarResult;
    fieldReproducibility: ReviewPillarResult;
    seoSearchIntent: ReviewPillarResult;
    globalEcoLocalization: ReviewPillarResult;
    legalGooglePolicy: ReviewPillarResult;
  };
  summaryFeedback: string[];
}

/**
 * [Domain Service]
 * 포스팅 5대 심층 감수 엔진 (PostingReviewService)
 * 1. 🚨 야전 안전 & 오남용 방지 심사 (Safety & Red-Team Review)
 * 2. 📏 야전 무도구 계량 현실성 검증 (Field Reproducibility Audit)
 * 3. 🔍 구글 검색엔진(E-E-A-T) & 검색 의도 적합성 검수 (SEO & Search Intent Audit)
 * 4. 🌍 글로벌 생태계 & 다국어 대응 현지화 검수 (Global Eco-Localization Audit)
 * 5. ⚖️ 법무 리스크 & Google Publisher/AdSense 정책 준수 (Legal & Google Policy Audit)
 */
export class PostingReviewService {
  // 야전에서 사용 불가능한 현대 정밀 계측기 금지어
  public static readonly BANNED_MEASURING_TOOLS = [
    /전자\s*저울/g,
    /디지털\s*온도계/g,
    /적외선\s*온도계/g,
    /타이머를\s*맞추/g,
    /스톱워치/g,
    /계량\s*스푼/g,
    /계량컵/g,
    /줄자로\s*재/g,
    /버니어\s*캘리퍼스/g,
  ];

  // 신체 척도 및 자연물 비교 척도 어휘
  public static readonly BODY_AND_NATURAL_SCALES = [
    '손뼘', '한 뼘', '두 뼘', '뼘',
    '손가락', '엄지', '검지', '중지', '새끼손가락', '손마디', '마디',
    '주먹', '손바닥', '손등', '손톱', '손목', '팔뚝', '무릎', '발목',
    '걸음', '보폭', '자갈', '모래알', '솔잎', '콩알', '밤알', '계란', '달걀',
  ];

  // 오감 기반 성공 판정 어휘 (시각, 촉각, 청각, 후각, 열감)
  public static readonly SENSORY_MILESTONES = [
    '색', '빛깔', '투명', '맑은', '연기', '불꽃', '거품', '윤기', '광택',
    '소리', '딱', '바삭', '틱', '쉬익',
    '만졌을 때', '눌렀을 때', '손끝', '단단', '끈적', '말랑', '축축', '바짝',
    '열기', '온기', '뜨거', '식어', '차갑', '냄새', '향',
  ];

  /**
   * 1. 🚨 야전 안전 & 오남용 방지 심사 (Safety & Red-Team Review)
   */
  public static auditSafetyRedTeam(protocol: Protocol): ReviewPillarResult {
    const checks: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const fm = protocol.fatalMistake;
    if (!fm || !fm.title || !fm.description || !fm.consequence) {
      score -= 50;
      warnings.push('fatalMistake 3요소(title, description, consequence) 중 누락된 항목이 있습니다.');
    } else {
      if (fm.title.trim().length >= 8) {
        checks.push('치명적 실수 경고 제목(fatalMistake.title) 구체적 명시 완료');
      } else {
        score -= 15;
        warnings.push('fatalMistake.title이 너무 짧습니다.');
      }

      if (fm.description.trim().length >= 15) {
        checks.push('실수 원인 및 안전 대처 수칙(fatalMistake.description) 구체적 제시 완료');
      } else {
        score -= 15;
        warnings.push('fatalMistake.description 설명이 너무 짧습니다.');
      }

      if (fm.consequence.trim().length >= 5) {
        checks.push('치명적 결과 요약(fatalMistake.consequence) 명시 완료');
      } else {
        score -= 15;
        warnings.push('fatalMistake.consequence가 너무 짧습니다.');
      }
    }

    const stepsWithActionNote = protocol.steps.filter((s) => s.actionNote && s.actionNote.trim().length >= 10);
    if (stepsWithActionNote.length === protocol.steps.length) {
      checks.push(`전 스텝(${protocol.steps.length}/${protocol.steps.length}) 야전 주의사항(actionNote) 100% 구비`);
    } else {
      score -= 20;
      warnings.push(`일부 스텝에 actionNote가 누락되었거나 너무 짧습니다 (${stepsWithActionNote.length}/${protocol.steps.length}).`);
    }

    return {
      pillar: 'SAFETY_RED_TEAM',
      passed: score >= 80 && warnings.length === 0,
      score: Math.max(0, score),
      checks,
      warnings,
    };
  }

  /**
   * 2. 📏 야전 100% 무도구 계량 현실성 검증 (Field Reproducibility Audit)
   */
  public static auditFieldReproducibility(protocol: Protocol): ReviewPillarResult {
    const checks: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const fullText = [
      protocol.summary,
      ...protocol.materials.map((m) => `${m.name} ${m.desc}`),
      ...protocol.steps.map((s) => `${s.description} ${s.actionNote}`),
      protocol.outcome?.description || '',
    ].join(' ');

    for (const pattern of this.BANNED_MEASURING_TOOLS) {
      const matched = fullText.match(pattern);
      if (matched) {
        score -= 30;
        warnings.push(`현대 정밀 계량 도구 표현 감지: "${matched[0]}" (신체 척도나 오감 기준으로 대체 필요)`);
      }
    }

    const foundBodyScales = this.BODY_AND_NATURAL_SCALES.filter((term) => fullText.includes(term));
    if (foundBodyScales.length >= 1) {
      checks.push(`무도구 신체/자연물 척도 활용 확인 (${foundBodyScales.slice(0, 4).join(', ')})`);
    } else {
      score -= 15;
      warnings.push('손뼘, 손가락 굵기, 주먹 크기 등 무도구 신체/자연 척도 표현을 최소 1개 이상 병기하세요.');
    }

    const foundSensory = this.SENSORY_MILESTONES.filter((term) => fullText.includes(term));
    if (foundSensory.length >= 2) {
      checks.push(`오감 기반 현장 성공 판정 기준 확인 (${foundSensory.slice(0, 5).join(', ')})`);
    } else {
      score -= 15;
      warnings.push('색상, 소리, 촉감, 열기 등 오감 기반 성공 판정 기준이 부족합니다.');
    }

    return {
      pillar: 'FIELD_REPRODUCIBILITY',
      passed: score >= 80,
      score: Math.max(0, score),
      checks,
      warnings,
    };
  }

  /**
   * 3. 🔍 구글 검색엔진(E-E-A-T) & 검색 의도 적합성 검수 (SEO & Search Intent Audit)
   */
  public static auditSeoSearchIntent(protocol: Protocol): ReviewPillarResult {
    const checks: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    if (protocol.title && protocol.title.trim().length >= 10 && protocol.title.trim().length <= 65) {
      checks.push(`검색 최적화 제목 길이 적정 (${protocol.title.trim().length}자)`);
    } else {
      score -= 15;
      warnings.push(`제목 길이가 너무 짧거나 깁니다 (${protocol.title?.length || 0}자, 권장 10~65자).`);
    }

    if (protocol.summary && protocol.summary.trim().length >= 30) {
      checks.push(`메타 디스크립션/요약문(summary) 분량 충분 (${protocol.summary.trim().length}자)`);
    } else {
      score -= 15;
      warnings.push('요약문(summary)이 너무 짧아 검색 스니펫 품질이 저하될 수 있습니다.');
    }

    try {
      const jsonLdRaw = SeoService.generateJsonLd(protocol);
      const parsed = JSON.parse(jsonLdRaw);

      if (parsed && parsed['@type'] === 'HowTo' && Array.isArray(parsed.step) && parsed.step.length === protocol.steps.length) {
        checks.push(`Schema.org HowTo 구조화 데이터 스텝 1:1 정합성 확인 (${parsed.step.length}단계)`);
      } else {
        score -= 25;
        warnings.push('HowTo 구조화 데이터와 본문 스텝 수가 일치하지 않습니다.');
      }

      if (parsed && Array.isArray(parsed.supply) && parsed.supply.length === protocol.materials.length) {
        checks.push(`Schema.org HowTo 준비 재료(supply) 1:1 정합성 확인 (${parsed.supply.length}종)`);
      } else {
        score -= 15;
        warnings.push('HowTo 구조화 데이터의 재료 수량이 일치하지 않습니다.');
      }
    } catch (err) {
      score -= 40;
      warnings.push(`Schema.org JSON-LD 파싱 실패: ${(err as Error).message}`);
    }

    return {
      pillar: 'SEO_SEARCH_INTENT',
      passed: score >= 80 && warnings.length === 0,
      score: Math.max(0, score),
      checks,
      warnings,
    };
  }

  /**
   * 4. 🌍 글로벌 생태계 대응 현지화 검수 (Global Eco-Localization Audit)
   */
  public static auditGlobalEcoLocalization(
    masterProtocol: Protocol,
    localizedVariants: Record<string, Protocol> = {}
  ): ReviewPillarResult {
    const checks: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const targetLocales = ['en', 'ja', 'es', 'de', 'pt', 'zh-TW'];
    const providedLocales = Object.keys(localizedVariants);

    if (providedLocales.length === 0) {
      checks.push('마스터 프로토콜 단독 검수 모드 (번역본 파라미터 미전달)');
      return {
        pillar: 'GLOBAL_ECO_LOCALIZATION',
        passed: true,
        score: 100,
        checks,
        warnings,
      };
    }

    for (const lang of targetLocales) {
      const loc = localizedVariants[lang];
      if (!loc) {
        score -= 20;
        warnings.push(`[${lang}] 번역본이 누락되었습니다.`);
        continue;
      }

      if (loc.steps.length !== masterProtocol.steps.length) {
        score -= 20;
        warnings.push(`[${lang}] 스텝 수 불일치 (마스터: ${masterProtocol.steps.length}, ${lang}: ${loc.steps.length})`);
      }

      // 한글 잔존 여부 검사 (번역 누락 탐지)
      const locText = [
        loc.title,
        loc.summary,
        ...loc.materials.map((m) => `${m.name} ${m.desc}`),
        ...loc.steps.map((s) => `${s.title} ${s.description} ${s.actionNote}`),
      ].join(' ');

      if (/[가-힣]/.test(locText)) {
        score -= 15;
        warnings.push(`[${lang}] 번역본 본문에 미번역 한글(Hangul)이 남아 있습니다.`);
      }

      // SVG 라벨 및 deepDive/fieldSpecs 개수 1:1 대조
      for (let i = 0; i < Math.min(masterProtocol.steps.length, loc.steps.length); i++) {
        const mStep = masterProtocol.steps[i]!;
        const lStep = loc.steps[i]!;
        if ((mStep.svgLabels?.length || 0) !== (lStep.svgLabels?.length || 0)) {
          score -= 15;
          warnings.push(`[${lang}] Step ${i + 1} svgLabels 개수 불일치`);
        }
        if (Boolean(mStep.deepDive) !== Boolean(lStep.deepDive)) {
          score -= 10;
          warnings.push(`[${lang}] Step ${i + 1} deepDive 존재 여부 불일치`);
        }
        if ((mStep.deepDive?.fieldSpecs?.length || 0) !== (lStep.deepDive?.fieldSpecs?.length || 0)) {
          score -= 10;
          warnings.push(`[${lang}] Step ${i + 1} fieldSpecs 개수 불일치`);
        }
      }
    }

    if (warnings.length === 0) {
      checks.push(`6대 글로벌 언어(${targetLocales.join(', ')}) 스텝·라벨·딥다이브·식생스펙 1:1 정합성 및 미번역 한글 0건 확인`);
    }

    return {
      pillar: 'GLOBAL_ECO_LOCALIZATION',
      passed: score >= 80 && warnings.length === 0,
      score: Math.max(0, score),
      checks,
      warnings,
    };
  }

  /**
   * 5. ⚖️ 법무 리스크 & Google Publisher/AdSense 정책 준수 검수 (Legal & Google Policy Audit)
   */
  public static auditLegalGooglePolicy(protocol: Protocol): ReviewPillarResult {
    const checks: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const fullText = [
      protocol.title,
      protocol.summary,
      ...protocol.materials.map((m) => `${m.name} ${m.desc}`),
      ...protocol.steps.map((s) => `${s.title} ${s.description} ${s.actionNote}`),
      protocol.fatalMistake?.title || '',
      protocol.fatalMistake?.description || '',
      protocol.fatalMistake?.consequence || '',
    ].join(' ');

    // 1. Google Publisher Policy 위험·불법 무기/폭발물 금지어 검사
    const policyBannedPatterns = [
      /폭탄\s*제조/g,
      /사제\s*폭탄/g,
      /사제\s*총기/g,
      /화약\s*제조/g,
      /뇌관\s*제작/g,
      /다이너마이트/g,
      /자물쇠\s*따기/g,
      /무단\s*침입\s*기술/g,
    ];
    for (const pattern of policyBannedPatterns) {
      if (pattern.test(fullText)) {
        score -= 50;
        warnings.push(`Google Publisher/AdSense 정책 위반 금지어 감지: ${pattern.source}`);
      }
    }
    if (warnings.length === 0) {
      checks.push('Google Publisher/AdSense 위험·불법 무기/폭발물 정책 위반 키워드 0건 확인');
    }

    const materialsText = protocol.materials.map((m) => `${m.name} ${m.desc}`).join(' ');

    // 2. 도시 폐자재(깡통/전선)를 실제 준비물로 사용하는 프로토콜의 경우 유독 코팅/피복 제거 안전 고지 확인
    if (/깡통|통조림\s*캔/.test(materialsText)) {
      if (/코팅|아연|태워|유독/.test(fullText)) {
        checks.push('폐깡통 활용 시 내부 코팅 소각 및 아연도금 유독가스 안전 고지 확인');
      } else {
        score -= 20;
        warnings.push('폐깡통을 다루나 내부 코팅 제거 또는 유독가스 주의 안내가 누락되었습니다.');
      }
    }
    if (/폐전선|전기선/.test(materialsText)) {
      if (/피복|벗겨|유독/.test(fullText)) {
        checks.push('폐전선 활용 시 플라스틱 피복 제거 및 유독 연기 방지 고지 확인');
      } else {
        score -= 20;
        warnings.push('폐전선을 다루나 피복 제거 안전 안내가 누락되었습니다.');
      }
    }

    // 3. 의료/응급처치(MEDICINE) 카테고리 YMYL 감염·부작용 경고 확인
    if (protocol.category === 'MEDICINE') {
      if (/감염|파상풍|소독|씻어|괴사/.test(fullText)) {
        checks.push('MEDICINE(YMYL) 프로토콜 2차 감염·파상풍 예방 및 위생 경고 구비 확인');
      } else {
        score -= 25;
        warnings.push('MEDICINE 카테고리이나 2차 감염·파상풍 등 YMYL 안전 경고가 부족합니다.');
      }
    }

    return {
      pillar: 'LEGAL_GOOGLE_POLICY',
      passed: score >= 80 && warnings.length === 0,
      score: Math.max(0, score),
      checks,
      warnings,
    };
  }

  /**
   * 5대 기둥 통합 포스팅 리뷰 실행
   */
  public static auditPostingFull(
    masterProtocol: Protocol,
    localizedVariants: Record<string, Protocol> = {}
  ): PostingReviewReport {
    const safetyRedTeam = this.auditSafetyRedTeam(masterProtocol);
    const fieldReproducibility = this.auditFieldReproducibility(masterProtocol);
    const seoSearchIntent = this.auditSeoSearchIntent(masterProtocol);
    const globalEcoLocalization = this.auditGlobalEcoLocalization(masterProtocol, localizedVariants);
    const legalGooglePolicy = this.auditLegalGooglePolicy(masterProtocol);

    const totalScore = Math.round(
      (safetyRedTeam.score +
        fieldReproducibility.score +
        seoSearchIntent.score +
        globalEcoLocalization.score +
        legalGooglePolicy.score) /
        5
    );

    const passed =
      safetyRedTeam.passed &&
      fieldReproducibility.passed &&
      seoSearchIntent.passed &&
      globalEcoLocalization.passed &&
      legalGooglePolicy.passed;

    const summaryFeedback = [
      ...safetyRedTeam.warnings.map((w) => `[안전/Red-Team] ${w}`),
      ...fieldReproducibility.warnings.map((w) => `[무도구 재현성] ${w}`),
      ...seoSearchIntent.warnings.map((w) => `[SEO/구조화데이터] ${w}`),
      ...globalEcoLocalization.warnings.map((w) => `[글로벌 현지화] ${w}`),
      ...legalGooglePolicy.warnings.map((w) => `[법무/구글정책] ${w}`),
    ];

    return {
      protocolId: masterProtocol.protocolId,
      passed,
      totalScore,
      pillars: {
        safetyRedTeam,
        fieldReproducibility,
        seoSearchIntent,
        globalEcoLocalization,
        legalGooglePolicy,
      },
      summaryFeedback,
    };
  }
}
