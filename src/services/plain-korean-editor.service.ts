import type { Protocol } from '../types/protocol.types.ts';

export interface JargonIssue {
  word: string;
  suggestion: string;
  reason: string;
  contextSnippet?: string;
}

export interface PlainKoreanReport {
  passed: boolean;
  score: number;
  grade: 'ELEMENTARY_APPROVED' | 'NEEDS_SIMPLIFICATION' | 'REJECTED';
  issues: JargonIssue[];
  readabilityFeedback: string[];
}

/**
 * [Domain Service]
 * 초등학생 눈높이 생존 문체 감수 및 쉬운 일상어 변환 서비스
 * 대학 교재식 학술용어/난해한 한자어/영어 음차어를 색출하고,
 * 초등 5~6학년도 0.5초 만에 이해할 수 있는 직관적인 행동 묘사로 검증합니다.
 */
export class PlainKoreanEditorService {
  // 유아어 및 동화풍 표현 (테크니컬 라이팅 위반 어휘)
  public static readonly FLUFF_MAP: Array<{ regex: RegExp; word: string; suggestion: string; reason: string }> = [
    {
      regex: /쏙\s*빨아|쏙쏙/g,
      word: '쏙 빨아들임 / 쏙쏙',
      suggestion: '흡수함 / 걸러냄',
      reason: '유아용 의성어·동화풍 표현 대신 간결한 직관적 동작어를 사용해야 합니다.'
    },
    {
      regex: /나쁜\s*벌레/g,
      word: '나쁜 벌레',
      suggestion: '미세 세균 / 병원균',
      reason: '유아어 표현 대신 정확하고 직관적인 단어를 써야 합니다.'
    },
    {
      regex: /살포시/g,
      word: '살포시',
      suggestion: '천천히 / 조심스럽게',
      reason: '불필요한 감성적 미사여구입니다.'
    },
    {
      regex: /꿀꺽꿀꺽/g,
      word: '꿀꺽꿀꺽',
      suggestion: '안전하게 마심',
      reason: '유아용 의태어입니다.'
    },
    {
      regex: /와르르/g,
      word: '와르르',
      suggestion: '한꺼번에 쏟아짐',
      reason: '동화풍 의태어입니다.'
    }
  ];

  // 난해한 전문 용어 및 권장 일상어 사전
  public static readonly JARGON_MAP: Array<{ regex: RegExp; word: string; suggestion: string; reason: string }> = [
    {
      regex: /다공성|미세\s*기공/g,
      word: '다공성 / 미세 기공',
      suggestion: '냄새와 오염 물질을 붙잡는 미세 구멍',
      reason: '초등학생이 직관적으로 떠올리기 어려운 물리·화학 전문 용어입니다.'
    },
    {
      regex: /활성탄\s*흡착/g,
      word: '활성탄 흡착',
      suggestion: '숯이 냄새와 불순물을 흡수하여 걸러냄',
      reason: '흡착이라는 물리 화학적 개념보다 흡수하여 걸러낸다는 직관적 동작어가 적합합니다.'
    },
    {
      regex: /비등\s*멸균|100℃\s*비등|열\s*멸균/g,
      word: '비등 멸균 / 열 멸균',
      suggestion: '큰 거품이 일도록 펄펄 끓여서 세균 죽이기',
      reason: '비등(Boiling), 멸균(Sterilization)은 초등학생에게 난해한 한자 전문어입니다.'
    },
    {
      regex: /플러싱(?:\(Flushing\))?/gi,
      word: '플러싱(Flushing)',
      suggestion: '필터 속 숯가루를 씻어내기 위해 첫 1~2컵 버리기',
      reason: '영어 음차어로 뜻을 단번에 알 수 없습니다.'
    },
    {
      regex: /삼각대\(Tripod\)|3점\s*지지\s*삼각대/gi,
      word: '3점 지지 삼각대(Tripod)',
      suggestion: '나뭇가지 3개를 묶어 세운 삼발이 거치대',
      reason: '기하학적 공학 용어 대신 부품과 모양이 바로 그려지는 단어를 써야 합니다.'
    },
    {
      regex: /지아디아|크립토스포리디움|병원체|병원균/g,
      word: '지아디아 / 크립토스포리디움 / 병원체',
      suggestion: '배탈과 설사를 일으키는 미세 세균',
      reason: '라틴어 기생충 명칭은 공포감만 주고 실질적 대처 행동을 방해합니다.'
    },
    {
      regex: /수인성\s*전염병/g,
      word: '수인성 전염병',
      suggestion: '오염된 물을 마셔 걸리는 심한 배탈과 설사병',
      reason: '추상적 한자어보다 구체적인 증상으로 써야 경각심이 높아집니다.'
    },
    {
      regex: /열분해(?:\(Pyrolysis\))?/gi,
      word: '열분해(Pyrolysis)',
      suggestion: '공기를 막고 고온으로 쪄서 단단한 숯으로 굽기',
      reason: '화학 용어 대신 조리하듯 쪄서 굽는 직관적 행동으로 표현해야 합니다.'
    },
    {
      regex: /불완전\s*연소/g,
      word: '불완전 연소',
      suggestion: '산소를 줄여 불꽃 없이 은근히 찌는 연소',
      reason: '화학 용어입니다.'
    },
    {
      regex: /백드래프트(?:\(Backdraft\))?/gi,
      word: '백드래프트(Backdraft)',
      suggestion: '가마에 산소가 갑자기 들어가 불길이 펑 터지는 현상',
      reason: '소방 전문 외래어입니다.'
    },
    {
      regex: /카운터\s*텐션/gi,
      word: '카운터 텐션',
      suggestion: '서로 반대로 밀어내는 힘',
      reason: '물리학 외래어입니다.'
    },
    {
      regex: /부유\s*물질|유기\s*오염\s*물질/g,
      word: '부유 물질 / 유기 오염 물질',
      suggestion: '물에 둥둥 떠다니는 흙먼지와 나뭇잎 찌꺼기',
      reason: '환경공학 용어입니다.'
    }
  ];

  /**
   * 단일 텍스트에서 초등학생 눈높이에 맞지 않는 난해한 어휘를 검출합니다.
   */
  public static auditText(text: string): { passed: boolean; issues: JargonIssue[] } {
    const issues: JargonIssue[] = [];

    for (const item of [...this.JARGON_MAP, ...this.FLUFF_MAP]) {
      if (item.regex.test(text)) {
        // 일치 부분 스니펫 추출
        const match = text.match(item.regex);
        issues.push({
          word: item.word,
          suggestion: item.suggestion,
          reason: item.reason,
          contextSnippet: match ? match[0] : undefined
        });
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * 프로토콜 전체(제목, 요약, 재료, 단계, 실수, 쇼츠)를 전수 감사하여 초등학생 적합도 점수를 산출합니다.
   */
  public static auditProtocol(protocol: Protocol): PlainKoreanReport {
    const allIssues: JargonIssue[] = [];
    const feedback: string[] = [];

    // 1. Title & Summary
    const titleAudit = this.auditText(protocol.title);
    allIssues.push(...titleAudit.issues);
    const summaryAudit = this.auditText(protocol.summary);
    allIssues.push(...summaryAudit.issues);

    // 2. Materials
    protocol.materials.forEach((m, idx) => {
      const matAudit = this.auditText(`${m.name} ${m.desc}`);
      if (!matAudit.passed) {
        matAudit.issues.forEach(i => (i.contextSnippet = `[재료 ${idx + 1}: ${m.name}] ${i.contextSnippet || ''}`));
        allIssues.push(...matAudit.issues);
      }
    });

    // 3. Steps
    protocol.steps.forEach((s) => {
      const stepAudit = this.auditText(`${s.title} ${s.description} ${s.actionNote}`);
      if (!stepAudit.passed) {
        stepAudit.issues.forEach(i => (i.contextSnippet = `[Step ${s.stepNumber}] ${i.contextSnippet || ''}`));
        allIssues.push(...stepAudit.issues);
      }
    });

    // 4. Fatal Mistake
    if (protocol.fatalMistake) {
      const mistakeAudit = this.auditText(`${protocol.fatalMistake.title} ${protocol.fatalMistake.description} ${protocol.fatalMistake.consequence}`);
      allIssues.push(...mistakeAudit.issues);
    }

    // 5. Shorts Script
    if (protocol.shortsScript) {
      const shortsAudit = this.auditText(`${protocol.shortsScript.hook} ${protocol.shortsScript.body}`);
      allIssues.push(...shortsAudit.issues);
    }

    // 중복 이슈 제거
    const uniqueIssues = allIssues.filter((v, i, a) => a.findIndex(t => t.word === v.word) === i);

    // 채점 기준: 100점에서 난해 단어당 10점 감점
    const score = Math.max(0, 100 - uniqueIssues.length * 10);
    const passed = score >= 90;

    let grade: PlainKoreanReport['grade'] = 'ELEMENTARY_APPROVED';
    if (score < 60) grade = 'REJECTED';
    else if (score < 90) grade = 'NEEDS_SIMPLIFICATION';

    if (passed) {
      feedback.push('초등학교 5~6학년 학생이 사전 없이 스스로 읽고 0.5초 만에 따라 할 수 있는 훌륭한 문체입니다.');
    } else {
      feedback.push(`총 ${uniqueIssues.length}개의 난해한 전문 용어가 발견되었습니다. 초등학생 눈높이에 맞는 일상어로 교정하세요.`);
    }

    return {
      passed,
      score,
      grade,
      issues: uniqueIssues,
      readabilityFeedback: feedback
    };
  }

  /**
   * 잘 알려진 난해 어휘를 직관적이고 쉬운 일상어로 안전하게 치환합니다.
   */
  public static autoFixKnownJargon(text: string): string {
    let result = text;
    for (const item of this.JARGON_MAP) {
      result = result.replace(item.regex, item.suggestion);
    }
    return result;
  }
}
