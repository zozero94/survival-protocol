import { CONFIG } from './config.ts';
import { TelegramBotService, DefaultTelegramApiClient } from './services/index.ts';

async function main() {
  console.log('===========================================================');
  console.log('🤖 [생존 교범 // SURVIVAL PROTOCOL] 텔레그램 원격 제어 봇');
  console.log('===========================================================\n');

  const token = CONFIG.telegram.botToken;
  const chatId = CONFIG.telegram.chatId;

  if (!token) {
    console.error('❌ [오류] TELEGRAM_BOT_TOKEN이 .env 파일에 설정되어 있지 않습니다.');
    console.error('👉 .env 파일에 다음 설정을 추가하십시오:');
    console.error('   TELEGRAM_BOT_TOKEN="your_bot_token_here"');
    console.error('   TELEGRAM_CHAT_ID="your_telegram_chat_id"\n');
    process.exit(1);
  }

  const client = new DefaultTelegramApiClient(token);
  try {
    const me = await client.getMe();
    if (!me.ok) {
      console.error(`❌ [오류] 텔레그램 토큰 검증 실패 (${me.error_code || '401'}): ${me.description || 'Unauthorized'}`);
      console.error('👉 BotFather에서 발급받은 올바른 봇 토큰을 .env에 입력해 주십시오.\n');
      process.exit(1);
    }
    console.log(`✅ [인증 성공] 봇 계정: @${me.result?.username} (ID: ${me.result?.id})`);
  } catch (e: any) {
    console.error('❌ [연결 실패] 텔레그램 API 서버와 통신할 수 없습니다:', e.message || e);
    process.exit(1);
  }

  if (chatId) {
    console.log(`🔒 [보안 설정] 승인된 전술 Chat ID: ${chatId} (비인가 접근 차단 활성화)`);
  } else {
    console.warn(`⚠️ [경고] TELEGRAM_CHAT_ID가 설정되지 않아 모든 대화방의 명령을 수신합니다.`);
  }

  const bot = new TelegramBotService({
    client,
    allowedChatId: chatId,
    geminiApiKey: CONFIG.geminiApiKey,
  });

  // 안전 종료(Graceful Shutdown) 처리
  const shutdown = () => {
    console.log('\n🛑 봇 종료 신호(SIGINT/SIGTERM) 수신. 안전하게 종료합니다...');
    bot.stopPolling();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('🚀 봇 폴링 데몬 가동 중... (명령어 대기: /help, /list, /generate, /edit, /build, /status)\n');
  await bot.startPolling();
}

main().catch((err) => {
  console.error('❌ [치명적 오류]', err);
  process.exit(1);
});
