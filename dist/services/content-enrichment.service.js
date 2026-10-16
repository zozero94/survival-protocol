import { Protocol } from '../types/protocol.types.js';

                                          
                           
                           
                    
                      
                                                                                      
                         
                            
                    
 

                                            
                   
                  
                    
                                                        
                  
 

                                       
                     
                             
                                                                         
                                                
                                             
                  
 

                                          
                     
                                                                        
                      
                     
                         
 

                                             
                     
                        
                                 
                              
                                   
                    
 

                                          
                     
                       
                  
                   
                  
                          
                                 
    
                  
                  
                                               
    
                     
                  
                                              
    
                                       
 

                               
                     
              
                         
                   
                    
 

const PROTOCOL_DEPENDENCY_CATALOG                        = [
  {
    protocolId: 'PR-01',
    url: '/protocol-01.html',
    defaultLabelKo: '자연 정수 필터',
    keywords: /(정수|흙탕물\s*여과|식수\s*여과|water\s*filter|water\s*purif)/i,
    rationale: '오염된 물을 걸러내고 끓여 식수를 확보하는 원시 정수 프로토콜과 직접 연결됩니다.',
  },
  {
    protocolId: 'PR-02',
    url: '/protocol-02.html',
    defaultLabelKo: '활비비 마찰 발화법',
    keywords: /(활비비|마찰\s*발화|불씨\s*피우기|모닥불\s*점화|bow\s*drill|friction\s*fire)/i,
    rationale: '라이터 없이 나무 마찰열로 불씨와 모닥불을 피우는 발화 프로토콜이 선행되어야 합니다.',
  },
  {
    protocolId: 'PR-03',
    url: '/protocol-03.html',
    defaultLabelKo: 'A프레임 낙엽 은신처(데브리 헛)',
    keywords: /(움막\s*기둥|은신처|데브리\s*헛|debris\s*hut|shelter\s*frame)/i,
    rationale: '체온 유지를 위한 A프레임 단열 은신처 구축 프로토콜과 연계됩니다.',
  },
  {
    protocolId: 'PR-04',
    url: '/protocol-04.html',
    defaultLabelKo: '돌도끼 및 날카로운 돌날 제작법',
    keywords: /(돌도끼|돌칼|날카로운\s*돌날|박리\s*돌날|stone\s*axe|stone\s*knife|sharp\s*stone\s*flake)/i,
    rationale: '나무껍질 채취, 기둥 벌목, 홈 파기에 필수적인 석기(돌칼·돌도끼) 제작 프로토콜과 연결됩니다.',
  },
  {
    protocolId: 'PR-05',
    url: '/protocol-05.html',
    defaultLabelKo: '야생 칡덩굴 밧줄 만드는 법',
    keywords: /(칡덩굴|야생\s*밧줄|속껍질\s*섬유|식물\s*밧줄|끈으로\s*묶|천연\s*로프|natural\s*cordage|kudzu\s*rope|bast\s*fiber)/i,
    rationale: '도끼 자루 결속, 삼발이 묶기, 활비비 줄에 쓰이는 고강도 야생 밧줄 제작 프로토콜과 연결됩니다.',
  },
  {
    protocolId: 'PR-06',
    url: '/protocol-06.html',
    defaultLabelKo: '진흙 화덕 및 다코타 무연 아궁이',
    keywords: /(진흙\s*화덕|무연\s*화덕|다코타\s*화덕|clay\s*hearth|dakota\s*fire)/i,
    rationale: '열효율을 높이고 연기를 줄이는 밀폐형 진흙 화덕 구축 프로토콜과 연결됩니다.',
  },
  {
    protocolId: 'PR-08',
    url: '/protocol-08.html',
    defaultLabelKo: '4자형 낙하 돌덫(Figure-4 Deadfall)',
    keywords: /(4자형\s*덫|돌덫|인계철선|사냥\s*함정|deadfall\s*trap|figure-4)/i,
    rationale: '수면 중 칼로리를 자동으로 확보하는 원시 물리 함정 프로토콜과 연결됩니다.',
  },
  {
    protocolId: 'PR-09',
    url: '/protocol-09.html',
    defaultLabelKo: '지하 흙구덩이 참나무 숯가마',
    keywords: /(참나무\s*숯|숯가루|숯불\s*잔열|숯가마|활성탄|charcoal\s*powder|oak\s*charcoal|pit\s*kiln)/i,
    rationale: '정수 필터 흡착제, 송진 경화제, 무연 고열 연료로 쓰이는 고밀도 참나무 숯 제조 프로토콜과 연결됩니다.',
  },
  {
    protocolId: 'PR-10',
    url: '/protocol-10.html',
    defaultLabelKo: '소나무 송진 방수 접착제 및 소독 연고',
    keywords: /(소나무\s*송진|송진\s*접착제|방수\s*접착제|상처\s*소독\s*연고|천연\s*에폭시|pine\s*resin|pitch\s*glue)/i,
    rationale: '돌도끼 결속 방수 코팅과 야생 외상 소독에 필수적인 송진 정제 프로토콜과 연결됩니다.',
  },
];

const INLINE_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * 1. 포스팅 간 문맥 하이퍼텍스트 링커 & 검증 엔진 (protocol-cross-linker 백엔드)
 * - 본문(steps.description, steps.actionNote, materials.desc) 내 기존 인라인 링크 추출 및 무결성 검증
 * - 문맥상 다른 생존 프로토콜(돌도끼 ➔ 야생 밧줄, 송진 ➔ 돌도끼/숯가마 등)이 등장할 때 하이퍼텍스트 연결 추천
 */
export class CrossLinkerService {
  /**
   * 텍스트에서 마크다운 인라인 링크 `[label](url)` 목록을 추출합니다.
   */
         static extractInlineLinks(text        )                                                     {
    if (!text) return [];
    const results                                                     = [];
    let match                        ;
    const regex = new RegExp(INLINE_LINK_REGEX.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      results.push({
        raw: match[0],
        label: match[1].trim(),
        url: match[2].trim(),
      });
    }
    return results;
  }

  /**
   * 단일 프로토콜의 인라인 크로스링크 현황을 감사하고 추천 연결 고리를 도출합니다.
   */
         static auditCrossLinks(
    protocol          ,
    allProtocols             = []
  )                       {
    const validIds = new Set        (
      allProtocols.length > 0
        ? allProtocols.map(p => p.protocolId)
        : PROTOCOL_DEPENDENCY_CATALOG.map(c => c.protocolId)
    );

    const existingLinks                                                          = [];
    const validationIssues                              = [];
    const linkedProtocolIds = new Set        ();

    const inspectField = (text                    , location        ) => {
      if (!text) return;
      const links = this.extractInlineLinks(text);
      for (const link of links) {
        existingLinks.push({ label: link.label, url: link.url, location });

        if (!link.label) {
          validationIssues.push({
            location,
            rawLink: link.raw,
            targetUrl: link.url,
            reason: 'EMPTY_LABEL',
            message: `${location}: 하이퍼링크 텍스트가 비어 있습니다 (${link.raw}).`,
          });
        }

        const protoMatch = link.url.match(/^\/protocol-(\d{2})\.html$/);
        if (!protoMatch) {
          validationIssues.push({
            location,
            rawLink: link.raw,
            targetUrl: link.url,
            reason: 'BROKEN_TARGET',
            message: `${location}: 유효하지 않은 프로토콜 경로 형식입니다 (${link.url}). '/protocol-XX.html' 형식이어야 합니다.`,
          });
          continue;
        }

        const targetId = `PR-${protoMatch[1]}`;
        if (targetId === protocol.protocolId) {
          validationIssues.push({
            location,
            rawLink: link.raw,
            targetUrl: link.url,
            reason: 'SELF_LINK',
            message: `${location}: 자기 자신(${targetId})을 가리키는 순환 하이퍼링크입니다.`,
          });
        } else if (!validIds.has(targetId)) {
          validationIssues.push({
            location,
            rawLink: link.raw,
            targetUrl: link.url,
            reason: 'BROKEN_TARGET',
            message: `${location}: 존재하지 않는 프로토콜(${targetId})을 가리킵니다.`,
          });
        } else {
          linkedProtocolIds.add(targetId);
        }
      }
    };

    (protocol.materials || []).forEach((mat, idx) => {
      inspectField(mat.desc, `materials[${mat.id || idx}].desc`);
    });

    (protocol.steps || []).forEach(step => {
      inspectField(step.description, `steps[${step.stepNumber}].description`);
      inspectField(step.actionNote, `steps[${step.stepNumber}].actionNote`);
    });

    // 문맥 기반 미연결 프로토콜 추천 탐지
    const recommendations                            = [];
    for (const rule of PROTOCOL_DEPENDENCY_CATALOG) {
      if (rule.protocolId === protocol.protocolId) continue;
      if (linkedProtocolIds.has(rule.protocolId)) continue;
      if (!validIds.has(rule.protocolId)) continue;

      const targetProto = allProtocols.find(p => p.protocolId === rule.protocolId);
      const targetTitle = targetProto ? targetProto.title : rule.defaultLabelKo;

      // 스텝 본문이나 준비물 설명에서 키워드가 등장하는 첫 위치를 찾음
      let found = false;
      for (const step of protocol.steps || []) {
        const match = step.description.match(rule.keywords);
        if (match) {
          recommendations.push({
            sourceProtocolId: protocol.protocolId,
            targetProtocolId: rule.protocolId,
            targetUrl: rule.url,
            targetTitle,
            contextLocation: `steps[${step.stepNumber}].description`,
            matchedKeyword: match[0],
            suggestedMarkdown: `[${match[0]}](${rule.url})`,
            rationale: rule.rationale,
          });
          found = true;
          break;
        }
      }

      if (!found) {
        for (const mat of protocol.materials || []) {
          const combined = `${mat.name} ${mat.desc}`;
          const match = combined.match(rule.keywords);
          if (match) {
            recommendations.push({
              sourceProtocolId: protocol.protocolId,
              targetProtocolId: rule.protocolId,
              targetUrl: rule.url,
              targetTitle,
              contextLocation: `materials[${mat.id}].desc`,
              matchedKeyword: match[0],
              suggestedMarkdown: `[${match[0]}](${rule.url})`,
              rationale: rule.rationale,
            });
            break;
          }
        }
      }
    }

    return {
      protocolId: protocol.protocolId,
      existingLinksCount: existingLinks.length,
      existingLinks,
      validationIssues,
      recommendations,
      passed: validationIssues.length === 0,
    };
  }
}

/**
 * 2. 콘텐츠 깊이·가독성·시각 도감 검수 엔진 (content-enrichment-auditor 백엔드)
 * - 내용이 실질적으로 의미 있고 독자가 이해하기 쉽게 설명되었는지 검수
 * - 스텝별 벡터 도면 밀도(추가 벡터 필요 여부 vs 과잉 스텝 감축 필요 여부) 평가
 * - 헷갈리기 쉬운 자연물/도시 폐자재에 대해 실사 사진(fieldSpecs)이나 추가 식별 정보 보강 제안
 */
export class ContentEnrichmentService {
          static          CONFUSABLE_MATERIAL_PATTERNS         
                    
                    
                              
                      
     = [
    {
      pattern: /(소나무|참나무|노송|송진)/,
      subject: '소나무 vs 참나무 수피·잎·열매 야전 식별',
      suggestedPhotos: ['소나무(거북등 수피·2엽 바늘잎·송진)', '참나무(세로 골 수피·톱니 잎·도토리)'],
      rationale: '송진 채취용 침엽수(소나무)와 고밀도 숯/자루용 활엽수(참나무)를 야전에서 혼동하지 않도록 실사 비교 도감이 필요합니다.',
    },
    {
      pattern: /(칡덩굴|참피나무|버드나무|쐐기풀|인피\s*섬유)/,
      subject: '야생 섬유용 줄기(생줄기 vs 마른 줄기) 및 속껍질 식별',
      suggestedPhotos: ['유연한 칡 생줄기와 녹색 내피', '거친 갈색 외피 vs 하얀 사부 섬유층'],
      rationale: '독자가 썩은 마른 덩굴이나 독성 덩굴(독초)을 잘못 채취하지 않도록 생줄기 속껍질 실사 또는 구분 가이드가 있으면 이해도가 급상승합니다.',
    },
    {
      pattern: /(차트|규암|부싯돌|석영|강돌)/,
      subject: '타제석기용 고경도 암석(규암·차트) vs 부서지는 퇴적암(셰일·사암) 식별',
      suggestedPhotos: ['유리질 단면의 규암·차트 강돌', '층리대로 부서지는 부적합 이암·사암'],
      rationale: '아무 돌이나 치면 깨지지 않고 위험한 파편만 튑니다. 깨졌을 때 날이 서는 돌을 눈으로 고르는 추가 식별 정보가 유익합니다.',
    },
    {
      pattern: /(점토|찰흙|마사토)/,
      subject: '내화 점토(찰흙) vs 푸석한 일반 흙(사질토) 반죽 링 테스트 식별',
      suggestedPhotos: ['손가락에 감아 갈라지지 않는 고점도 찰흙', '뚝 끊어지는 사질토 비교'],
      rationale: '화덕이나 토기가 열에 폭열하지 않으려면 진흙의 점성을 눈으로 판별할 수 있는 실사 기준이 도움이 됩니다.',
    },
    {
      pattern: /(빈\s*깡통|전기선|배터리|폐자재|고철)/,
      subject: '도시 아포칼립스 폐자재(구리선·주석 깡통·알루미늄) 안전 선별',
      suggestedPhotos: ['내부 에폭시 코팅 캔 vs 순수 철제 캔', '구리 단선 vs 알루미늄 피복선'],
      rationale: '도시 폐자재 활용 시 유독성 플라스틱 코팅이나 위험 부품을 피하고 안전한 재질을 구분하는 시각 가이드가 필요합니다.',
    },
  ];

         static auditProtocolEnrichment(
    protocol          ,
    allProtocols             = []
  )                          {
    const claritySuggestions           = [];
    let meaningfulScore = 100;

    // 1. 내용 의미성 및 쉬운 설명(Why & How) 검수
    for (const step of protocol.steps || []) {
      const numberedLines = step.description
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^\d+\./.test(l));

      if (numberedLines.length < 3) {
        meaningfulScore -= 10;
        claritySuggestions.push(
          `Step ${step.stepNumber}: 행동 절차가 ${numberedLines.length}개로 너무 적습니다. 독자가 빈틈없이 따라 할 수 있도록 3~4개의 구체적 동작으로 보강하세요.`
        );
      }

      // 행동의 이유(목적/원리 연결어)가 전혀 없으면 보강 제안
      const hasReasonContext = /(위해|도록|막기|방지|야만|하면|되어|원리|덕분에)/.test(
        `${step.description} ${step.actionNote}`
      );
      if (!hasReasonContext) {
        meaningfulScore -= 8;
        claritySuggestions.push(
          `Step ${step.stepNumber}: 단순 지시만 있고 '왜 이렇게 해야 하는지' 이유가 부족합니다. 초보자가 원리를 이해하도록 인과 설명을 덧붙이세요.`
        );
      }

      // 너무 긴 단일 문장(220자 초과) 가독성 경고
      for (const line of numberedLines) {
        if (line.length > 220) {
          meaningfulScore -= 5;
          claritySuggestions.push(
            `Step ${step.stepNumber}: 한 줄이 ${line.length}자로 너무 깁니다. 핵심 동작과 부연 설명을 나누어 읽기 쉽게 다듬으세요.`
          );
        }
      }
    }

    meaningfulScore = Math.max(0, meaningfulScore);

    // 2. 벡터 도면 밀도 (추가 벡터 요청 vs 과잉 스텝 감축) 검수
    const stepAssessments                            = [];
    let vectorBalanceScore = 100;

    for (const step of protocol.steps || []) {
      const numberedLines = step.description
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^\d+\./.test(l));
      const labelCount = (step.svgLabels || []).length;

      if (numberedLines.length >= 6 || labelCount >= 14) {
        vectorBalanceScore -= 15;
        stepAssessments.push({
          stepNumber: step.stepNumber,
          status: 'NEEDS_EXTRA_VECTOR',
          actionCount: numberedLines.length,
          labelCount,
          recommendation: `Step ${step.stepNumber}에 동작(${numberedLines.length}개) 또는 도면 라벨(${labelCount}개)이 과밀합니다. 독자가 한눈에 이해할 수 있도록 2개의 스텝으로 분할하고 추가 벡터 도면을 생성하세요.`,
        });
      } else if (numberedLines.length <= 1 || labelCount <= 2) {
        vectorBalanceScore -= 15;
        stepAssessments.push({
          stepNumber: step.stepNumber,
          status: 'OVERDONE_PRUNE_CANDIDATE',
          actionCount: numberedLines.length,
          labelCount,
          recommendation: `Step ${step.stepNumber}의 정보 밀도(동작 ${numberedLines.length}개, 라벨 ${labelCount}개)가 너무 낮아 불필요하게 늘어진 상태입니다. 인접 스텝과 통합하여 불필요한 벡터를 덜어내세요.`,
        });
      } else {
        stepAssessments.push({
          stepNumber: step.stepNumber,
          status: 'OPTIMAL',
          actionCount: numberedLines.length,
          labelCount,
          recommendation: `Step ${step.stepNumber}: 1스텝 1핵심 공정 및 도면 라벨(${labelCount}개) 밀도가 최적입니다.`,
        });
      }
    }

    vectorBalanceScore = Math.max(0, vectorBalanceScore);

    // 3. 실사 이미지(fieldSpecs) 및 추가 식별 도감 보강 검수
    const visualSuggestions                               = [];
    const fullText = JSON.stringify(protocol);
    const existingFieldSpecsSteps = (protocol.steps || []).filter(
      s => s.deepDive?.fieldSpecs && s.deepDive.fieldSpecs.length > 0
    );

    for (const rule of this.CONFUSABLE_MATERIAL_PATTERNS) {
      if (rule.pattern.test(fullText)) {
        const matchedStep =
          (protocol.steps || []).find(s => rule.pattern.test(`${s.title} ${s.description} ${s.actionNote}`)) ||
          protocol.steps?.[0];
        const hasSpecs = existingFieldSpecsSteps.length > 0;
        visualSuggestions.push({
          stepNumber: matchedStep?.stepNumber || '01',
          targetSubject: rule.subject,
          hasExistingFieldSpecs: hasSpecs,
          shouldAddRealPhoto: !hasSpecs,
          suggestedPhotoSubjects: rule.suggestedPhotos,
          rationale: rule.rationale,
        });
      }
    }

    const visualScore = 100;
    const crossLinkAudit = CrossLinkerService.auditCrossLinks(protocol, allProtocols);

    const overallScore = Math.round(
      meaningfulScore * 0.4 +
        vectorBalanceScore * 0.35 +
        (crossLinkAudit.passed ? 100 : 60) * 0.25
    );

    return {
      protocolId: protocol.protocolId,
      overallScore,
      passed:
        meaningfulScore >= 80 &&
        vectorBalanceScore >= 80 &&
        crossLinkAudit.passed,
      meaningfulness: {
        score: meaningfulScore,
        isMeaningful: meaningfulScore >= 80,
        claritySuggestions,
      },
      vectorBalance: {
        score: vectorBalanceScore,
        stepAssessments,
      },
      visualEnrichment: {
        score: visualScore,
        suggestions: visualSuggestions,
      },
      crossLinkAudit,
    };
  }
}
