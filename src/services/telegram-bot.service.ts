import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.ts';
import { ProtocolGeneratorService } from './protocol-generator.service.ts';
import { DeployService } from './deploy.service.ts';
import { TopicCuratorService } from './topic-curator.service.ts';
import { buildSite } from '../pipeline.ts';
import { SITE_META } from '../site.config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}

export interface ITelegramApiClient {
  getMe(): Promise<{ ok: boolean; result?: { id: number; username: string }; description?: string; error_code?: number }>;
  sendMessage(
    chatId: string | number,
    text: string,
    options?: { parse_mode?: string; reply_markup?: TelegramInlineKeyboard }
  ): Promise<{ ok: boolean; result?: any; description?: string }>;
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<{ ok: boolean }>;
  getUpdates(offset?: number, timeout?: number): Promise<{ ok: boolean; result: TelegramUpdate[]; description?: string }>;
}

/**
 * Node.js Native fetch 기반 텔레그램 공식 REST API 클라이언트
 */
export class DefaultTelegramApiClient implements ITelegramApiClient {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  private async request(method: string, body?: any): Promise<any> {
    const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  public async getMe() {
    return this.request('getMe');
  }

  public async sendMessage(
    chatId: string | number,
    text: string,
    options: { parse_mode?: string; reply_markup?: TelegramInlineKeyboard } = {}
  ) {
    return this.request('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode,
      reply_markup: options.reply_markup,
    });
  }

  public async answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.request('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
    });
  }

  public async getUpdates(offset?: number, timeout: number = 30) {
    return this.request('getUpdates', {
      offset,
      timeout,
    });
  }
}

export interface ParsedCommand {
  command: string;
  args: string;
  rawText: string;
}

/**
 * [Service Layer]
 * 텔레그램 원격 제어 고도화 봇 서비스
 * (인라인 키보드 매트릭스, 차기 주제 1-클릭 추천/생성, 통계 대시보드, 콜백 핸들러 완비)
 */
export class TelegramBotService {
  private client: ITelegramApiClient;
  private allowedChatId: string;
  private geminiApiKey: string;
  private isPolling: boolean = false;
  private lastUpdateId: number = 0;

  constructor(options: {
    client?: ITelegramApiClient;
    botToken?: string;
    allowedChatId?: string;
    geminiApiKey?: string;
  } = {}) {
    this.allowedChatId = (options.allowedChatId ?? CONFIG.telegram.chatId ?? '').trim();
    this.geminiApiKey = (options.geminiApiKey ?? CONFIG.geminiApiKey ?? '').trim();

    if (options.client) {
      this.client = options.client;
    } else {
      const token = (options.botToken ?? CONFIG.telegram.botToken ?? '').trim();
      this.client = new DefaultTelegramApiClient(token);
    }
  }

  /**
   * 순수 텍스트에서 텔레그램 커맨드 파싱 (테스터블 순수 함수)
   */
  public static parseCommand(text: string): ParsedCommand {
    const trimmed = (text || '').trim();
    if (!trimmed.startsWith('/')) {
      return { command: '', args: trimmed, rawText: trimmed };
    }

    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) {
      return {
        command: trimmed.toLowerCase().split('@')[0],
        args: '',
        rawText: trimmed,
      };
    }

    return {
      command: trimmed.slice(0, spaceIdx).toLowerCase().split('@')[0],
      args: trimmed.slice(spaceIdx + 1).trim(),
      rawText: trimmed,
    };
  }

  /**
   * 메인 인라인 키보드 메뉴
   */
  public static getMainKeyboard(): TelegramInlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '📖 프로토콜 목록', callback_data: 'cb:list' },
          { text: '💡 차기 주제 추천', callback_data: 'cb:recommend' },
        ],
        [
          { text: '📊 시스템 통계', callback_data: 'cb:stats' },
          { text: '🔨 즉시 재빌드 & 배포', callback_data: 'cb:build' },
        ],
        [
          { text: '🌐 라이브 웹사이트 열기', url: SITE_META.siteUrl },
        ],
      ],
    };
  }

  /**
   * 단일 메시지 처리 및 라우팅 (비즈니스 로직)
   */
  public async handleMessage(
    chatId: number | string,
    text: string
  ): Promise<{ text: string; parse_mode?: string; reply_markup?: TelegramInlineKeyboard }> {
    // 1. 보안 인가 확인
    if (this.allowedChatId && String(chatId) !== this.allowedChatId) {
      return { text: '⛔ [비인가 접근 차단] 승인되지 않은 사용자 ID입니다.' };
    }

    const parsed = TelegramBotService.parseCommand(text);

    switch (parsed.command) {
      case '/start':
      case '/help':
        return {
          text: this.renderHelpMessage(),
          parse_mode: 'HTML',
          reply_markup: TelegramBotService.getMainKeyboard(),
        };

      case '/list': {
        const res = this.renderListResponse();
        return { text: res.text, parse_mode: 'HTML', reply_markup: res.reply_markup };
      }

      case '/view':
        return { text: this.renderViewMessage(parsed.args), parse_mode: 'HTML', reply_markup: this.getViewKeyboard(parsed.args) };

      case '/status':
        return { text: this.renderStatusMessage(), parse_mode: 'HTML' };

      case '/stats':
        return { text: this.renderStatsMessage(), parse_mode: 'HTML' };

      case '/recommend':
        return await this.handleRecommendCommand(chatId);

      case '/stitch':
        return { text: this.handleStitchCommand(parsed.args), parse_mode: 'HTML' };

      case '/archive':
        return { text: await this.handleArchiveCommand(parsed.args, chatId), parse_mode: 'HTML' };

      case '/build':
      case '/deploy':
        return { text: await this.handleDeployCommand(), parse_mode: 'HTML' };

      case '/generate':
      case '/new':
        return { text: await this.handleGenerateCommand(parsed.args, chatId), parse_mode: 'HTML' };

      case '/edit':
        return { text: await this.handleEditCommand(parsed.args, chatId), parse_mode: 'HTML' };

      default:
        return {
          text: `❓ 알 수 없는 명령어입니다: <code>${parsed.command}</code>\n사용 가능한 전술 명령어를 확인하려면 /help 를 입력하세요.`,
          parse_mode: 'HTML',
          reply_markup: TelegramBotService.getMainKeyboard(),
        };
    }
  }

  /**
   * 콜백 쿼리(버튼 터치) 처리
   */
  public async handleCallbackQuery(query: NonNullable<TelegramUpdate['callback_query']>): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    if (this.allowedChatId && String(chatId) !== this.allowedChatId) {
      await this.client.answerCallbackQuery(query.id, '비인가 사용자입니다.');
      return;
    }

    await this.client.answerCallbackQuery(query.id);

    const data = query.data || '';
    if (data === 'cb:list') {
      const res = this.renderListResponse();
      await this.client.sendMessage(chatId, res.text, {
        parse_mode: 'HTML',
        reply_markup: res.reply_markup,
      });
    } else if (data.startsWith('cb:view:')) {
      const protoId = data.replace('cb:view:', '');
      const text = this.renderViewMessage(protoId);
      await this.client.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: this.getViewKeyboard(protoId),
      });
    } else if (data.startsWith('cb:arch:')) {
      const protoId = data.replace('cb:arch:', '');
      await this.client.sendMessage(chatId, `📦 프로토콜 [${protoId}] 격리 보관 및 배포를 진행합니다...`);
      const res = await this.handleArchiveCommand(protoId, chatId);
      await this.client.sendMessage(chatId, res, { parse_mode: 'HTML' });
    } else if (data.startsWith('cb:stitch:')) {
      const protoId = data.replace('cb:stitch:', '');
      const text = this.handleStitchCommand(protoId);
      await this.client.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } else if (data === 'cb:recommend') {
      const res = await this.handleRecommendCommand(chatId);
      await this.client.sendMessage(chatId, res.text, {
        parse_mode: res.parse_mode,
        reply_markup: res.reply_markup,
      });
    } else if (data === 'cb:stats') {
      const res = this.renderStatsMessage();
      await this.client.sendMessage(chatId, res, { parse_mode: 'HTML' });
    } else if (data === 'cb:build') {
      await this.client.sendMessage(chatId, '⚙️ 즉시 재컴파일 및 Vercel 배포를 시작합니다...');
      const res = await this.handleDeployCommand();
      await this.client.sendMessage(chatId, res, { parse_mode: 'HTML' });
    } else if (data.startsWith('cb:gen:')) {
      const topic = decodeURIComponent(data.replace('cb:gen:', ''));
      await this.client.sendMessage(chatId, `🚀 추천 주제 [${topic}] 자율 생성을 시작합니다!`);
      const res = await this.handleGenerateCommand(topic, chatId);
      await this.client.sendMessage(chatId, res, { parse_mode: 'HTML' });
    }
  }

  private renderHelpMessage(): string {
    return `⚔️ <b>[생존 교범 // SURVIVAL PROTOCOL] 전술 원격 제어 봇 v2.0</b>

인류 멸망 후 원시 생존 교범을 스마트폰에서 자율 기획·생성·수정·배포하는 통제실입니다.

<b>📌 전술 명령어 목록:</b>
• 📖 <code>/list</code> - 현재 발행된 프로토콜 목록 및 1-터치 상세 조회
• 🔍 <code>/view [PR-NN]</code> - 프로토콜 제원/도면/번역 상태 정밀 감사
• 💡 <code>/recommend</code> - 지식 트리 기반 차기 유망 프로토콜 1-클릭 추천
• 🎨 <code>/stitch [주제/ID]</code> - Stitch MCP 화면 생성용 프롬프트 명세서 발급
• 🚀 <code>/generate [주제]</code> - 신규 프로토콜 자율 생성 (도면+번역+배포)
• ✏️ <code>/edit [PR-NN] [지침]</code> - 기존 프로토콜 AI 수정 및 재배포
• 📦 <code>/archive [PR-NN]</code> - 프로토콜을 보관소로 격리 이동 및 재배포
• 📊 <code>/stats</code> - 6대 도메인, SVG 도면, 번역 통계 대시보드
• 🔨 <code>/build</code> - 정적 웹 & PWA 즉시 빌드 및 Vercel 배포
• 📡 <code>/status</code> - 라이브 배포 URL 및 Git HEAD 커밋 확인
• ℹ️ <code>/help</code> - 본 가이드 및 빠른 버튼 메뉴 출력

<i>💡 아래 빠른 버튼을 터치하거나 명령어를 직접 입력하십시오.</i>`;
  }

  private renderListResponse(): { text: string; reply_markup?: TelegramInlineKeyboard } {
    const protocols = ProtocolGeneratorService.listProtocols();
    if (protocols.length === 0) {
      return { text: '📭 등록된 생존 프로토콜이 없습니다.' };
    }

    const lines = protocols.map((p) => {
      const num = p.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
      return `<b>[${p.protocolId}]</b> <code>[${p.category}]</code> ${p.title}\n🔗 <a href="${SITE_META.siteUrl}/protocol-${num}">${SITE_META.siteUrl}/protocol-${num}</a>`;
    });

    const buttons: TelegramInlineButton[][] = [];
    for (let i = 0; i < protocols.length; i += 2) {
      const row: TelegramInlineButton[] = [];
      const p1 = protocols[i];
      row.push({ text: `🔍 ${p1.protocolId} 상세`, callback_data: `cb:view:${p1.protocolId}` });
      if (i + 1 < protocols.length) {
        const p2 = protocols[i + 1];
        row.push({ text: `🔍 ${p2.protocolId} 상세`, callback_data: `cb:view:${p2.protocolId}` });
      }
      buttons.push(row);
    }

    buttons.push([
      { text: '💡 차기 주제 추천', callback_data: 'cb:recommend' },
      { text: '📊 전체 통계', callback_data: 'cb:stats' },
    ]);

    return {
      text: `📑 <b>[생존 교범 라이브 목록]</b> (총 ${protocols.length}편 완전체 가동 중)\n\n` + lines.join('\n\n'),
      reply_markup: { inline_keyboard: buttons },
    };
  }

  public renderListMessage(): string {
    return this.renderListResponse().text;
  }

  public renderViewMessage(protocolId: string): string {
    if (!protocolId) {
      return '⚠️ 조회할 프로토콜 ID를 입력하세요. 예: <code>/view PR-01</code>';
    }

    const details = ProtocolGeneratorService.getProtocolDetails(protocolId);
    if (!details) {
      return `❌ 프로토콜 [${protocolId}]을 찾을 수 없습니다. /list 로 목록을 확인하세요.`;
    }

    const { data, stepsStatus, locales } = details;
    const num = data.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');

    const stepsText = stepsStatus
      .map((s) => {
        const statusIcon = s.exists ? `✓ (${(s.size / 1024).toFixed(1)}KB)` : '⚠️ 누락';
        return `  • <b>Step ${s.stepNumber}</b>: ${s.title}\n    └ 도면: <code>${s.svgFileName}</code> [${statusIcon}]`;
      })
      .join('\n');

    const materialsText = data.materials
      .map((m, idx) => `  ${idx + 1}. <b>${m.name}</b>: ${m.desc}`)
      .join('\n');

    return `🛡️ <b>[프로토콜 전술 제원표 // ${data.protocolId}]</b>

<b>제목:</b> ${data.title}
<b>분과:</b> <code>[${data.category}]</code> | <b>위협도:</b> ${data.threatLevel}
<b>요약:</b> ${data.summary}

<b>📐 4열 핵심 제원:</b>
• 소요 시간: <code>${data.timeRequired}</code>
• 생존율: <code>${data.successRate}</code>
• 난이도: <code>${data.difficulty}</code>
• 시간당 산출: <code>${data.outputPerHour || 'N/A'}</code>

<b>🎒 필수 생존 물자 (MATERIALS):</b>
${materialsText}

<b>📐 3단계 실행 지침 및 벡터 도면:</b>
${stepsText}

<b>⚠️ 치명적 경고 (FATAL ERROR):</b>
• <b>${data.fatalMistake.title}</b>
  └ ${data.fatalMistake.description}

<b>🌐 다국어 번역 상태:</b>
• 영어 (EN): ${locales.en ? '✓ 완비' : '❌ 누락'}
• 일본어 (JA): ${locales.ja ? '✓ 완비' : '❌ 누락'}

🔗 <b>라이브:</b> <a href="${SITE_META.siteUrl}/protocol-${num}">${SITE_META.siteUrl}/protocol-${num}</a>`;
  }

  private getViewKeyboard(protocolId: string): TelegramInlineKeyboard {
    const cleanId = protocolId.toUpperCase().replace(/\s+/g, '');
    const num = cleanId.replace(/[^0-9]/g, '').padStart(2, '0');
    return {
      inline_keyboard: [
        [
          { text: '🌐 웹에서 열기', url: `${SITE_META.siteUrl}/protocol-${num}` },
          { text: '🎨 Stitch 프롬프트', callback_data: `cb:stitch:${cleanId}` },
        ],
        [
          { text: '📦 보관소로 격리(삭제)', callback_data: `cb:arch:${cleanId}` },
          { text: '📖 전체 목록으로', callback_data: 'cb:list' },
        ],
      ],
    };
  }

  private async handleArchiveCommand(protocolId: string, chatId: number | string): Promise<string> {
    if (!protocolId) {
      return '⚠️ 보관할 프로토콜 ID를 입력하세요. 예: <code>/archive PR-02</code>';
    }

    try {
      const res = await ProtocolGeneratorService.archiveProtocol(protocolId, { triggerDeploy: true });
      return `✅ <b>[격리 보관 완료]</b>\n${res.message}\n사이트가 재컴파일되어 Vercel에 반영되었습니다.`;
    } catch (e: any) {
      return `❌ 보관 처리 실패: ${e.message || String(e)}`;
    }
  }

  private handleStitchCommand(topicOrId: string): string {
    const prompt = ProtocolGeneratorService.generateStitchPrompt(topicOrId || 'PR-03 소나무 송진 상처 치료');
    return `🎨 <b>[Stitch 생성 프롬프트 명세서]</b>

아래 프롬프트를 복사하여 Stitch MCP 도구에 입력하시면, 정밀 모노라인 벡터 SVG 도면(FIG. 01~03)이 완비된 브루탈리즘 야전 교범 화면이 자동 생성됩니다:

<code>${prompt}</code>`;
  }

  private renderStatusMessage(): string {
    const commit = DeployService.getCurrentCommit();
    const protocols = ProtocolGeneratorService.listProtocols();

    return `📡 <b>[시스템 및 배포 상태]</b>
• <b>라이브 URL:</b> <a href="${SITE_META.siteUrl}">${SITE_META.siteUrl}</a>
• <b>총 프로토콜:</b> ${protocols.length}편 (Stitch 벡터 도면 및 번역 완비)
• <b>최신 커밋:</b> <code>${commit.hash}</code>
• <b>커밋 메시지:</b> ${commit.message}
• <b>PWA 오프라인:</b> 활성화 (100% 영구 보존 캐시)`;
  }

  private renderStatsMessage(): string {
    const protocols = ProtocolGeneratorService.listProtocols();
    const catCounts: Record<string, number> = {};
    for (const p of protocols) {
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    }

    const svgsDir = path.join(rootDir, 'content/svgs');
    const svgCount = fs.existsSync(svgsDir) ? fs.readdirSync(svgsDir).filter((f) => f.endsWith('.svg')).length : 0;

    const localesDir = path.join(rootDir, 'content/protocols/locales');
    const localeCount = fs.existsSync(localesDir) ? fs.readdirSync(localesDir).filter((f) => f.endsWith('.json')).length : 0;

    return `📊 <b>[생존 교범 인프라 통계 대시보드]</b>

<b>🏷️ 6대 도메인별 프로토콜 분포:</b>
• 💧 식수 확보 (WATER): ${catCounts['WATER'] || 0}편
• 🔥 불 피우기 (FIRE): ${catCounts['FIRE'] || 0}편
• 🏕️ 은신처 구축 (SHELTER): ${catCounts['SHELTER'] || 0}편
• 🪓 원시 도구 (TOOLS): ${catCounts['TOOLS'] || 0}편
• 🌿 식량 채집 (FOOD): ${catCounts['FOOD'] || 0}편
• 🧪 야전 의약 (MEDICINE): ${catCounts['MEDICINE'] || 0}편
──────────────────
<b>📦 총 발행 프로토콜:</b> ${protocols.length}편
<b>🎨 정밀 테크니컬 벡터 SVG:</b> ${svgCount}종
<b>🌐 다국어 번역 데이터셋:</b> ${localeCount}종 (KO/EN/JA)
<b>📶 PWA 오프라인 사전 캐시:</b> 가동 중`;
  }

  private async handleRecommendCommand(
    chatId: number | string
  ): Promise<{ text: string; parse_mode?: string; reply_markup?: TelegramInlineKeyboard }> {
    const nextTopicFile = path.join(rootDir, 'NEXT_TOPIC_PROMPT.md');
    let title = '4자 트리거 낙석 덫 제작법 (중력 트랩)';
    let domain = '수렵 & 단백질 획득 공학';
    let urgency = 'CRITICAL (Tier 1)';

    if (fs.existsSync(nextTopicFile)) {
      const content = fs.readFileSync(nextTopicFile, 'utf-8');
      const titleMatch = content.match(/다음 생존 프로토콜 기획서:\s*([^\n]+)/);
      if (titleMatch) title = titleMatch[1];
      const domainMatch = content.match(/도메인:\s*([^\n]+)/);
      if (domainMatch) domain = domainMatch[1];
      const urgencyMatch = content.match(/위급도:\s*([^\n]+)/);
      if (urgencyMatch) urgency = urgencyMatch[1];
    }

    const replyMarkup: TelegramInlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '🚀 이 주제로 즉시 자율 발행 & 배포',
            callback_data: `cb:gen:${encodeURIComponent(title.slice(0, 30))}`,
          },
        ],
      ],
    };

    const text = `🎯 <b>[차기 프론티어 프로토콜 추천]</b>

• <b>추천 주제:</b> <code>${title}</code>
• <b>지식 도메인:</b> ${domain}
• <b>위급도:</b> ${urgency}

지식 트리에 기록된 다음 미개척 프로토콜입니다.
아래 버튼을 누르시면 <b>고증 검증 ➔ 3단계 SVG 도면 ➔ EN/JA 번역 ➔ Vercel 라이브 배포</b>까지 완전 무인으로 가동됩니다.`;

    return { text, parse_mode: 'HTML', reply_markup: replyMarkup };
  }

  private async handleDeployCommand(): Promise<string> {
    try {
      await buildSite({ silent: true });
      const deploy = await DeployService.commitAndPush('chore: manual rebuild and deploy via telegram bot');
      if (deploy.success) {
        return `✅ <b>[배포 완료]</b> 최신 빌드가 Vercel에 반영되었습니다!\nCommit: <code>${deploy.commitHash}</code>\nURL: <a href="${SITE_META.siteUrl}">${SITE_META.siteUrl}</a>`;
      }
      return `⚠️ 빌드는 완료되었으나 푸시 실패: ${deploy.error}`;
    } catch (e) {
      return `❌ 빌드 중 오류 발생: ${e}`;
    }
  }

  private async handleGenerateCommand(topic: string, chatId: number | string): Promise<string> {
    if (!this.geminiApiKey) {
      return '❌ GEMINI_API_KEY가 설정되어 있지 않습니다.';
    }

    await this.client.sendMessage(
      chatId,
      `⚙️ <b>[프로토콜 생성 파이프라인 가동]</b>\n주제: "<code>${topic || '자율 추천'}</code>"\n- 100% 원시 고증 검증\n- 3단계 정밀 벡터 SVG 도면 생성\n- 다국어(EN, JA) 번역본 합성\n- Git Push & Vercel 배포\n\n잠시만 기다려 주십시오...`,
      { parse_mode: 'HTML' }
    );

    try {
      const result = await ProtocolGeneratorService.generateNewProtocol({
        apiKey: this.geminiApiKey,
        topic: topic || undefined,
        triggerDeploy: true,
      });

      return `🎉 <b>[신규 프로토콜 발행 & 배포 성공!]</b>\n\n<b>ID:</b> ${result.protocol?.protocolId}\n<b>제목:</b> ${result.protocol?.title}\n<b>카테고리:</b> ${result.protocol?.category}\n\n🌐 <a href="${result.liveUrl}">라이브 페이지 열기</a>`;
    } catch (e: any) {
      return `❌ 프로토콜 생성 실패:\n${e.message || String(e)}`;
    }
  }

  private async handleEditCommand(args: string, chatId: number | string): Promise<string> {
    if (!this.geminiApiKey) {
      return '❌ GEMINI_API_KEY가 설정되어 있지 않습니다.';
    }

    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) {
      return '⚠️ <b>형식 오류!</b> 다음과 같이 입력하세요:\n<code>/edit [PR-NN] [수정할 내용]</code>\n예: <code>/edit PR-01 숯가루 채집 방법을 더 자세히 적어줘</code>';
    }

    const protocolId = parts[0];
    const instructions = parts.slice(1).join(' ');

    await this.client.sendMessage(
      chatId,
      `⚙️ <b>[프로토콜 AI 수정 파이프라인 가동]</b>\n대상: <code>${protocolId}</code>\n수정 지침: "${instructions}"\n- 고증 검증 및 JSON 갱신\n- 다국어 번역 동기화\n- 사이트 재컴파일 & Vercel 배포 진행 중...`,
      { parse_mode: 'HTML' }
    );

    try {
      const result = await ProtocolGeneratorService.editExistingProtocol({
        apiKey: this.geminiApiKey,
        protocolId,
        instructions,
        triggerDeploy: true,
      });

      return `🎉 <b>[프로토콜 수정 & 배포 완료!]</b>\n\n<b>ID:</b> ${result.protocol?.protocolId}\n<b>제목:</b> ${result.protocol?.title}\n\n🌐 <a href="${result.liveUrl}">라이브 페이지 열기</a>`;
    } catch (e: any) {
      return `❌ 프로토콜 수정 실패:\n${e.message || String(e)}`;
    }
  }

  /**
   * 백그라운드 롱 폴링 루프 시작 (메시지 및 콜백 쿼리 동시 처리)
   */
  public async startPolling(): Promise<void> {
    this.isPolling = true;
    console.log('🤖 [Telegram Bot] 고도화 원격 제어 봇 데몬이 시작되었습니다.');

    while (this.isPolling) {
      try {
        const response = await this.client.getUpdates(this.lastUpdateId + 1, 30);
        if (response.ok && Array.isArray(response.result)) {
          for (const update of response.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);

            // 1. 일반 메시지 처리
            if (update.message && update.message.text) {
              const reply = await this.handleMessage(update.message.chat.id, update.message.text);
              await this.client.sendMessage(update.message.chat.id, reply.text, {
                parse_mode: reply.parse_mode,
                reply_markup: reply.reply_markup,
              });
            }

            // 2. 인라인 버튼 콜백 쿼리 처리
            if (update.callback_query) {
              await this.handleCallbackQuery(update.callback_query);
            }
          }
        }
      } catch (err: any) {
        if (!this.isPolling) break;
        console.error('⚠️ [Telegram Bot Polling Error]:', err.message || err);
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  /**
   * 폴링 안전 중지
   */
  public stopPolling(): void {
    this.isPolling = false;
    console.log('🛑 [Telegram Bot] 봇 데몬이 중지되었습니다.');
  }
}
