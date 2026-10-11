import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripTypeScriptTypes } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, '..');

/**
 * [Pipeline Serverless Builder]
 * Node.js 22 네이티브 stripTypeScriptTypes를 사용하여 외부 패키지 의존성 0개로
 * src/ 전체를 dist/ 표준 ESM(.js)으로 변환하고, Vercel Cloud Serverless Function(api/telegram.js)용
 * content/ 스냅샷 번들을 생성한다.
 */
export function buildServerlessBundle(rootDir: string = defaultRootDir, silent: boolean = false): void {
  const srcDir = path.join(rootDir, 'src');
  const distDir = path.join(rootDir, 'dist');

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const walkAndTranspile = (currentSrc: string, currentDist: string) => {
    fs.mkdirSync(currentDist, { recursive: true });
    for (const entry of fs.readdirSync(currentSrc, { withFileTypes: true })) {
      const srcPath = path.join(currentSrc, entry.name);
      if (entry.isDirectory()) {
        walkAndTranspile(srcPath, path.join(currentDist, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        const rawTs = fs.readFileSync(srcPath, 'utf-8');
        const stripped = stripTypeScriptTypes(rawTs);

        // 상대 경로 정적/동적 import 및 export의 .ts 확장자를 .js로 치환
        const jsCode = stripped.replace(
          /((?:from\s+|import\s*\(\s*)['"]\.[^'"]+)\.ts(['"])/g,
          '$1.js$2'
        );

        const outPath = path.join(currentDist, entry.name.replace(/\.ts$/, '.js'));
        fs.writeFileSync(outPath, jsCode, 'utf-8');
      }
    }
  };

  walkAndTranspile(srcDir, distDir);

  // Content 스냅샷 번들 생성 (서버리스 컨테이너에서 파일시스템 누락 시 즉시 복원용)
  const embeddedFiles: Record<string, string> = {};
  const collectContent = (relDir: string) => {
    const absDir = path.join(rootDir, relDir);
    if (!fs.existsSync(absDir)) return;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const relPath = path.posix.join(relDir, entry.name);
      const absPath = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '_archived_shells') continue;
        collectContent(relPath);
      } else if (entry.isFile()) {
        embeddedFiles[relPath] = fs.readFileSync(absPath, 'utf-8');
      }
    }
  };

  collectContent('content/protocols');
  collectContent('content/svgs');
  if (fs.existsSync(path.join(rootDir, 'NEXT_TOPIC_PROMPT.md'))) {
    embeddedFiles['NEXT_TOPIC_PROMPT.md'] = fs.readFileSync(path.join(rootDir, 'NEXT_TOPIC_PROMPT.md'), 'utf-8');
  }

  const bundleJs = `import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export const EMBEDDED_CONTENT = ${JSON.stringify(embeddedFiles)};

export function ensureContentAvailable() {
  const defaultProtocolsDir = path.join(projectRoot, 'content/protocols');
  if (fs.existsSync(defaultProtocolsDir) && fs.readdirSync(defaultProtocolsDir).some(f => f.endsWith('.json'))) {
    return projectRoot;
  }

  const fallbackRoot = path.join(os.tmpdir(), 'survival-bundled-root');
  const markerFile = path.join(fallbackRoot, '.hydrated');
  if (!fs.existsSync(markerFile)) {
    for (const [relPath, content] of Object.entries(EMBEDDED_CONTENT)) {
      const targetPath = path.join(fallbackRoot, relPath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf-8');
    }
    fs.writeFileSync(markerFile, String(Date.now()), 'utf-8');
  }
  process.env.SURVIVAL_ROOT_DIR = fallbackRoot;
  return fallbackRoot;
}
`;

  fs.writeFileSync(path.join(distDir, 'content-bundle.js'), bundleJs, 'utf-8');

  if (!silent) {
    console.log(`☁️ [Serverless Bundle] dist/ ESM 모듈 및 콘텐츠 스냅샷(${Object.keys(embeddedFiles).length}개 파일) 컴파일 완료`);
  }
}
