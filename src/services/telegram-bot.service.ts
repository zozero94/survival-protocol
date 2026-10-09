import { CONFIG } from '../config.ts';
import { ProtocolGeneratorService } from './protocol-generator.service.ts';
import { DeployService } from './deploy.service.ts';
import { buildSite } from '../pipeline.ts';

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
}

export interface ITelegramApiClient {
  getMe(): Promise<{ ok: boolean; result?: { id: number; username: string }; description?: string; error_code?: number }>;
  sendMessage(chatId: string | number, text: string, options?: { parse_mode?: string }): Promise<{ ok: boolean; result?: any; description?: string }>;
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

  public async sendMessage(chatId: string | number, text: string, options: { parse_mode?: string } = {}) {
    return this.request('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode,
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
 * 텔레그램 원격 제어 봇 서비스 (원격 프로토콜 발행, AI 수정, 라이브 배포 및 모니터링)
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
        command: trimmed.toLowerCase().split('@')[0], // @bot_name 접미사 제거
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
   * 단일 메시지 처리 및 라우팅 (비즈니스 로직)
   */
  public async handleMessage(chatId: number | string, text: string): Promise<string> {
    // 1. 보안 인가 확인 (allowedChatId가 지정되어 있을 경우)
    if (this.allowedChatId && String(chatId) !== this.allowedChatId) {
      return '⛔ [비인가 접근 차단] 승인되지 않은 사용자 ID입니다.';
    }

    const parsed = TelegramBotService.parseCommand(text);

    switch (parsed.command) {
      case '/start':
      case '/help':
        return this.renderHelpMessage();

      case '/list':
        return this.renderListMessage();

      case '/status':
        return this.renderStatusMessage();

      case '/build':
      case '/deploy':
        return await this.handleDeployCommand();

      case '/generate':
      case '/new':
        return await this.handleGenerateCommand(parsed.args, chatId);

      case '/edit':
        return await this.handleEditCommand(parsed.args, chatId);

      default:
        return `❓ 알 수 없는 명령어입니다: "${parsed.command}"\n사용 가능한 명령어를 보려면 /help 를 입력하세요.`;
    }
  }

  private renderHelpMessage(): string {
    return `⚔️ [생존 교범 // SURVIVAL PROTOCOL] 전술 원격 제어 봇

사용 가능한 전술 명령어:
📖 /list - 현재 발행된 7대 프로토콜 목록 및 상태
🚀 /generate [주제] - 신규 프로토콜 자율 생성 (도면+번역+배포)
✏️ /edit [PR-NN] [수정사항] - 기존 프로토콜 AI 수정 및 재배포
🔨 /build - 정적 웹 & PWA 즉시 빌드 및 Vercel 배포
📡 /status - 라이브 사이트 상태 및 Git HEAD 확인
ℹ️ /help - 도움말 출력

💡 사용 예시:
- /generate 원시 쐐기풀 섬유로 밧줄 꼬기
- /edit PR-01 재료에 숯가루 500g 추가하고 설명 더 상세하게 수정해줘
- /edit PR-02 밑판 나뭇가지 규격을 명확히 해줘`;
  }

  private renderListMessage(): string {
    const protocols = ProtocolGeneratorService.listProtocols();
    if (protocols.length === 0) {
      return '📭 등록된 생존 프로토콜이 없습니다.';
    }

    const lines = protocols.map((p) => {
      const num = p.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
      return `[${p.protocolId}] (${p.category}) ${p.title}\n🔗 https://survival-protocol-kappa.vercel.app/protocol-${num}.html`;
    });

    return `📑 [생존 교범 라이브 목록] (총 ${protocols.length}편)\n\n` + lines.join('\n\n');
  }

  private renderStatusMessage(): string {
    const commit = DeployService.getCurrentCommit();
    const protocols = ProtocolGeneratorService.listProtocols();

    return `📡 [시스템 및 배포 상태]
• 라이브 URL: https://survival-protocol-kappa.vercel.app/
• 총 프로토콜 수: ${protocols.length}편
• 최신 커밋 해시: ${commit.hash}
• 최신 커밋 메시지: ${commit.message}
• PWA 오프라인 캐시: 활성화 (전 페이지 영구 보존)`;
  }

  private async handleDeployCommand(): Promise<string> {
    try {
      await buildSite({ silent: true });
      const deploy = await DeployService.commitAndPush('chore: manual rebuild and deploy via telegram bot');
      if (deploy.success) {
        return `✅ [배포 완료] 최신 빌드가 Vercel에 반영되었습니다!\nCommit: ${deploy.commitHash}\nURL: https://survival-protocol-kappa.vercel.app/`;
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

    // 작업 진행 안내 선발송
    await this.client.sendMessage(
      chatId,
      `⚙️ [프로토콜 생성 파이프라인 가동]\n주제: "${topic || '자율 추천'}"\n- 100% 원시 고증 검증\n- 3단계 정밀 벡터 SVG 도면 생성\n- 다국어(EN, JA) 번역본 합성\n- Git Push & Vercel 배포\n\n잠시만 기다려 주십시오...`
    );

    try {
      const result = await ProtocolGeneratorService.generateNewProtocol({
        apiKey: this.geminiApiKey,
        topic: topic || undefined,
        triggerDeploy: true,
      });

      return `🎉 [신규 프로토콜 발행 & 배포 성공!]\n\nID: ${result.protocol?.protocolId}\n제목: ${result.protocol?.title}\n카테고리: ${result.protocol?.category}\n\n🌐 라이브 확인:\n${result.liveUrl}`;
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
      return '⚠️ 형식 오류! 다음과 같이 입력하세요:\n/edit [PR-NN] [수정할 내용]\n예: /edit PR-01 숯가루 채집 방법을 더 자세히 적어줘';
    }

    const protocolId = parts[0];
    const instructions = parts.slice(1).join(' ');

    await this.client.sendMessage(
      chatId,
      `⚙️ [프로토콜 AI 수정 파이프라인 가동]\n대상: ${protocolId}\n수정 요구사항: "${instructions}"\n- 고증 검증 및 JSON 갱신\n- 다국어 번역 동기화\n- 사이트 재컴파일 & Vercel 배포 진행 중...`
    );

    try {
      const result = await ProtocolGeneratorService.editExistingProtocol({
        apiKey: this.geminiApiKey,
        protocolId,
        instructions,
        triggerDeploy: true,
      });

      return `🎉 [프로토콜 수정 & 배포 완료!]\n\nID: ${result.protocol?.protocolId}\n제목: ${result.protocol?.title}\n\n🌐 라이브 확인:\n${result.liveUrl}`;
    } catch (e: any) {
      return `❌ 프로토콜 수정 실패:\n${e.message || String(e)}`;
    }
  }

  /**
   * 백그라운드 롱 폴링 루프 시작
   */
  public async startPolling(): Promise<void> {
    this.isPolling = true;
    console.log('🤖 [Telegram Bot] 원격 제어 봇 데몬이 시작되었습니다.');

    while (this.isPolling) {
      try {
        const response = await this.client.getUpdates(this.lastUpdateId + 1, 30);
        if (response.ok && Array.isArray(response.result)) {
          for (const update of response.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            if (update.message && update.message.text) {
              const reply = await this.handleMessage(update.message.chat.id, update.message.text);
              await this.client.sendMessage(update.message.chat.id, reply);
            }
          }
        }
      } catch (err: any) {
        if (!this.isPolling) break;
        console.error('⚠️ [Telegram Bot Polling Error]:', err.message || err);
        // 오류 발생 시 5초 대기 후 재시도
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
