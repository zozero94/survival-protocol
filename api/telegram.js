import { TelegramBotService, WebhookContextService, ProtocolGeneratorService } from '../dist/services/index.js';
import { ensureContentAvailable } from '../dist/content-bundle.js';

/**
 * [Vercel Cloud Serverless Function]
 * POST /api/telegram - 24/7 무중단 텔레그램 봇 웹훅 엔드포인트
 * GET  /api/telegram - 클라우드 웹훅 헬스체크 엔드포인트
 */
export default async function handler(req, res) {
  try {
    ensureContentAvailable();

    // 1. 헬스체크 (GET)
    if (req.method === 'GET') {
      const protocols = ProtocolGeneratorService.listProtocols();
      return res.status(200).json({
        ok: true,
        service: 'SURVIVAL PROTOCOL Telegram Tactical Webhook',
        mode: 'Vercel Cloud Serverless (24/7 Active)',
        protocolsCount: protocols.length,
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    // 2. 런타임 컨텍스트 해석 (환경변수 우선 + 암호화된 Webhook URL ctx 파라미터 병합)
    let ctxParam = req.query?.ctx;
    if (!ctxParam && req.url) {
      try {
        const parsedUrl = new URL(req.url, 'https://survival-protocol.com');
        ctxParam = parsedUrl.searchParams.get('ctx') || undefined;
      } catch {}
    }

    const decrypted = ctxParam ? WebhookContextService.decryptContext(String(ctxParam)) : null;

    const botToken = (process.env.TELEGRAM_BOT_TOKEN || decrypted?.botToken || '').trim();
    const chatId = (process.env.TELEGRAM_CHAT_ID || decrypted?.chatId || '').trim();
    const geminiApiKey = (process.env.GEMINI_API_KEY || decrypted?.geminiApiKey || '').trim();
    const githubToken = (process.env.GITHUB_TOKEN || decrypted?.githubToken || '').trim();

    if (!botToken) {
      return res.status(401).json({ ok: false, error: 'Unauthorized: Missing bot token context' });
    }

    // 3. Telegram 공식 Secret Token 헤더 검증 (설정되어 있는 경우)
    const incomingSecret = req.headers?.['x-telegram-bot-api-secret-token'];
    if (incomingSecret) {
      const expectedSecret = WebhookContextService.generateSecretToken(botToken);
      if (incomingSecret !== expectedSecret) {
        return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid secret token' });
      }
    }

    // 4. Update 페이로드 파싱
    let update = req.body;
    if (typeof update === 'string' && update.trim()) {
      try {
        update = JSON.parse(update);
      } catch {
        return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
      }
    }

    if (!update || typeof update !== 'object') {
      return res.status(200).json({ ok: true, skipped: true });
    }

    // 5. 봇 서비스 실행 및 업데이트 처리
    const bot = new TelegramBotService({
      botToken,
      allowedChatId: chatId,
      geminiApiKey,
      githubToken,
    });

    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ [Telegram Serverless Webhook Error]:', err);
    // Telegram 서버의 무한 재시도(Retry Loop)를 방지하기 위해 에러 로깅 후 200 반환
    return res.status(200).json({ ok: false, handledError: true });
  }
}
