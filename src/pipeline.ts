import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.ts';
import type { Protocol } from './types/index.ts';
import type { SupportedLocale } from './i18n/locales.ts';
import { renderCanonicalProtocolPage } from './render.ts';
import { renderIndexPage } from './render-index.ts';
import { ShortsService, TopicCuratorService, PwaService, SeoService } from './services/index.ts';
import { EXTERNAL_RUNTIME_ASSETS, PWA_PATHS, SITE_META } from './site.config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, '..');

export interface BuildResult {
  totalProtocols: number;
  compiledPages: string[];
  cacheVersion: string;
  precacheCount: number;
}

/**
 * [Pipeline Layer]
 * Content, State, Components를 조합하여 public/ 디렉토리에 정적 웹 및 PWA 오프라인 캐시를 구축하는 핵심 빌더
 */
export async function buildSite(options: { rootDir?: string; silent?: boolean } = {}): Promise<BuildResult> {
  const root = options.rootDir || defaultRootDir;
  const log = options.silent ? () => {} : console.log;

  log('===========================================================');
  log('⚔️ [생존 교범 // SURVIVAL PROTOCOL] 빌드 파이프라인');
  log('===========================================================\n');

  // 1. Content Layer에서 전체 마스터 프로토콜 데이터셋 동적 로드
  const protocolsDir = path.join(root, 'content/protocols');
  const protocolFiles = fs
    .readdirSync(protocolsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const allMasterProtocols: Protocol[] = [];
  for (const file of protocolFiles) {
    const raw = fs.readFileSync(path.join(protocolsDir, file), 'utf-8');
    const parsed: Protocol = JSON.parse(raw);
    allMasterProtocols.push(parsed);
  }

  // 1-2. 다국어 로케일 데이터셋 동적 수집 (content/protocols/locales/*.json)
  const localesDir = path.join(root, 'content/protocols/locales');
  const localesCache: Record<string, Partial<Record<SupportedLocale, Protocol>>> = {};

  if (fs.existsSync(localesDir)) {
    const localeFiles = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));
    for (const lFile of localeFiles) {
      const parts = lFile.replace('.json', '').split('.');
      if (parts.length >= 2) {
        const lang = parts[parts.length - 1] as SupportedLocale;
        const baseName = parts.slice(0, -1).join('.');
        try {
          const parsed = JSON.parse(fs.readFileSync(path.join(localesDir, lFile), 'utf-8'));
          if (!localesCache[baseName]) localesCache[baseName] = {};
          localesCache[baseName][lang] = parsed;
        } catch (e) {}
      }
    }
  }

  log(`📂 [1/4 Content Layer] 전체 프로토콜(${allMasterProtocols.length}개) 및 다국어 로케일 캐시 로드 완료`);

  // 2. SVG 도면 로드
  const svgsMap: Record<string, string> = {};
  const svgsDir = path.join(root, 'content/svgs');
  if (fs.existsSync(svgsDir)) {
    const svgFiles = fs.readdirSync(svgsDir).filter((f) => f.endsWith('.svg'));
    for (const file of svgFiles) {
      svgsMap[file] = fs.readFileSync(path.join(svgsDir, file), 'utf-8');
    }
  }
  log(`🎨 [2/4 Content Layer] 공용 SVG 도면(${Object.keys(svgsMap).length}개) 매핑 완료`);

  const publicDir = path.join(root, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  // 3-1. 메인 인덱스 대문 피드 컴파일 (5개 카드 단위 페이징)
  const indexHtml = renderIndexPage(allMasterProtocols);
  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml, 'utf-8');
  log(`📑 [3/4 Presentational] 메인 인덱스 피드 컴파일 완료 (총 ${allMasterProtocols.length}편, 5개 페이징 탑재): public/index.html`);

  // 3-2. 프로토콜 상세 페이지 전수 컴파일 (다국어 맵 동적 자동 결합)
  const precacheEntries = [
    { url: '/index.html', content: indexHtml },
    { url: '/', content: indexHtml },
  ];
  const compiledPages: string[] = ['index.html'];

  for (let i = 0; i < allMasterProtocols.length; i++) {
    const proto = allMasterProtocols[i];
    const num = proto.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
    const fileName = `protocol-${num}.html`;
    const pMap: Partial<Record<SupportedLocale, Protocol>> = { ko: proto };

    // 프로토콜 넘버링 또는 ID에 일치하는 다국어 번역본 동적 결합
    for (const [baseKey, langObj] of Object.entries(localesCache)) {
      if (baseKey.startsWith(num) || baseKey.includes(proto.protocolId.toLowerCase())) {
        Object.assign(pMap, langObj);
      }
    }

    const nextProto = allMasterProtocols[(i + 1) % allMasterProtocols.length];
    const nextTitle = allMasterProtocols.length > 1
      ? `다음: ${nextProto.protocolId} ${nextProto.title}`
      : undefined;

    const html = renderCanonicalProtocolPage(pMap, svgsMap, 'ko', nextTitle);
    fs.writeFileSync(path.join(publicDir, fileName), html, 'utf-8');
    precacheEntries.push({ url: `/${fileName}`, content: html });
    precacheEntries.push({ url: `/protocol-${num}`, content: html });
    compiledPages.push(fileName);
  }
  log(`🌐 [3/4 Presentational] 상세 교범 웹 페이지 (${allMasterProtocols.length}개) 컴파일 완료`);

  // 4. PWA 오프라인 캐시 시스템 빌드 (Service Worker, Manifest, Icon)
  const externalUrls = [
    EXTERNAL_RUNTIME_ASSETS.tailwindCdn,
    EXTERNAL_RUNTIME_ASSETS.googleFontsCss,
  ];
  const cacheVersion = PwaService.computeCacheVersion(precacheEntries, externalUrls);
  const precacheUrls = precacheEntries.map((e) => e.url);

  const swCode = PwaService.buildServiceWorker({
    cacheVersion,
    precacheUrls,
    externalUrls,
    navigationFallback: '/index.html',
  });
  const manifestCode = PwaService.buildManifest('/index.html');
  const iconSvgCode = PwaService.buildIconSvg();

  fs.writeFileSync(path.join(publicDir, 'sw.js'), swCode, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'manifest.webmanifest'), manifestCode, 'utf-8');
  const iconsDir = path.join(publicDir, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), iconSvgCode, 'utf-8');
  log(`📶 [4/4 PWA Service] 1회 방문 오프라인 영구 보존 캐시 구축 완료 (${cacheVersion}, ${precacheUrls.length}개 경로 사전 캐시)`);

  // 5. SEO & Google AdSense 정적 파일 생성 (sitemap.xml, robots.txt, ads.txt)
  const sitemapXml = SeoService.generateSitemap(allMasterProtocols, SITE_META.siteUrl);
  const robotsTxt = SeoService.generateRobotsTxt(SITE_META.siteUrl);
  const adsTxt = SeoService.generateAdsTxt();

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'ads.txt'), adsTxt, 'utf-8');
  log(`🔍 [5/5 SEO & AdSense] sitemap.xml, robots.txt, ads.txt 생성 완료`);

  return {
    totalProtocols: allMasterProtocols.length,
    compiledPages,
    cacheVersion,
    precacheCount: precacheUrls.length,
  };
}

export async function runPipeline() {
  const buildResult = await buildSite();

  // 5. Shorts Service 실행 (OSMU)
  const protocolsDir = path.join(defaultRootDir, 'content/protocols');
  const protocolFiles = fs.readdirSync(protocolsDir).filter((f) => f.endsWith('.json')).sort();
  const rawFirst = fs.readFileSync(path.join(protocolsDir, protocolFiles[0]), 'utf-8');
  const firstProto: Protocol = JSON.parse(rawFirst);

  const shortsDir = path.join(defaultRootDir, 'shorts/01-water-purification');
  ShortsService.convertProtocolToShorts(firstProto, shortsDir);
  console.log(`🎬 [Shorts Service] 45초 유튜브 쇼츠 마스터 대본 생성 완료: shorts/01-water-purification/`);

  // 6. 다음 주제 기획 (TopicCurator Service - 자율 성장형 지식 트리 기반)
  if (CONFIG.geminiApiKey) {
    console.log('\n🌳 [Topic Curator] 문명 복원 지식 트리 기반 차기 프론티어 주제 기획...');
    const treePath = path.join(defaultRootDir, 'content/knowledge-tree.json');
    try {
      const nextPlan = await TopicCuratorService.planNextTopic(CONFIG.geminiApiKey, treePath);
      console.log(`🎯 [기획 완료] ${nextPlan.protocolId}: ${nextPlan.koreanTitle}`);
      console.log(`   └ 분과: [${nextPlan.domain} > ${nextPlan.branch}] (위급도: ${nextPlan.threatOrUrgency}, Tier ${nextPlan.tier})`);

      const nextTopicFile = path.join(defaultRootDir, 'NEXT_TOPIC_PROMPT.md');
      const nextTopicContent = `# 📌 다음 생존 프로토콜 기획서: ${nextPlan.protocolId} - ${nextPlan.koreanTitle}

- **도메인**: ${nextPlan.domain} > ${nextPlan.branch} (Tier ${nextPlan.tier})
- **위급도**: ${nextPlan.threatOrUrgency}
- **결핍 상황**: ${nextPlan.coreKnowledge.problemContext}
- **과학 원리**: ${nextPlan.coreKnowledge.scientificPrinciple}
- **투입 자연물**:
${nextPlan.coreKnowledge.naturalResources.map((r) => `  - ${r}`).join('\n')}

## 📋 3단계 도면 및 실행 지침
${nextPlan.steps
  .map(
    (s) => `### [Step ${s.stepNumber}] ${s.title}
- **실행**: ${s.actionDescription}
- **도면 초점**: ${s.drawingSubject}
`
  )
  .join('\n')}

## ⚠️ 치명적 실수 (Fatal Mistake)
- **흔한 착각**: ${nextPlan.fatalMistake.trap}
- **파국적 결과**: ${nextPlan.fatalMistake.consequence}
- **절대 수칙**: ${nextPlan.fatalMistake.rule}

## 🎨 스티치(Stitch) 생성용 마스터 프롬프트
\`\`\`text
${nextPlan.stitchMasterPrompt}
\`\`\`
`;
      fs.writeFileSync(nextTopicFile, nextTopicContent, 'utf-8');
      console.log(`💾 차기 프로토콜 스티치 명세서 갱신: NEXT_TOPIC_PROMPT.md\n`);
    } catch (e) {
      console.warn(`[TopicCurator] 다음 주제 기획 건너뜀: ${e}`);
    }
  }

  console.log('🎉 [Success] 헤더 감지 기반 다국어 핫스왑 표준 파이프라인 정상 빌드 완료!');
}

// 직접 CLI로 실행되었을 때만 파이프라인 구동
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runPipeline().catch((err) => {
    console.error('❌ 빌드 파이프라인 실패:', err);
    process.exit(1);
  });
}
