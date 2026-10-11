import { execSync } from 'child_process';
import { CONFIG } from './config.ts';
import { DefaultTelegramApiClient, WebhookContextService } from './services/index.ts';
import { SITE_META } from './site.config.ts';

function resolveLocalGitHubToken(): string {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  try {
    const cred = execSync('printf "protocol=https\\nhost=github.com\\n\\n" | git credential fill', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const match = cred.match(/password=(.+)/);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

async function main() {
  const action = (process.argv[2] || 'set').toLowerCase();
  const botToken = CONFIG.telegram.botToken;
  const chatId = CONFIG.telegram.chatId;
  const geminiApiKey = CONFIG.geminiApiKey;

  if (!botToken) {
    console.error('❌ [오류] TELEGRAM_BOT_TOKEN이 .env에 설정되어 있지 않습니다.');
    process.exit(1);
  }

  const client = new DefaultTelegramApiClient(botToken);

  if (action === 'info' || action === 'status') {
    const info = await client.getWebhookInfo();
    const maskedUrl = info.result?.url
      ? String(info.result.url).replace(/(\?ctx=)[^&]+/, '$1[ENCRYPTED_AES256_CTX]')
      : '(설정 안 됨 - 로컬 폴링 모드)';
    console.log('📡 [Telegram Webhook 상태]');
    console.log(`• 등록된 URL: ${maskedUrl}`);
    console.log(`• 대기 중인 업데이트: ${info.result?.pending_update_count ?? 0}건`);
    if (info.result?.last_error_message) {
      console.log(`• 최근 에러: ${info.result.last_error_message}`);
    }
    return;
  }

  if (action === 'delete' || action === 'local') {
    const res = await client.deleteWebhook(false);
    console.log('🛑 [Webhook 해제 완료]:', res.description || 'OK');
    console.log('👉 이제 npm run bot 으로 로컬 폴링 모드를 사용할 수 있습니다.');
    return;
  }

  // 기본 액션: set (Vercel 클라우드 서버리스 웹훅 등록)
  const githubToken = resolveLocalGitHubToken();
  const encryptedCtx = WebhookContextService.encryptContext({
    botToken,
    chatId,
    geminiApiKey,
    githubToken,
  });
  const secretToken = WebhookContextService.generateSecretToken(botToken);

  const webhookUrl = `${SITE_META.siteUrl}/api/telegram?ctx=${encryptedCtx}`;

  console.log('☁️ [Vercel Cloud Serverless Webhook 등록 중...]');
  const setRes = await client.setWebhook(webhookUrl, {
    secret_token: secretToken,
    drop_pending_updates: true,
  });

  if (!setRes.ok) {
    console.error('❌ [Webhook 등록 실패]:', setRes.description);
    process.exit(1);
  }

  const info = await client.getWebhookInfo();
  console.log('✅ [24/7 무중단 클라우드 웹훅 활성화 완료!]');
  console.log(`• 엔드포인트: ${SITE_META.siteUrl}/api/telegram?ctx=[AES-256-GCM ENCRYPTED]`);
  console.log(`• 보안 헤더: X-Telegram-Bot-Api-Secret-Token 검증 활성화`);
  console.log(`• GitHub 원격 배포 토큰: ${githubToken ? '연동 완료 (클라우드 수정/발행 가능)' : '미연동 (조회 전용)'}`);
  console.log(`• 대기 업데이트: ${info.result?.pending_update_count ?? 0}건`);
  console.log('\n🎉 이제 맥북이나 npm을 완전히 꺼도 24시간 언제 어디서나 텔레그램 봇이 즉시 응답합니다!');
}

main().catch((err) => {
  console.error('❌ [오류]:', err);
  process.exit(1);
});
