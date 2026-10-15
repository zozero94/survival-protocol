import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGeminiApi } from '../gemini-client.ts';
import { SvgGeneratorService } from './svg-generator.service.ts';
import { SvgAuditService } from './svg-audit.service.ts';
import { DeployService } from './deploy.service.ts';
import { buildSite } from '../pipeline.ts';
import { SITE_META } from '../site.config.ts';
import type { Protocol, ProtocolCategory } from '../types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, '../..');
function getRootDir(): string {
  return process.env.SURVIVAL_ROOT_DIR || defaultRootDir;
}

export interface ProtocolSummary {
  protocolId: string;
  category: ProtocolCategory;
  title: string;
  threatLevel: string;
  summary: string;
  filePath: string;
}

export interface GenerateProtocolOptions {
  apiKey: string;
  topic?: string;
  category?: ProtocolCategory;
  triggerDeploy?: boolean;
  dryRun?: boolean;
  githubToken?: string;
  deadlineMs?: number;
  onProgress?: (statusText: string) => Promise<void> | void;
}

export interface EditProtocolOptions {
  apiKey: string;
  protocolId: string;
  instructions: string;
  regenerateSvgs?: boolean;
  regenerateLocales?: boolean;
  triggerDeploy?: boolean;
  dryRun?: boolean;
  githubToken?: string;
  deadlineMs?: number;
  onProgress?: (statusText: string) => Promise<void> | void;
}

export interface PipelineExecutionResult {
  success: boolean;
  protocol?: Protocol;
  message: string;
  missingLocales?: string[];
  deployResult?: {
    commitHash?: string;
    pushed: boolean;
    error?: string;
  };
  liveUrl?: string;
}

const TARGET_LOCALE_CODES = ['en', 'ja', 'es', 'de', 'pt', 'zh-TW'] as const;

// 현대 공산품 금지 키워드 목록 (고증 방어)
const FORBIDDEN_MODERN_TERMS = [
  '라이터', '성냥', '부탄가스', '버너', '비닐', '플라스틱',
  '알루미늄 호일', '건전지', '철사', '나일론', '고무줄', '테이프',
  '페트병', '스테인리스', '철제 냄비', '방수포', '타프',
  'lighter', 'match', 'plastic', 'battery', 'aluminum'
];

/**
 * [Service Layer]
 * 생존 교범 자동 생성, AI 편집, 도면/번역 합성 및 자동 배포 총괄 서비스
 * (로컬 환경 및 Vercel 클라우드 서버리스 환경 동시 지원)
 */
export class ProtocolGeneratorService {
  /**
   * 쓰기 작업 시 로컬 환경이면 getRootDir(), 서버리스(Read-Only) 환경이면 /tmp 워크스페이스를 준비하여 반환
   */
  public static prepareWritableWorkspace(baseRoot: string = getRootDir()): { workDir: string; isServerless: boolean } {
    if (DeployService.hasLocalGit(baseRoot)) {
      return { workDir: baseRoot, isServerless: false };
    }

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'survival-ws-'));

    const srcContent = path.join(baseRoot, 'content');
    if (fs.existsSync(srcContent)) {
      fs.cpSync(srcContent, path.join(workDir, 'content'), { recursive: true });
    }

    const srcPrompt = path.join(baseRoot, 'NEXT_TOPIC_PROMPT.md');
    if (fs.existsSync(srcPrompt)) {
      fs.cpSync(srcPrompt, path.join(workDir, 'NEXT_TOPIC_PROMPT.md'));
    }

    return { workDir, isServerless: true };
  }

  /**
   * 서버리스 임시 워크스페이스(/tmp/survival-ws-*) 정리 헬퍼
   */
  public static cleanupWorkspace(workDir: string, isServerless: boolean): void {
    if (isServerless && workDir && workDir.startsWith(os.tmpdir())) {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * 아카이브된 번호가 있더라도 기존 최대 번호 + 1로 안전하게 다음 프로토콜 번호를 채번 (ID 충돌 방지)
   */
  public static getNextProtocolNumber(protocols: ProtocolSummary[] = this.listProtocols()): number {
    const maxNum = protocols.reduce((max, p) => {
      const n = parseInt(String(p.protocolId || '').replace(/[^0-9]/g, ''), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return Math.max(protocols.length + 1, maxNum + 1);
  }

  /**
   * 등록된 모든 프로토콜 목록을 반환
   */
  public static listProtocols(contentDir: string = path.join(getRootDir(), 'content/protocols')): ProtocolSummary[] {
    if (!fs.existsSync(contentDir)) return [];
    const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.json')).sort();
    const results: ProtocolSummary[] = [];

    for (const f of files) {
      try {
        const fullPath = path.join(contentDir, f);
        const data: Protocol = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        results.push({
          protocolId: data.protocolId,
          category: data.category,
          title: data.title,
          threatLevel: data.threatLevel,
          summary: data.summary,
          filePath: fullPath,
        });
      } catch {}
    }
    return results;
  }

  /**
   * 특정 프로토콜 ID로 파일 및 데이터 조회
   */
  public static getProtocolById(protocolId: string, contentDir: string = path.join(getRootDir(), 'content/protocols')): { data: Protocol; filePath: string } | null {
    const cleanId = protocolId.toUpperCase().replace(/\s+/g, '');
    const num = cleanId.replace(/[^0-9]/g, '').padStart(2, '0');
    if (!fs.existsSync(contentDir)) return null;

    const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      if (f.startsWith(num) || f.toLowerCase().includes(cleanId.toLowerCase())) {
        const fullPath = path.join(contentDir, f);
        const data: Protocol = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        return { data, filePath: fullPath };
      }
    }
    return null;
  }

  /**
   * 프로토콜 데이터의 원시 생존 고증 및 스키마 검증
   */
  public static validateProtocol(proto: Partial<Protocol>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!proto.protocolId) errors.push('protocolId 누락');
    if (!proto.category) errors.push('category 누락');
    if (!proto.title) errors.push('title 누락');
    if (!proto.threatLevel) errors.push('threatLevel 누락');
    if (!proto.summary) errors.push('summary 누락');

    if (!proto.materials || !Array.isArray(proto.materials) || proto.materials.length === 0) {
      errors.push('materials 항목이 1개 이상이어야 합니다.');
    }

    if (!proto.steps || !Array.isArray(proto.steps) || proto.steps.length < 3 || proto.steps.length > 8) {
      errors.push('steps는 최소 3단계 이상(3~8단계)이어야 합니다.');
    }

    if (!proto.fatalMistake || !proto.fatalMistake.title || !proto.fatalMistake.description) {
      errors.push('fatalMistake 항목이 완전해야 합니다.');
    }

    // 현대 공산품 유입 여부 전수 검사
    const fullText = JSON.stringify(proto).toLowerCase();
    for (const term of FORBIDDEN_MODERN_TERMS) {
      if (fullText.includes(term.toLowerCase())) {
        errors.push(`[고증 위반] 현대 공산품 키워드 '${term}'가 감지되었습니다. 100% 원시 자연물만 허용됩니다.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 신규 프로토콜 본문 AI 생성
   */
  public static async generateProtocolContent(
    apiKey: string,
    topic: string,
    nextId: string,
    category?: ProtocolCategory,
    deadlineAt?: number
  ): Promise<Protocol> {
    const prompt = `
당신은 누구나 위급한 상황에서 바로 보고 따라 할 수 있는 '실전 야생 생존 가이드(SURVIVAL PROTOCOL)'의 작성자입니다.
새로운 생존 기술 가이드를 작성하십시오.

[주제]: ${topic}
[프로토콜 ID]: ${nextId}
${category ? `[카테고리 강제]: ${category}` : ''}

[절대 규칙 1 - 쉬운 단어와 직관적인 설명 (가장 중요!)]:
1. 중학생이나 초보자도 위급 상황에서 한 번 읽고 바로 이해할 수 있는 쉬운 일상 한국어로 작성하십시오.
2. 어려운 한자어(음용, 적층, 포설, 가설, 풍상측, 비산, 수거, 비등, 함침, 박리 등)를 절대 쓰지 마십시오. 대신 쉬운 말(마시기, 차곡차곡 쌓기, 바닥에 깔기, 세우기, 바람 불어오는 쪽, 날아가다, 모으기, 팔팔 끓이기, 적시기, 떼어내기 등)로 풀어 쓰십시오.
3. 생소한 외래어/영문 음차 전문용어를 그대로 쓰지 말고 직관적인 우리말로 바꾸십시오.
4. '타협 불가한 절대 수칙', '시전자', '파국적 결과' 같은 오글거리거나 과장된 중2병/군대식 말투를 절대 넣지 마십시오. 담백하고 실용적인 설명체(~합니다, ~하세요)로 작성하십시오.

[절대 규칙 2 - 원시 자연물 고증 및 실전 쓸모 (가변 단계 구성)]:
1. 현대 공산품 일체 배제(라이터, 건전지, 비닐, 알루미늄, 플라스틱 등 금지). 오직 자연에서 구할 수 있는 재료(돌, 나무, 진흙, 칡덩굴, 낙엽, 숯, 동식물 등)만 사용.
2. 획일적인 3단계 요약에 끼워 맞추지 말고, 주제의 실제 난이도와 작업 순서에 맞춰 **3단계에서 6단계(Step 01 ~ Step 06)** 까지 필요한 만큼 세분화하여 작성하십시오.
3. 각 단계마다 손뼘·손가락 굵기 등 구체적인 치수와 함께, 눈·손끝 감각·소리로 성공 여부를 판단하는 실전 기준을 길고 자세하게 설명하십시오.
4. category는 반드시 다음 중 하나여야 합니다: WATER, FIRE, SHELTER, FOOD, TOOLS, MEDICINE.

반드시 다음 JSON 스키마 규격으로만 응답하십시오 (마크다운 백틱 제외):
{
  "protocolId": "${nextId}",
  "category": "FIRE",
  "title": "[번호(#01, PR-01 등) 표기 없이 누구나 한눈에 이해할 수 있는 쉬운 기술 제목]",
  "threatLevel": "CRITICAL",
  "threatLevelText": "[중요도: 필수 생존]",
  "summary": "2~3문장의 쉽고 명확한 상황 설명 및 해결 방법 요약",
  "timeRequired": "30분",
  "successRate": "90% (순서대로 따라 할 경우)",
  "difficulty": "보통 (초보자 가능)",
  "outputPerHour": "1회 완성 / 30분",
  "materials": [
    { "id": "mat-01", "name": "쉬운 재료 이름 1", "desc": "어디서 구하는지, 어떤 크기와 상태여야 하는지 쉬운 설명" },
    { "id": "mat-02", "name": "쉬운 재료 이름 2", "desc": "어디서 구하는지, 어떤 크기와 상태여야 하는지 쉬운 설명" },
    { "id": "mat-03", "name": "쉬운 재료 이름 3", "desc": "어디서 구하는지, 어떤 크기와 상태여야 하는지 쉬운 설명" }
  ],
  "steps": [
    {
      "stepNumber": "01",
      "title": "1단계: 쉬운 행동 중심 제목",
      "description": "어려운 용어 없이 손으로 따라 하기 쉽게 풀어 쓴 설명",
      "actionNote": "> 핵심 팁: 꼭 지켜야 할 점과 쉬운 원리 설명",
      "svgFileName": "${nextId.toLowerCase().replace(/[^a-z0-9]/g, '')}-step-01.svg",
      "svgLabels": ["STEP 01 // 핵심 요약", "주요 재료/부품 1", "치수 또는 방향 표시", "동작 결과 요약"]
    },
    {
      "stepNumber": "02",
      "title": "2단계: 쉬운 행동 중심 제목",
      "description": "어려운 용어 없이 손으로 따라 하기 쉽게 풀어 쓴 설명",
      "actionNote": "> 핵심 원리: 왜 이렇게 작동하는지 쉬운 설명",
      "svgFileName": "${nextId.toLowerCase().replace(/[^a-z0-9]/g, '')}-step-02.svg",
      "svgLabels": ["STEP 02 // 핵심 요약", "주요 재료/부품 2", "치수 또는 방향 표시", "동작 결과 요약"]
    },
    {
      "stepNumber": "03",
      "title": "3단계: 쉬운 행동 중심 제목",
      "description": "어려운 용어 없이 손으로 따라 하기 쉽게 풀어 쓴 설명",
      "actionNote": "> 주의할 점: 실패를 막는 실전 팁",
      "svgFileName": "${nextId.toLowerCase().replace(/[^a-z0-9]/g, '')}-step-03.svg",
      "svgLabels": ["STEP 03 // 핵심 요약", "주요 재료/부품 3", "치수 또는 방향 표시", "완성 상태 요약"]
    }
  ],
  "fatalMistake": {
    "title": "절대 하면 안 되는 실수: [초보자가 가장 흔히 하는 실수]",
    "description": "왜 이렇게 하면 실패하거나 위험해지는지 알기 쉬운 설명",
    "consequence": "결과: [실수했을 때 벌어지는 구체적인 위험]"
  }
}
`.trim();

    const raw = await callGeminiApi(apiKey, 'gemini-3.8-flash', prompt, {
      responseMimeType: 'application/json',
      temperature: 0.2,
      timeoutMs: 45000,
      deadlineAt,
    });

    const parsed: Protocol = JSON.parse(raw);
    if (typeof parsed.title === 'string') {
      parsed.title = parsed.title
        .replace(/^(?:프로토콜|생존\s*가이드|Protocol|プロトコル|Protocolo|Protokoll|生存指南|生存協議|協議|指南|PR)[\s#-]*\d+\s*[:：\-]\s*/i, '')
        .trim();
    }
    this.ensurePlannedSvgLabels(parsed);

    const validation = this.validateProtocol(parsed);
    if (!validation.valid) {
      throw new Error(`생성된 프로토콜이 유효성 검사를 통과하지 못했습니다:\n${validation.errors.join('\n')}`);
    }
    return parsed;
  }

  /**
   * 각 단계에 svgLabels가 비어 있는 경우 기본 4개 라벨을 보충
   */
  private static ensurePlannedSvgLabels(proto: Protocol): void {
    if (!Array.isArray(proto.steps)) return;
    for (const s of proto.steps) {
      if (!Array.isArray(s.svgLabels) || s.svgLabels.length === 0) {
        s.svgLabels = [
          `STEP ${s.stepNumber} // 핵심 구조`,
          s.title.slice(0, 26),
          proto.materials?.[0]?.name || '자연 재료',
          `[${proto.protocolId} 도면]`,
        ];
      }
    }
  }

  /**
   * 6대 글로벌 타겟 언어(EN, JA, ES, DE, PT, zh-TW) 번역본 및 도면 라벨(svgLabels) 병렬 자동 생성
   */
  public static async generateTranslations(
    apiKey: string,
    master: Protocol,
    deadlineAt?: number
  ): Promise<Record<'en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW', Protocol>> {
    const localeSpecs: Array<{ code: 'en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW'; persona: string }> = [
      { code: 'en', persona: 'English (Clear, plain, everyday practical survival guide for beginners)' },
      { code: 'ja', persona: 'Japanese (初心者でも直感的にすぐ理解できる、平易でわかりやすい実用サバイバルガイド)' },
      { code: 'es', persona: 'Spanish (Español claro, sencillo y práctico, fácil de entender para cualquier persona)' },
      { code: 'de', persona: 'German (Klare, einfache und leicht verständliche Alltagssprache ohne komplizierten Fachjargon)' },
      { code: 'pt', persona: 'Portuguese (Português claro, simples e direto, fácil de entender na prática)' },
      { code: 'zh-TW', persona: 'Traditional Chinese (繁體中文，淺顯易懂、直白實用的日常求生指南，避免生僻術語)' },
    ];

    const settled = await Promise.allSettled(
      localeSpecs.map(async ({ code, persona }) => {
        const prompt = `Translate the following primitive survival protocol JSON into ${persona}.
Rules:
1. Maintain all exact JSON keys, protocolId, category, threatLevel, material IDs, stepNumber, and svgFileName.
2. Use simple, clear, everyday words that a beginner can understand immediately in an emergency. Avoid overly academic or pretentious military jargon.
3. If "svgLabels" array is present inside each step of "steps", translate every label string in "svgLabels" into short, clear, easy-to-read labels in ${code} while keeping the EXACT same array length and index order. Keep numbers and units (mm, cm, °C, °, kg, %) intact.
4. Return valid JSON only:\n${JSON.stringify(master, null, 2)}`;

        const raw = await callGeminiApi(apiKey, 'gemini-3.8-flash', prompt, {
          responseMimeType: 'application/json',
          timeoutMs: 40000,
          maxRetries: 2,
          deadlineAt,
        });
        return [code, JSON.parse(raw) as Protocol] as const;
      })
    );

    const entries: Array<readonly ['en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW', Protocol]> = [];
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        entries.push(item.value);
      } else {
        console.warn(`[generateTranslations] 개별 언어 번역 지연/건너뜀: ${item.reason}`);
      }
    }

    return Object.fromEntries(entries) as Record<'en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW', Protocol>;
  }

  /**
   * 3단계별 테크니컬 벡터 SVG 도면 병렬 자동 생성(Promise.all), svgLabels 동기화 및 파일 저장
   */
  public static async generateAndSaveSvgs(
    apiKey: string,
    protocol: Protocol,
    svgsDir: string = path.join(getRootDir(), 'content/svgs'),
    deadlineAt?: number
  ): Promise<string[]> {
    fs.mkdirSync(svgsDir, { recursive: true });
    this.ensurePlannedSvgLabels(protocol);

    const savedFiles = await Promise.all(
      protocol.steps.map(async (step) => {
        const fileName = step.svgFileName;
        const planned = step.svgLabels && step.svgLabels.length > 0 ? [...step.svgLabels] : undefined;
        const rawSvgCode = await SvgGeneratorService.generateStepSvg(
          apiKey,
          protocol.title,
          step.stepNumber,
          step.title,
          step.description,
          { actionNote: step.actionNote, svgLabels: planned, deadlineAt }
        );
        const syncedSvgCode = planned
          ? SvgAuditService.enforcePlannedSvgLabels(rawSvgCode, planned)
          : rawSvgCode;
        fs.writeFileSync(path.join(svgsDir, fileName), syncedSvgCode, 'utf-8');
        step.svgLabels = SvgAuditService.extractSvgTextLabels(syncedSvgCode);
        return fileName;
      })
    );

    return savedFiles;
  }

  /**
   * 병렬 생성된 다국어 번역본의 svgLabels 배열 길이를 실제 생성된 SVG <text> 태그 개수와 100% 일치하도록 정렬
   */
  private static alignTranslatedSvgLabels(
    master: Protocol,
    translations: Record<string, Protocol>
  ): void {
    for (const [langCode, localized] of Object.entries(translations)) {
      if (!localized || !Array.isArray(localized.steps)) continue;
      for (let i = 0; i < master.steps.length; i++) {
        const masterLabels = master.steps[i]?.svgLabels || [];
        const targetStep = localized.steps[i];
        if (!targetStep) continue;
        const currentLabels = Array.isArray(targetStep.svgLabels) ? [...targetStep.svgLabels] : [];
        if (currentLabels.length > masterLabels.length) {
          targetStep.svgLabels = currentLabels.slice(0, masterLabels.length);
        } else if (currentLabels.length < masterLabels.length) {
          while (currentLabels.length < masterLabels.length) {
            const fallbackIdx = currentLabels.length;
            currentLabels.push(`STEP ${master.steps[i].stepNumber} (${langCode.toUpperCase()} #${fallbackIdx + 1})`);
          }
          targetStep.svgLabels = currentLabels;
        }
      }
    }
  }

  /**
   * 신규 프로토콜 완전 자동 생성 파이프라인 (로컬 & 서버리스 겸용)
   * - [Wave 1]: 한국어 마스터 본문 기획 및 고증 검증
   * - [Wave 2]: 3단계 SVG 도면(Promise.all) + 6개국어 번역(Promise.all) 완전 동시 병렬 실행
   * - [Wave 3]: 정적 웹 빌드 및 GitHub/Vercel 자동 배포
   */
  public static async generateNewProtocol(options: GenerateProtocolOptions): Promise<PipelineExecutionResult> {
    const { apiKey, triggerDeploy = true, dryRun = false, githubToken, deadlineMs = 260_000, onProgress } = options;
    const deadlineAt = Date.now() + deadlineMs;
    const protocols = this.listProtocols();
    const nextNum = this.getNextProtocolNumber(protocols);
    const nextId = `PR-${String(nextNum).padStart(2, '0')}`;

    const topic = options.topic || `원시 환경에서의 ${options.category || '도구'} 제작 및 생존 기술`;

    console.log(`🚀 [신규 생성 시작] ${nextId}: "${topic}"`);
    await onProgress?.(
      `⏳ [1/4] 한국어 마스터 본문 설계 중...\n• ID: ${nextId}\n• 주제: "${topic}"\n• Gemini 3.8 Flash 고증 검증 진행 중`
    );

    // [Wave 1] 본문 생성 및 고증 검증
    const protocol = await this.generateProtocolContent(apiKey, topic, nextId, options.category, deadlineAt);

    if (dryRun) {
      return {
        success: true,
        protocol,
        message: `[Dry Run] 프로토콜 ${nextId} 생성 검증 완료`,
      };
    }

    const { workDir, isServerless } = this.prepareWritableWorkspace();
    try {
      const svgsDir = path.join(workDir, 'content/svgs');

      await onProgress?.(
        `🎨 [2/4] 본문 완료! 도면 3종 + 6개국어 동시 병렬 생성 중...\n• 확정 제목: ${protocol.title}\n• Step 01~03 벡터 도면(병렬) & 6개국어 번역(병렬) 동시 처리 중`
      );

      // [Wave 2] 3단계 SVG 도면 생성(병렬) + 6개국어 번역(병렬)을 동시에 실행하여 대기 시간 절반 이상 단축
      console.log(`⚡ [병렬 Wave 2] 3단계 SVG 도면 + 6개국어 번역 동시 실행 중...`);
      const [, translations] = await Promise.all([
        this.generateAndSaveSvgs(apiKey, protocol, svgsDir, deadlineAt),
        this.generateTranslations(apiKey, protocol, deadlineAt).catch((e) => {
          console.warn(`[다국어 생성 건너뜀] 번역 중 오류: ${e}`);
          return {} as Record<'en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW', Protocol>;
        }),
      ]);

      // SVG 실제 <text> 라벨 개수와 다국어 svgLabels 배열 길이 100% 정합성 맞춤
      this.alignTranslatedSvgLabels(protocol, translations);

      const missingLocales = TARGET_LOCALE_CODES.filter((code) => !translations[code]);

      if (!protocol.createdAt) {
        protocol.createdAt = new Date().toISOString();
      }
      for (const localizedProto of Object.values(translations)) {
        if (localizedProto) {
          localizedProto.createdAt = protocol.createdAt;
        }
      }

      // 3. 마스터 JSON 및 다국어 JSON 저장
      const fileSlug = `${String(nextNum).padStart(2, '0')}-${protocol.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')}.json`;
      const masterPath = path.join(workDir, 'content/protocols', fileSlug);
      fs.writeFileSync(masterPath, JSON.stringify(protocol, null, 2), 'utf-8');

      const localesDir = path.join(workDir, 'content/protocols/locales');
      fs.mkdirSync(localesDir, { recursive: true });
      const baseSlug = fileSlug.replace('.json', '');
      for (const [langCode, localizedProto] of Object.entries(translations)) {
        fs.writeFileSync(
          path.join(localesDir, `${baseSlug}.${langCode}.json`),
          JSON.stringify(localizedProto, null, 2),
          'utf-8'
        );
      }

      await onProgress?.(
        `🚀 [3/4] 도면 및 다국어 완료! 사이트 빌드 & 배포 중...\n• 제목: ${protocol.title}\n• 정적 HTML/PWA 컴파일 및 GitHub/Vercel 푸시 진행 중`
      );

      // [Wave 3] 사이트 빌드 & Git Push
      console.log(`🔨 [빌드 파이프라인] 전체 정적 웹 및 PWA 오프라인 캐시 재컴파일...`);
      await buildSite({ rootDir: workDir, silent: isServerless });

      let deployResult;
      if (triggerDeploy) {
        console.log(`🚀 [배포] Git 커밋 및 origin/main 푸시...`);
        const files = isServerless ? DeployService.collectWorkspaceFiles(workDir) : undefined;
        deployResult = await DeployService.commitAndPush(
          `feat(protocol): autonomous publication of ${nextId} ${protocol.title}`,
          { cwd: workDir, githubToken, files }
        );
        if (!deployResult.success) {
          throw new Error(`사이트 빌드는 완료되었으나 GitHub 원격 배포에 실패했습니다: ${deployResult.error}`);
        }
      }

      const liveUrl = `${SITE_META.siteUrl}/protocol-${String(nextNum).padStart(2, '0')}`;

      return {
        success: true,
        protocol,
        message: `프로토콜 ${nextId} (${protocol.title}) 발행 및 배포 완료!`,
        missingLocales: missingLocales.length > 0 ? missingLocales : undefined,
        deployResult,
        liveUrl,
      };
    } finally {
      this.cleanupWorkspace(workDir, isServerless);
    }
  }

  /**
   * 기존 프로토콜 AI 수정 파이프라인 (로컬 & 서버리스 겸용)
   */
  public static async editExistingProtocol(options: EditProtocolOptions): Promise<PipelineExecutionResult> {
    const {
      apiKey,
      protocolId,
      instructions,
      regenerateSvgs = false,
      regenerateLocales = true,
      triggerDeploy = true,
      dryRun = false,
      githubToken,
      deadlineMs = 260_000,
      onProgress,
    } = options;
    const deadlineAt = Date.now() + deadlineMs;

    const existingInfo = this.getProtocolById(protocolId);
    if (!existingInfo) {
      throw new Error(`프로토콜 '${protocolId}'을(를) 찾을 수 없습니다.`);
    }

    const { data: currentProto } = existingInfo;

    console.log(`✏️ [프로토콜 수정 시작] ${currentProto.protocolId}: "${instructions}"`);
    await onProgress?.(
      `⏳ [1/3] 프로토콜 ${currentProto.protocolId} 본문 AI 수정 중...\n• 지침: "${instructions}"`
    );

    const prompt = `
당신은 실전 야생 생존 가이드(SURVIVAL PROTOCOL)의 편집자입니다.
기존 프로토콜 JSON을 검토하고 사용자의 지침에 따라 수정하십시오.

[기존 프로토콜 JSON]:
${JSON.stringify(currentProto, null, 2)}

[수정 지침]:
${instructions}

[필수 수칙]:
1. 현대 공산품 일체 배제(고증 100% 원시 자연물 유지).
2. 어려운 한자어나 전문용어, 오글거리는 표현을 쓰지 말고 누구나 쉽게 이해할 수 있는 일상적인 한국어로 작성할 것.
3. protocolId(${currentProto.protocolId}) 및 steps 수(3개) 구조 유지.
4. 반드시 유효한 전체 JSON 코드로만 응답하십시오.
`.trim();

    const raw = await callGeminiApi(apiKey, 'gemini-3.8-flash', prompt, {
      responseMimeType: 'application/json',
      temperature: 0.2,
      timeoutMs: 45000,
      deadlineAt,
    });

    const updatedProto: Protocol = JSON.parse(raw);
    this.ensurePlannedSvgLabels(updatedProto);
    const validation = this.validateProtocol(updatedProto);
    if (!validation.valid) {
      throw new Error(`수정된 프로토콜이 유효성 검사를 통과하지 못했습니다:\n${validation.errors.join('\n')}`);
    }

    if (dryRun) {
      return {
        success: true,
        protocol: updatedProto,
        message: `[Dry Run] 프로토콜 ${currentProto.protocolId} 수정 검증 완료`,
      };
    }

    const { workDir, isServerless } = this.prepareWritableWorkspace();
    try {
      const targetInfo = this.getProtocolById(protocolId, path.join(workDir, 'content/protocols'))!;
      const filePath = targetInfo.filePath;
      const deletedPaths: string[] = [];

      await onProgress?.(
        `🌐 [2/3] 본문 수정 완료! 다국어 번역${regenerateSvgs ? ' 및 SVG 도면' : ''} 병렬 동기화 중...`
      );

      const [, translations] = await Promise.all([
        regenerateSvgs
          ? this.generateAndSaveSvgs(apiKey, updatedProto, path.join(workDir, 'content/svgs'), deadlineAt)
          : Promise.resolve([]),
        regenerateLocales
          ? this.generateTranslations(apiKey, updatedProto, deadlineAt).catch((e) => {
              console.warn(`[다국어 동기화 건너뜀]: ${e}`);
              return {} as Record<'en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW', Protocol>;
            })
          : Promise.resolve({} as Record<'en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW', Protocol>),
      ]);

      this.alignTranslatedSvgLabels(updatedProto, translations);

      // 최종 수정 일시 자동 갱신 및 다국어 로케일 동기화
      updatedProto.updatedAt = new Date().toISOString();
      for (const localizedProto of Object.values(translations)) {
        if (localizedProto) {
          localizedProto.updatedAt = updatedProto.updatedAt;
        }
      }

      // 마스터 파일 갱신 (svgLabels 및 updatedAt 포함)
      fs.writeFileSync(filePath, JSON.stringify(updatedProto, null, 2), 'utf-8');

      let missingLocales: string[] = [];
      if (regenerateLocales) {
        const localesDir = path.join(workDir, 'content/protocols/locales');
        fs.mkdirSync(localesDir, { recursive: true });
        const baseName = path.basename(filePath, '.json');

        for (const langCode of TARGET_LOCALE_CODES) {
          const locFilePath = path.join(localesDir, `${baseName}.${langCode}.json`);
          const localizedProto = translations[langCode];
          if (localizedProto) {
            fs.writeFileSync(locFilePath, JSON.stringify(localizedProto, null, 2), 'utf-8');
          } else {
            missingLocales.push(langCode);
            // 번역 실패 시 구버전 Stale 파일이 남아 화면 불일치를 일으키지 않도록 제거
            if (fs.existsSync(locFilePath)) {
              fs.unlinkSync(locFilePath);
              deletedPaths.push(`content/protocols/locales/${baseName}.${langCode}.json`);
            }
          }
        }
      }

      await onProgress?.(`🚀 [3/3] 사이트 재빌드 및 GitHub/Vercel 배포 진행 중...`);

      // 사이트 빌드
      console.log(`🔨 [빌드 파이프라인] 사이트 재컴파일...`);
      await buildSite({ rootDir: workDir, silent: isServerless });

      // Git Push & Vercel 배포
      let deployResult;
      if (triggerDeploy) {
        console.log(`🚀 [배포] Git 커밋 및 origin/main 푸시...`);
        const files = isServerless ? DeployService.collectWorkspaceFiles(workDir) : undefined;
        deployResult = await DeployService.commitAndPush(
          `fix(protocol): AI update ${updatedProto.protocolId} per instruction: ${instructions.slice(0, 50)}`,
          { cwd: workDir, githubToken, files, deletedPaths: deletedPaths.length > 0 ? deletedPaths : undefined }
        );
        if (!deployResult.success) {
          throw new Error(`사이트 빌드는 완료되었으나 GitHub 원격 배포에 실패했습니다: ${deployResult.error}`);
        }
      }

      const num = updatedProto.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
      const liveUrl = `${SITE_META.siteUrl}/protocol-${num}`;

      return {
        success: true,
        protocol: updatedProto,
        message: `프로토콜 ${updatedProto.protocolId} 수정 및 재배포 완료!`,
        missingLocales: missingLocales.length > 0 ? missingLocales : undefined,
        deployResult,
        liveUrl,
      };
    } finally {
      this.cleanupWorkspace(workDir, isServerless);
    }
  }

  /**
   * 특정 프로토콜의 인프라 상태(도면 실존 여부, 다국어 번역 여부 등) 상세 조회
   */
  public static getProtocolDetails(protocolId: string) {
    const found = this.getProtocolById(protocolId);
    if (!found) return null;

    const { data, filePath } = found;
    const svgsDir = path.join(getRootDir(), 'content/svgs');
    const localesDir = path.join(getRootDir(), 'content/protocols/locales');
    const baseSlug = path.basename(filePath, '.json');

    const stepsStatus = data.steps.map((s) => {
      const svgPath = path.join(svgsDir, s.svgFileName);
      const exists = fs.existsSync(svgPath);
      const size = exists ? fs.statSync(svgPath).size : 0;
      const svgContent = exists ? fs.readFileSync(svgPath, 'utf-8') : '';
      const auditReport = exists
        ? SvgAuditService.auditSvgStatic(svgContent, {
            topicTitle: data.title,
            stepNumber: s.stepNumber,
            stepTitle: s.title,
            actionDescription: s.description,
            actionNote: s.actionNote,
          })
        : null;
      return {
        stepNumber: s.stepNumber,
        title: s.title,
        svgFileName: s.svgFileName,
        exists,
        size,
        auditReport,
      };
    });

    const localeCodes = ['en', 'ja', 'es', 'de', 'pt', 'zh-TW'] as const;
    const locales: Record<(typeof localeCodes)[number], boolean> = {
      en: fs.existsSync(path.join(localesDir, `${baseSlug}.en.json`)),
      ja: fs.existsSync(path.join(localesDir, `${baseSlug}.ja.json`)),
      es: fs.existsSync(path.join(localesDir, `${baseSlug}.es.json`)),
      de: fs.existsSync(path.join(localesDir, `${baseSlug}.de.json`)),
      pt: fs.existsSync(path.join(localesDir, `${baseSlug}.pt.json`)),
      'zh-TW': fs.existsSync(path.join(localesDir, `${baseSlug}.zh-TW.json`)),
    };

    return {
      data,
      filePath,
      baseSlug,
      stepsStatus,
      locales,
    };
  }

  /**
   * 현재 발행된 프로토콜 현황을 분석하여 미개척 카테고리의 차기 유망 프로토콜 후보들을 동적 추천
   */
  public static getRecommendedTopics(): {
    nextId: string;
    candidates: Array<{
      index: number;
      category: ProtocolCategory;
      title: string;
      domain: string;
      urgency: string;
    }>;
  } {
    const published = this.listProtocols();
    const nextNum = this.getNextProtocolNumber(published);
    const nextId = `PR-${String(nextNum).padStart(2, '0')}`;
    const publishedCategories = new Set(published.map((p) => p.category));
    const publishedTitles = published.map((p) => p.title);

    const curriculum: Array<{
      category: ProtocolCategory;
      title: string;
      domain: string;
      urgency: string;
    }> = [
      {
        category: 'SHELTER',
        title: '불 없이 체온을 지키는 낙엽 움막 만드는 법',
        domain: '추위 막기 & 움막 짓기 (SHELTER)',
        urgency: '필수 생존 (저체온증 예방)',
      },
      {
        category: 'TOOLS',
        title: '돌과 돌을 부딪쳐 날카로운 돌칼 만드는 법',
        domain: '도구 만들기 (TOOLS)',
        urgency: '중요 (기본 자르기 도구 확보)',
      },
      {
        category: 'MEDICINE',
        title: '소나무 송진과 숯가루로 상처 소독·지혈 연고 만드는 법',
        domain: '응급 처치 & 상처 치료 (MEDICINE)',
        urgency: '필수 생존 (상처 감염 방지)',
      },
      {
        category: 'FOOD',
        title: '나뭇가지 3개로 돌멩이 사냥 덫(4자 덫) 놓는 법',
        domain: '식량 구하기 (FOOD)',
        urgency: '중요 (힘 안 들이고 사냥하기)',
      },
      {
        category: 'TOOLS',
        title: '나무껍질과 풀줄기를 꼬아 끊어지지 않는 밧줄 만드는 법',
        domain: '도구 & 묶기 기술 (TOOLS)',
        urgency: '중요 (움막·도구 묶기용 끈)',
      },
      {
        category: 'WATER',
        title: '물 없는 땅에서 햇빛과 나뭇잎으로 식수 모으는 법',
        domain: '물 구하기 (WATER)',
        urgency: '필수 생존 (물 없는 곳에서 수분 확보)',
      },
    ];

    const available = curriculum.filter(
      (item) =>
        !publishedTitles.some(
          (t) =>
            t.includes(item.title.slice(0, 6)) ||
            (item.category === 'SHELTER' && (t.includes('데브리') || t.includes('낙엽 움막')))
        )
    );

    // 아직 발행되지 않은 카테고리를 최우선 정렬
    available.sort((a, b) => {
      const aMissing = publishedCategories.has(a.category) ? 1 : 0;
      const bMissing = publishedCategories.has(b.category) ? 1 : 0;
      return aMissing - bMissing;
    });

    const selected = (available.length > 0 ? available : curriculum).slice(0, 3).map((item, idx) => ({
      index: idx,
      ...item,
    }));

    return { nextId, candidates: selected };
  }

  /**
   * 프로토콜을 안전하게 격리 보관소(_archived_shells/)로 이동하고 사이트 재배포
   */
  public static async archiveProtocol(
    protocolId: string,
    options: { triggerDeploy?: boolean; dryRun?: boolean; githubToken?: string } = {}
  ): Promise<{ success: boolean; message: string; protocolId: string }> {
    const found = this.getProtocolById(protocolId);
    if (!found) {
      throw new Error(`프로토콜 [${protocolId}]을 찾을 수 없습니다.`);
    }

    if (options.dryRun) {
      return { success: true, message: `[Dry Run] 프로토콜 ${protocolId} 아카이브 시뮬레이션 완료`, protocolId };
    }

    const { workDir, isServerless } = this.prepareWritableWorkspace();
    try {
      const targetInfo = this.getProtocolById(protocolId, path.join(workDir, 'content/protocols'))!;
      const archiveDir = path.join(workDir, 'content/protocols/_archived_shells');
      fs.mkdirSync(archiveDir, { recursive: true });

      const deletedPaths: string[] = [];
      const baseFileName = path.basename(targetInfo.filePath);
      const baseSlug = path.basename(targetInfo.filePath, '.json');
      const protoNum = targetInfo.data.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');

      // 1. 마스터 JSON 이동
      const destJson = path.join(archiveDir, baseFileName);
      fs.renameSync(targetInfo.filePath, destJson);
      deletedPaths.push(`content/protocols/${baseFileName}`);

      // 2. 관련 6개국어 번역 파일 이동
      const localesDir = path.join(workDir, 'content/protocols/locales');
      for (const code of TARGET_LOCALE_CODES) {
        const locFile = path.join(localesDir, `${baseSlug}.${code}.json`);
        if (fs.existsSync(locFile)) {
          fs.renameSync(locFile, path.join(archiveDir, `${baseSlug}.${code}.json`));
          deletedPaths.push(`content/protocols/locales/${baseSlug}.${code}.json`);
        }
      }

      // 2-1. 기존 빌드된 public/protocol-NN.html 좀비 파일 제거
      const compiledHtmlFile = `protocol-${protoNum}.html`;
      const compiledHtmlPath = path.join(workDir, 'public', compiledHtmlFile);
      if (fs.existsSync(compiledHtmlPath)) {
        fs.unlinkSync(compiledHtmlPath);
      }
      deletedPaths.push(`public/${compiledHtmlFile}`);

      // 3. 사이트 재컴파일 & 배포
      await buildSite({ rootDir: workDir, silent: true });
      if (options.triggerDeploy) {
        const files = isServerless ? DeployService.collectWorkspaceFiles(workDir) : undefined;
        const deployResult = await DeployService.commitAndPush(
          `chore(protocol): archive ${targetInfo.data.protocolId} (${targetInfo.data.title})`,
          { cwd: workDir, githubToken: options.githubToken, files, deletedPaths }
        );
        if (!deployResult.success) {
          throw new Error(`사이트 재컴파일은 완료되었으나 GitHub 원격 배포에 실패했습니다: ${deployResult.error}`);
        }
      }

      return {
        success: true,
        message: `프로토콜 [${targetInfo.data.protocolId}]이 보관소로 안전하게 격리 이동되었습니다.`,
        protocolId: targetInfo.data.protocolId,
      };
    } finally {
      this.cleanupWorkspace(workDir, isServerless);
    }
  }

  /**
   * Stitch MCP를 통해 정밀 벡터 도면 화면을 생성하기 위한 최적화 프롬프트 명세서 생성
   */
  public static generateStitchPrompt(topicOrId: string): string {
    let topic = topicOrId.trim();
    const existing = this.getProtocolById(topic);
    if (existing) {
      topic = existing.data.title;
    }

    return `You are designing a detailed survival protocol screen for '${topic}'.
Aesthetic: Utilitarian Brutalism, Pure Dark Mode (background #131313, cards #1c1b1b, borders #333333, text #F5F5F5, brand-red #E02424).
Fonts: Space Grotesk (title), Chivo (body), JetBrains Mono (labels/code).
Rules:
- Strict 100% dark mode only. NO theme switcher button, NO language switcher buttons.
- Header must strictly have: '[■ 생존 교범] / [분과] > [ID]' on left, no right-side OFFLINE READY badge.
- Hero Section: 4-corner brackets, title, summary with left white border, 4-column spec strip (소요 시간 | 생존율 | 난이도 | 시간당 산출).
- Materials: 3 checkbox items with interactive counter '0/3 SECURED'.
- Procedure: 3 distinct sequential steps.
- VITAL REQUIREMENT: Each step MUST include an inline, highly detailed technical monoline vector <svg viewBox="0 0 680 340"> schematic blueprint (FIG. 01, FIG. 02, FIG. 03) illustrating dimensions, force vectors, cutaway profiles, and physical mechanics.
- Fatal Mistake: High-contrast red container [치명적 경고 // FATAL ERROR] detailing death mechanism.
- Bottom Sticky Bar: [← 전체 목차] on left | [다음 프로토콜 →] on right (justify-between, NO offline save or share buttons).`;
  }
}
