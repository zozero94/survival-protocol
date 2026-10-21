import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.ts';
import type { Protocol } from './types/index.ts';
import type { SupportedLocale } from './i18n/locales.ts';
import { SUPPORTED_LOCALES } from './i18n/locales.ts';
import { UI_STRINGS } from './i18n/ui-strings.ts';
import { renderCanonicalProtocolPage } from './render.ts';
import { renderIndexPage } from './render-index.ts';
import { ShortsService } from './services/shorts.service.ts';
import { TopicCuratorService } from './services/topic-curator.service.ts';
import { PwaService } from './services/pwa.service.ts';
import { SeoService } from './services/seo.service.ts';
import { SearchService, type SearchDocument } from './services/search.service.ts';
import { EXTERNAL_RUNTIME_ASSETS, SITE_META } from './site.config.ts';
import { resolveProtocolTimestamps } from './utils/protocol-timestamp.ts';

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
    const filePath = path.join(protocolsDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: Protocol = JSON.parse(raw);

    // 타임스탬프(createdAt, updatedAt, contentHash) 자동 감지 및 결정론적 동기화
    const timestamps = resolveProtocolTimestamps(parsed, filePath, root);
    parsed.createdAt = timestamps.createdAt;
    if (timestamps.updatedAt) {
      parsed.updatedAt = timestamps.updatedAt;
    }
    parsed.contentHash = timestamps.contentHash;

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

  // 2-2. 이미지 에셋 동기화 (content/images -> public/images)
  const contentImagesDir = path.join(root, 'content/images');
  const publicImagesDir = path.join(publicDir, 'images');
  fs.mkdirSync(publicImagesDir, { recursive: true });
  let imageCount = 0;
  if (fs.existsSync(contentImagesDir)) {
    const imgFiles = fs.readdirSync(contentImagesDir).filter((f) => f.match(/\.(png|jpe?g|webp|gif|svg)$/i));
    for (const f of imgFiles) {
      fs.copyFileSync(path.join(contentImagesDir, f), path.join(publicImagesDir, f));
      imageCount++;
    }
  }
  if (imageCount > 0) {
    log(`🖼️ [2/4 Content Layer] 이미지 에셋(${imageCount}개) public/images 복사 완료`);
  }

  // 2-3. SVG 도면 정적 에셋 동기화 (content/svgs -> public/svgs, 호버 프리뷰 썸네일 <img src> 렌더링용 명시적 width/height 보장)
  const publicSvgsDir = path.join(publicDir, 'svgs');
  fs.mkdirSync(publicSvgsDir, { recursive: true });
  for (const [svgFile, svgContent] of Object.entries(svgsMap)) {
    const normalizedSvg = svgContent.replace(/<svg\b([^>]*)>/i, (fullTag, attrs) => {
      const vbMatch = attrs.match(/viewBox=["']\s*0\s+0\s+(\d+)\s+(\d+)\s*["']/i);
      if (!vbMatch) return fullTag;
      const [, w, h] = vbMatch;
      let cleanAttrs = attrs
        .replace(/\s+width=["'][^"']*["']/gi, '')
        .replace(/\s+height=["'][^"']*["']/gi, '');
      return `<svg${cleanAttrs} width="${w}" height="${h}">`;
    });
    fs.writeFileSync(path.join(publicSvgsDir, svgFile), normalizedSvg, 'utf-8');
  }

  // 프로토콜별 7개국어 맵 사전 구성 (메인 피드 & 상세 페이지 공통 SSOT)
  const localesByProtocolId: Record<string, Partial<Record<SupportedLocale, Protocol>>> = {};
  for (const proto of allMasterProtocols) {
    const num = proto.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
    const pMap: Partial<Record<SupportedLocale, Protocol>> = { ko: JSON.parse(JSON.stringify(proto)) };
    for (const [baseKey, langObj] of Object.entries(localesCache)) {
      if (baseKey.startsWith(num) || baseKey.includes(proto.protocolId.toLowerCase())) {
        for (const [lKey, lProto] of Object.entries(langObj)) {
          const localizedClone: Protocol = JSON.parse(JSON.stringify(lProto));
          // 마스터와 동일한 등록 및 최종 수정 일시 전파 (다국어 탭 전환 시 시각적 일치 보장)
          localizedClone.createdAt = proto.createdAt;
          if (proto.updatedAt) {
            localizedClone.updatedAt = proto.updatedAt;
          }
          if (proto.contentHash) {
            localizedClone.contentHash = proto.contentHash;
          }
          pMap[lKey as SupportedLocale] = localizedClone;
        }
      }
    }
    localesByProtocolId[proto.protocolId] = pMap;
  }

  // 3-0. 검색 전용 인메모리 슬림 인덱스 구축 (7개국어 전수 자동 구성)
  const searchDocsByLocale: Record<SupportedLocale, SearchDocument[]> = {} as any;
  for (const lang of Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]) {
    const protosForLang = allMasterProtocols.map((master) => {
      return localesByProtocolId[master.protocolId]?.[lang] || master;
    });
    searchDocsByLocale[lang] = SearchService.buildSlimIndex(protosForLang, lang);
  }

  // 3-1. 메인 인덱스 대문 피드 컴파일 (최신순 기본 정렬 + 5개 카드 단위 페이징 + 7개국어 무새로고침 핫스왑)
  const sortedForFeed = [...allMasterProtocols].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    const numA = parseInt(a.protocolId.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.protocolId.replace(/\D/g, '') || '0', 10);
    if (timeB !== timeA) return timeB - timeA;
    return numB - numA;
  });
  const indexHtml = renderIndexPage(sortedForFeed, localesByProtocolId, searchDocsByLocale);
  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml, 'utf-8');
  log(`📑 [3/4 Presentational] 메인 인덱스 피드 컴파일 완료 (총 ${allMasterProtocols.length}편, 최신순 정렬, 5개 페이징 탑재): public/index.html`);

  // 3-2. 프로토콜 상세 페이지 전수 컴파일 (다국어 맵 동적 자동 결합)
  const precacheEntries = [
    { url: '/index.html', content: indexHtml },
    { url: '/', content: indexHtml },
  ];
  const compiledPages: string[] = ['index.html'];

  // 3-2-1. 호버 프리뷰 썸네일용 초경량 SVG 도면 PWA 사전 캐시 등록 (중복 제거 및 8MB+ 대용량 PNG 제외)
  const precachedThumbUrls = new Set<string>();
  for (const doc of searchDocsByLocale.ko || []) {
    if (doc.thumbnailUrl && doc.thumbnailUrl.startsWith('/svgs/') && !precachedThumbUrls.has(doc.thumbnailUrl)) {
      const svgFileName = doc.thumbnailUrl.replace(/^\/svgs\//, '');
      const svgContent = svgsMap[svgFileName];
      if (svgContent) {
        precacheEntries.push({ url: doc.thumbnailUrl, content: svgContent });
        precachedThumbUrls.add(doc.thumbnailUrl);
      }
    }
  }

  // 3-3. Fuse.js 브라우저 인메모리 검색 엔진 자산 배포 및 PWA 사전 캐시 등록
  const fuseBrowserScript = SearchService.getBrowserFuseScript();
  const fuseAssetDir = path.join(publicDir, 'assets');
  fs.mkdirSync(fuseAssetDir, { recursive: true });
  const fuseAssetPath = path.join(fuseAssetDir, 'fuse.basic.min.js');
  fs.writeFileSync(fuseAssetPath, fuseBrowserScript, 'utf-8');
  precacheEntries.push({ url: '/assets/fuse.basic.min.js', content: fuseBrowserScript });

  // 3-3-1. 7개국어 검색 슬림 인덱스 정적 JS 번들 배포 및 PWA 사전 캐시 등록 (HTML 페이로드 ~276KB 절감)
  const searchIndexJs = `/* Primitive Survival 100% Offline Search Index (7 Locales) */\nwindow.__SEARCH_DOCS__ = ${JSON.stringify(searchDocsByLocale)};\n`;
  const searchIndexPath = path.join(fuseAssetDir, 'search-index.js');
  fs.writeFileSync(searchIndexPath, searchIndexJs, 'utf-8');
  precacheEntries.push({ url: '/assets/search-index.js', content: searchIndexJs });
  log(`🔍 [Search Service] 인메모리 검색 엔진 배포 완료: public/assets/fuse.basic.min.js & search-index.js (7개국어 슬림 인덱스 탑재)`);

  for (let i = 0; i < allMasterProtocols.length; i++) {
    const proto = allMasterProtocols[i];
    const num = proto.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
    const fileName = `protocol-${num}.html`;
    const pMap = localesByProtocolId[proto.protocolId] || { ko: proto };

    const nextProto = allMasterProtocols[(i + 1) % allMasterProtocols.length];
    const nextNum = nextProto.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
    const nextHref = `/protocol-${nextNum}`;

    if (allMasterProtocols.length > 1) {
      const nextMap = localesByProtocolId[nextProto.protocolId] || { ko: nextProto };
      for (const [langCode, langProto] of Object.entries(pMap)) {
        if (!langProto) continue;
        const lang = langCode as SupportedLocale;
        const localizedNext = nextMap[lang] || nextProto;
        const nextPrefix = UI_STRINGS[lang]?.nextProtocol || 'Next:';
        langProto.nextProtocolTitle = `${nextPrefix} ${localizedNext.title}`;
      }
    }

    const nextTitleKo = pMap.ko?.nextProtocolTitle;
    const html = renderCanonicalProtocolPage(pMap, svgsMap, 'ko', nextTitleKo, nextHref, searchDocsByLocale);
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

  // 6. Vercel Cloud Serverless Webhook 번들(dist/) 자동 컴파일 (루트 빌드 시)
  if (root === defaultRootDir) {
    const { buildServerlessBundle } = await import('./build-serverless.ts');
    buildServerlessBundle(root, Boolean(options.silent));
  }

  return {
    totalProtocols: allMasterProtocols.length,
    compiledPages,
    cacheVersion,
    precacheCount: precacheUrls.length,
  };
}

export async function runPipeline() {
  const buildResult = await buildSite();

  // 5. Shorts Service 실행 (OSMU - Google Flow & 1-Source 7-Multilingual)
  // [Pilot Mode] 안전성을 위해 첫 번째 프로토콜(PR-01)만 우선 파일럿 생성
  const protocolsDir = path.join(defaultRootDir, 'content/protocols');
  const localesDir = path.join(protocolsDir, 'locales');
  const rawFirst = fs.readFileSync(path.join(protocolsDir, '01-water-purification.json'), 'utf-8');
  const firstProto: Protocol = JSON.parse(rawFirst);

  const supportedLocales: SupportedLocale[] = ['ko', 'en', 'ja', 'es', 'de', 'pt', 'zh-TW'];
  const localesMap: Record<SupportedLocale, Protocol> = {
    ko: firstProto,
  } as Record<SupportedLocale, Protocol>;

  for (const loc of supportedLocales) {
    if (loc === 'ko') continue;
    const locFilePath = path.join(localesDir, `01-water-purification.${loc}.json`);
    if (fs.existsSync(locFilePath)) {
      try {
        localesMap[loc] = JSON.parse(fs.readFileSync(locFilePath, 'utf-8'));
      } catch {
        localesMap[loc] = firstProto;
      }
    } else {
      localesMap[loc] = firstProto;
    }
  }

  const shortsBaseDir = path.join(defaultRootDir, 'shorts');
  const shortsPkgResult = await ShortsService.generateShortsPackage(
    firstProto,
    shortsBaseDir,
    localesMap,
    'PR-01-water-purification'
  );
  // 레거시 호환도 유지 (기존 빌드 및 참조 깨짐 방지)
  ShortsService.convertProtocolToShorts(firstProto, path.join(shortsBaseDir, '01-water-purification'));

  console.log(`🎬 [Shorts Pilot] 구글 플로우 7대 프롬프트 & 7개국어 패키지 생성 완료:`);
  console.log(`   └ 대상: ${firstProto.protocolId} (${firstProto.title.slice(0, 25)}...)`);
  console.log(`   └ 경로: shorts/${firstProto.protocolId}-water-purification/`);
  console.log(`   └ 생성된 언어: ${shortsPkgResult.localesGenerated.join(', ')}`);

  // 6. 다음 주제 기획 (TopicCurator Service - 명시적 요청 시에만 LLM 호출 수행하여 Vercel 정적 빌드 지연 차단)
  const shouldPlanNextTopic =
    process.env.RUN_TOPIC_CURATOR === '1' || process.argv.includes('--plan-next');
  if (CONFIG.geminiApiKey && shouldPlanNextTopic) {
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

## ⚠️ 꼭 피해야 할 실수 (Fatal Mistake)
- **흔한 실수**: ${nextPlan.fatalMistake.trap}
- **위험한 결과**: ${nextPlan.fatalMistake.consequence}
- **핵심 주의사항**: ${nextPlan.fatalMistake.rule}

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
