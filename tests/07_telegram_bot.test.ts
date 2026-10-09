import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TelegramBotService, type ITelegramApiClient, type TelegramUpdate } from '../src/services/telegram-bot.service.ts';

/**
 * 외부 통신 없는 격리형 Mock 텔레그램 클라이언트
 */
class MockTelegramApiClient implements ITelegramApiClient {
  public sentMessages: Array<{ chatId: string | number; text: string }> = [];

  public async getMe() {
    return {
      ok: true,
      result: { id: 987654321, username: 'test_survival_bot' },
    };
  }

  public async sendMessage(chatId: string | number, text: string) {
    this.sentMessages.push({ chatId, text });
    return { ok: true, result: { message_id: this.sentMessages.length } };
  }

  public async getUpdates(offset?: number, timeout?: number) {
    return { ok: true, result: [] };
  }
}

describe('🤖 [Suite 7: 텔레그램 원격 제어] 커맨드 파싱, 인가 제어 및 라우팅 전수 검증', () => {
  it('순수 커맨드 파싱 함수가 공백, 봇 멘션(@), 인자를 정확히 분리해야 한다', () => {
    const r1 = TelegramBotService.parseCommand('/generate 원시 화살촉 가공법');
    assert.strictEqual(r1.command, '/generate');
    assert.strictEqual(r1.args, '원시 화살촉 가공법');

    const r2 = TelegramBotService.parseCommand('/edit@survival_bot PR-02 밑판 나뭇가지 변경');
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
    assert.match(attackerReply, /비인가 접근 차단/);

    const authorizedReply = await bot.handleMessage(12345678, '/help');
    assert.match(authorizedReply, /생존 교범 \/\/ SURVIVAL PROTOCOL/);
  });

  it('/help 명령 시 전술 가이드와 명령어 목록을 반환해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({
      client: mockClient,
      allowedChatId: '',
    });

    const reply = await bot.handleMessage(1234, '/help');
    assert.match(reply, /\/list/);
    assert.match(reply, /\/generate/);
    assert.match(reply, /\/edit/);
    assert.match(reply, /\/build/);
    assert.match(reply, /\/status/);
  });

  it('/list 명령 시 현재 발행된 프로토콜 목록을 정확히 열거해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({ client: mockClient, allowedChatId: '1234' });

    const reply = await bot.handleMessage(1234, '/list');
    assert.match(reply, /PR-01/);
    assert.match(reply, /PR-02/);
    assert.match(reply, /https:\/\/survival-protocol-kappa\.vercel\.app\/protocol-/);
  });

  it('/status 명령 시 최신 Git HEAD 및 라이브 배포 URL을 포함해야 한다', async () => {
    const mockClient = new MockTelegramApiClient();
    const bot = new TelegramBotService({ client: mockClient, allowedChatId: '1234' });

    const reply = await bot.handleMessage(1234, '/status');
    assert.match(reply, /survival-protocol-kappa\.vercel\.app/);
    assert.match(reply, /총 프로토콜 수/);
    assert.match(reply, /최신 커밋/);
  });
});
