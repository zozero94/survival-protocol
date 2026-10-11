import crypto from 'crypto';

                                       
                   
                 
                       
                       
 

const DEFAULT_SALT = 'survival-protocol-tactical-webhook-v2-salt';
const DEFAULT_PASSPHRASE = 'survival-protocol-zero-dependency-cipher-key-2026';

/**
 * [Service Layer]
 * 텔레그램 서버리스 웹훅(Vercel Serverless)을 위한 무상태(Stateless) 암호화 컨텍스트 코덱
 * - GitHub 저장소에 평문 API 키를 일절 노출하지 않고,
 * - 오직 Telegram 공식 서버와 Webhook 엔드포인트 간에만 AES-256-GCM 암호화 페이로드 및 Secret Token으로 인증/복호화 수행
 */
export class WebhookContextService {
          static deriveKey(passphrase         = DEFAULT_PASSPHRASE)         {
    return crypto.scryptSync(passphrase, DEFAULT_SALT, 32);
  }

  /**
   * 런타임 설정을 AES-256-GCM으로 암호화하여 URL-safe base64url 문자열로 반환
   */
         static encryptContext(config                      , passphrase         )         {
    const key = this.deriveKey(passphrase);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // 키 이름을 축약하여 URL 길이를 최소화
    const compact = JSON.stringify({
      b: config.botToken,
      c: config.chatId,
      g: config.geminiApiKey,
      h: config.githubToken || '',
    });

    const encrypted = Buffer.concat([cipher.update(compact, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 포맷: iv(12B) + authTag(16B) + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64url');
  }

  /**
   * URL-safe base64url 암호문을 복호화하여 런타임 설정 객체로 복원
   */
         static decryptContext(token        , passphrase         )                              {
    try {
      if (!token || typeof token !== 'string') return null;
      const combined = Buffer.from(token, 'base64url');
      if (combined.length < 29) return null;

      const iv = combined.subarray(0, 12);
      const authTag = combined.subarray(12, 28);
      const ciphertext = combined.subarray(28);

      const key = this.deriveKey(passphrase);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
      const parsed = JSON.parse(decrypted);

      if (!parsed.b) return null;

      return {
        botToken: String(parsed.b),
        chatId: String(parsed.c || ''),
        geminiApiKey: String(parsed.g || ''),
        githubToken: parsed.h ? String(parsed.h) : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Telegram X-Telegram-Bot-Api-Secret-Token 헤더용 결정론적 32자 보안 토큰 생성
   * (영문자, 숫자, 언더스코어, 하이픈만 허용되는 Telegram 스펙 준수)
   */
         static generateSecretToken(botToken        , passphrase         = DEFAULT_PASSPHRASE)         {
    return crypto
      .createHmac('sha256', passphrase)
      .update(`tg-webhook-secret:${botToken.trim()}`)
      .digest('hex')
      .slice(0, 32);
  }
}
