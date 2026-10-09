import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadEnv(path.resolve(__dirname, '../.env'));

export const CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  stitch: {
    projectId: process.env.STITCH_PROJECT_ID || '13694637465817419411',
    indexScreenId: process.env.STITCH_INDEX_SCREEN_ID || '975499b2fe0f412dac240ceae5b9570e',
    protocol01ScreenId: process.env.STITCH_PROTOCOL_01_SCREEN_ID || 'ba53c47b4aec4dd888189e4bb58818ae',
  }
};
