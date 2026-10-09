import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TelegramBotService, type ITelegramApiClient, type TelegramUpdate } from '../src/services/telegram-bot.service.ts';

/**
 * 외부 통신 없는 격리형 Mock 텔레그램 클라이언트
 */
class MockTelegramApiClient implements ITelegramApiClient {
  public sentMessages: Array<{ chatId: string | number; text: string; reply_markup?: any }> = [];
  public answeredCallbacks: string[] = [];

  public async getMe() {
    return {
      ok: true,
      result: { id: 8955629850, username: 'survival_zero_bot' },
    };
  }

  public async sendMessage(chatId: string | number, text: string, options: any = {}) {
    this.sentMessages.push({ chatId, text, reply_markup: options.reply_markup });
    return { ok: true, result: { message_id: this.sentMessages.length } };
  }

  public async answerCallbackQuery(callbackQueryId: string, text?: string) {
    this.answeredCallbacks.push(callbackQueryId);
    return { ok: true };
  }

  public async getUpdates(offset?: number, timeout?: number) {
    return { ok: true, result: [] };
  }
}

describe('🤖 [Suite 7: 텔레그램 원격 제어 고도화] 커맨드 파싱, 인가 제어, 인라인 키보드 및 콜백 검증', () => {
  it('순수 커맨드 파싱 함수가 공백, 봇 멘션(@), 인자를 정확히 분리해야 한다', () => {
    const r1 = TelegramBotService.parseCommand('/generate 원시 화살촉 가공법');
    assert.strictEqual(r1.command, '/generate');
    assert.strictEqual(r1.args, '원시 화살촉 가공법');

    const r2 = TelegramBotService.parseCommand('/edit@survival_zero_bot PR-02 밑판 나뭇가지 변경');
    assert.strictEqual(r2.command, '/edit');
    assert.strictEqual(r2.args, 'PR-02 밑판 나뭇가지 변경');

    const r3 = TelegramBotService.parseCommand('/list');
    assert.strictEqual(r3.command, '/list');
    assert.strictEqual(r3.args, '');

    const r4 = TelegramBotService.parseCommand('일반 잡담 텍스트');
    assert.strictEqual(r4.command, '');
    assert.strictEqual(r4.args, '일반 잡담 텍스트');
  });

  it('비인가 사용자의 커맨드는 즉시 차단되고 실행이 거부되어야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({
      client: mockClient,
      allowedChatId: '12345678',
      geminiApiKey: 'test-key',
    });

    const attackerReply = await bot.handleMessage(99999999, '/list');
    assert.match(attackerReply.text, /비인가 접근 차단/);

    const authorizedReply = await bot.handleMessage(12345678, '/help');
    assert.match(authorizedReply.text, /생존 교범 \/\/ SURVIVAL PROTOCOL/);
    assert.ok(authorizedReply.reply_markup?.inline_keyboard?.length! > 0);
  });

  it('/help 명령 시 전술 가이드와 2열 인라인 키보드 매트릭스를 반환해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({
      client: mockClient,
      allowedChatId: '1234',
    });

    const reply = await bot.handleMessage(1234, '/help');
    assert.match(reply.text, /\/list/);
    assert.match(reply.text, /\/generate/);
    assert.match(reply.text, /\/recommend/);
    assert.match(reply.text, /\/stats/);
    assert.ok(reply.reply_markup?.inline_keyboard);
    assert.strictEqual(reply.reply_markup.inline_keyboard[0][0].text, '📖 프로토콜 목록');
  });

  it('/list 명령 시 현재 발행된 프로토콜 목록을 정확히 열거해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({ client: mockClient, allowedChatId: '1234' });

    const reply = await bot.handleMessage(1234, '/list');
    assert.match(reply.text, /PR-01/);
    assert.match(reply.text, /https:\/\/survival-protocol-kappa\.vercel\.app\/protocol-01/);
  });

  it('/stats 명령 시 6대 카테고리별 통계 및 SVG/번역 완비 현황을 반환해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({ client: mockClient, allowedChatId: '1234' });

    const reply = await bot.handleMessage(1234, '/stats');
    assert.match(reply.text, /생존 교범 인프라 통계/);
    assert.match(reply.text, /식수 확보/);
    assert.match(reply.text, /불 피우기/);
    assert.match(reply.text, /정밀 테크니컬 벡터 SVG/);
    assert.match(reply.text, /다국어 번역 데이터셋/);
  });

  it('/recommend 명령 시 차기 유망 프로토콜과 1-클릭 생성 인라인 버튼을 반환해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({ client: mockClient, allowedChatId: '1234' });

    const reply = await bot.handleMessage(1234, '/recommend');
    assert.match(reply.text, /차기 프론티어 프로토콜 추천/);
    assert.ok(reply.reply_markup?.inline_keyboard);
    assert.ok(reply.reply_markup.inline_keyboard[0][0].callback_data?.startsWith('cb:gen:'));
  });

  it('handleCallbackQuery는 버튼 클릭 이벤트에 대해 텔레그램 응답을 안전하게 처리해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({ client: mockClient, allowedChatId: '1234' });

    await bot.handleCallbackQuery({
      id: 'query-12345',
      from: { id: 1234, first_name: 'Zero' },
      message: { message_id: 1, chat: { id: 1234 } },
      data: 'cb:list',
    });

    assert.ok(mockClient.answeredCallbacks.includes('query-12345'));
    assert.ok(mockClient.sentMessages.some((m) => m.text.includes('생존 교범 라이브 목록')));
  });
});
