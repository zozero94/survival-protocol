import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { PostingReviewService } from '../src/services/posting-review.service.ts';
import { CrossLinkerService, ContentEnrichmentService } from '../src/services/content-enrichment.service.ts';
import { SearchService } from '../src/services/search.service.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

const PROTOCOLS_DIR = path.resolve(process.cwd(), 'content', 'protocols');
const LOCALES_DIR = path.join(PROTOCOLS_DIR, 'locales');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

test('Suite 16: PostingReviewService, CrossLinkerService & ContentEnrichmentService', async (t) => {
  const masterFiles = fs
    .readdirSync(PROTOCOLS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort();

  const allMasterProtocols: Protocol[] = masterFiles.map(
    (f) => JSON.parse(fs.readFileSync(path.join(PROTOCOLS_DIR, f), 'utf-8')) as Protocol
  );

  await t.test('16-1: 전 발행 프로토콜(PR-01 ~ PR-12)이 4대 포스팅 품질 심사(Safety, Reproducibility, SEO, Localization)를 100% 통과해야 한다', () => {
    assert.ok(masterFiles.length >= 9, '최소 9개 이상의 활성 마스터 프로토콜이 존재해야 함');

    for (const file of masterFiles) {
      const slugBase = file.replace(/\.json$/, '');
      const masterProtocol = JSON.parse(fs.readFileSync(path.join(PROTOCOLS_DIR, file), 'utf-8')) as Protocol;

      const localizedVariants: Record<string, Protocol> = {};
      for (const lang of ['en', 'ja', 'es', 'de', 'pt', 'zh-TW']) {
        const locPath = path.join(LOCALES_DIR, `${slugBase}.${lang}.json`);
        if (fs.existsSync(locPath)) {
          localizedVariants[lang] = JSON.parse(fs.readFileSync(locPath, 'utf-8')) as Protocol;
        }
      }

      const report = PostingReviewService.auditPostingFull(masterProtocol, localizedVariants);

      assert.equal(
        report.passed,
        true,
        `[${masterProtocol.protocolId}] 4대 포스팅 리뷰 통과 실패 (점수: ${report.totalScore}): ${report.summaryFeedback.join(' / ')}`
      );
      assert.ok(report.totalScore >= 85, `[${masterProtocol.protocolId}] 종합 점수 85점 이상이어야 함 (실제: ${report.totalScore})`);
    }
  });

  await t.test('16-2: 현대 정밀 계측기(전자저울, 디지털 온도계, 타이머) 의존 문구가 포함되면 FIELD_REPRODUCIBILITY 감점이 작동해야 한다', () => {
    const sample = allMasterProtocols[0]!;

    const contaminated: Protocol = {
      ...sample,
      steps: sample.steps.map((s, idx) =>
        idx === 0
          ? { ...s, description: `${s.description} 전자저울로 50g을 정확히 계량하고 타이머를 맞추어 10분간 가열합니다.` }
          : s
      ),
    };

    const res = PostingReviewService.auditFieldReproducibility(contaminated);
    assert.equal(res.passed, false, '현대 정밀 계측기 사용 시 무도구 재현성 심사를 통과하면 안 됨');
    assert.ok(res.warnings.length >= 2, '금지 계측기 경고가 최소 2건 이상 기록되어야 함');
  });

  await t.test('16-3: 번역본에 미번역 한글이 남아있을 경우 GLOBAL_ECO_LOCALIZATION 경고가 즉시 포착되어야 한다', () => {
    const sample = allMasterProtocols[0]!;

    const brokenEn: Protocol = {
      ...sample,
      title: 'How to Purify Water with 숯과 모래',
    };

    const res = PostingReviewService.auditGlobalEcoLocalization(sample, {
      en: brokenEn,
      ja: brokenEn,
      es: brokenEn,
      de: brokenEn,
      pt: brokenEn,
      'zh-TW': brokenEn,
    });

    assert.equal(res.passed, false, '미번역 한글 포함 시 다국어 현지화 심사를 통과하면 안 됨');
    assert.ok(res.warnings.some((w) => w.includes('미번역 한글')), '미번역 한글 경고 메시지가 포함되어야 함');
  });

  await t.test('16-4: CrossLinkerService가 프로토콜 간 체인 링킹(PR-10 ➔ PR-04/PR-09, PR-04 ➔ PR-05/PR-10)을 정확히 검증하고 깨진 링크가 0건이어야 한다', () => {
    for (const proto of allMasterProtocols) {
      const audit = CrossLinkerService.auditCrossLinks(proto, allMasterProtocols);
      assert.equal(
        audit.passed,
        true,
        `[${proto.protocolId}] 인라인 하이퍼링크 무결성 위반: ${audit.validationIssues.map(i => i.message).join(', ')}`
      );
    }

    const pr10 = allMasterProtocols.find(p => p.protocolId === 'PR-10')!;
    const pr10Audit = CrossLinkerService.auditCrossLinks(pr10, allMasterProtocols);
    assert.ok(
      pr10Audit.existingLinks.some(l => l.url === '/protocol-04.html'),
      'PR-10(소나무 송진)은 돌칼/돌도끼 제작(PR-04)으로의 인라인 하이퍼링크를 포함해야 함'
    );
    assert.ok(
      pr10Audit.existingLinks.some(l => l.url === '/protocol-09.html'),
      'PR-10(소나무 송진)은 참나무 숯가마(PR-09)로의 인라인 하이퍼링크를 포함해야 함'
    );

    const pr04 = allMasterProtocols.find(p => p.protocolId === 'PR-04')!;
    const pr04Audit = CrossLinkerService.auditCrossLinks(pr04, allMasterProtocols);
    assert.ok(
      pr04Audit.existingLinks.some(l => l.url === '/protocol-05.html'),
      'PR-04(돌도끼)는 야생 밧줄 제작(PR-05)으로의 인라인 하이퍼링크를 포함해야 함'
    );
    assert.ok(
      pr04Audit.existingLinks.some(l => l.url === '/protocol-10.html'),
      'PR-04(돌도끼)는 소나무 송진 접착제(PR-10)로의 인라인 하이퍼링크를 포함해야 함'
    );
  });

  await t.test('16-5: ContentEnrichmentService가 의미성·쉬운 설명·벡터 밀도·실사 도감(fieldSpecs) 검수를 통과해야 한다', () => {
    for (const proto of allMasterProtocols) {
      const report = ContentEnrichmentService.auditProtocolEnrichment(proto, allMasterProtocols);
      assert.equal(
        report.passed,
        true,
        `[${proto.protocolId}] 콘텐츠 깊이/벡터 밀도 검수 미통과: ${report.meaningfulness.claritySuggestions.join(' / ')}`
      );
      assert.ok(report.overallScore >= 85, `[${proto.protocolId}] 종합 보강 점수 85점 이상이어야 함`);
    }
  });

  await t.test('16-6: 빌드된 HTML(protocol-10.html, protocol-04.html)에 인라인 하이퍼텍스트 앵커(data-proto="crosslink")가 정상 렌더링되어야 한다', () => {
    const html10 = fs.readFileSync(path.join(PUBLIC_DIR, 'protocol-10.html'), 'utf-8');
    assert.ok(
      html10.includes('data-proto="crosslink" href="/protocol-04.html"'),
      'protocol-10.html 본문에 /protocol-04.html 인라인 하이퍼링크 앵커가 렌더링되어야 함'
    );

    const html04 = fs.readFileSync(path.join(PUBLIC_DIR, 'protocol-04.html'), 'utf-8');
    assert.ok(
      html04.includes('data-proto="crosslink" href="/protocol-05.html"'),
      'protocol-04.html 본문에 /protocol-05.html 인라인 하이퍼링크 앵커가 렌더링되어야 함'
    );
  });

  await t.test('16-7: 전 프로토콜(PR-01 ~ PR-12)에 모듈형 호버 프리뷰 팝오버(#tactical-crosslink-popover) 및 썸네일 인덱스가 자동 이식되어야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(allMasterProtocols, 'ko');
    for (const doc of slimDocs) {
      assert.ok(
        doc.thumbnailUrl && (doc.thumbnailUrl.startsWith('/svgs/pr') || doc.thumbnailUrl.startsWith('/images/pr')),
        `[${doc.id}] thumbnailUrl이 유효해야 함 (실제: ${doc.thumbnailUrl})`
      );
      assert.ok(doc.timeRequired && doc.timeRequired.length > 0, `[${doc.id}] timeRequired가 포함되어야 함`);
      const assetDiskPath = path.join(PUBLIC_DIR, doc.thumbnailUrl.replace(/^\//, ''));
      assert.equal(fs.existsSync(assetDiskPath), true, `[${doc.id}] 정적 썸네일 도면(${assetDiskPath})이 public/에 존재해야 함`);
    }

    for (const proto of allMasterProtocols) {
      const num = proto.protocolId.replace(/\D/g, '').padStart(2, '0');
      const htmlPath = path.join(PUBLIC_DIR, `protocol-${num}.html`);
      const html = fs.readFileSync(htmlPath, 'utf-8');
      assert.ok(
        html.includes('id="tactical-crosslink-popover"'),
        `protocol-${num}.html에 #tactical-crosslink-popover 싱글톤 DOM이 자동 주입되어야 함`
      );
      assert.ok(
        html.includes('showPopoverForAnchor') && html.includes('extractProtocolNum'),
        `protocol-${num}.html에 크로스링크 호버 프리뷰 런타임 스크립트가 자동 주입되어야 함`
      );

      // 모든 인라인 <script> 블록의 JS 문법 무결성 검증 (정규식 이스케이프 누락 등 SyntaxError 원천 차단)
      const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
      let m: RegExpExecArray | null;
      let sIdx = 0;
      while ((m = scriptRe.exec(html)) !== null) {
        sIdx++;
        const attrs = m[1] || '';
        const code = m[2] || '';
        if (attrs.includes('application/ld+json') || !code.trim()) continue;
        assert.doesNotThrow(
          () => new vm.Script(code, { filename: `protocol-${num}.html#script${sIdx}` }),
          `protocol-${num}.html#script${sIdx} 인라인 스크립트에 JS 문법 오류(SyntaxError)가 없어야 함`
        );
      }
    }

    const swCode = fs.readFileSync(path.join(PUBLIC_DIR, 'sw.js'), 'utf-8');
    assert.ok(
      swCode.includes('/svgs/pr02-outcome.svg') && swCode.includes('/svgs/pr12-outcome.svg'),
      'Service Worker(sw.js) 사전 캐시에 호버 프리뷰 썸네일 SVG들이 등록되어야 함'
    );
  });

  await t.test('16-8: 법무 및 Google 정책 검수(LEGAL_GOOGLE_POLICY)가 위험·유해 금지어 및 폐자재 유독가스 경고 누락을 즉시 탐지해야 한다', () => {
    const pr12 = allMasterProtocols.find((p) => p.protocolId === 'PR-12')!;
    const cleanAudit = PostingReviewService.auditLegalGooglePolicy(pr12);
    assert.strictEqual(cleanAudit.passed, true, 'PR-12는 법무 및 Google 정책 심사를 통과해야 함');

    const badProtocol: Protocol = {
      ...pr12,
      summary: '사제 폭탄 제조 및 무단 침입 기술 안내',
    };
    const badAudit = PostingReviewService.auditLegalGooglePolicy(badProtocol);
    assert.strictEqual(badAudit.passed, false, '위험·불법 무기/폭발물 금지어가 포함되면 즉시 불합격 처리되어야 함');
    assert.ok(badAudit.warnings.some((w) => w.includes('정책 위반 금지어 감지')));
  });

  await t.test('16-9: Firebase 텔레메트리 어뷰징 방어, AdBlock 장애 격리, PWA 외부 호스트 화이트리스트 및 index.html 인라인 스크립트 무결성이 보장되어야 한다', () => {
    const indexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    let sIdx = 0;
    while ((m = scriptRe.exec(indexHtml)) !== null) {
      sIdx++;
      const attrs = m[1] || '';
      const code = m[2] || '';
      if (attrs.includes('application/ld+json') || !code.trim()) continue;
      assert.doesNotThrow(
        () => new vm.Script(code, { filename: `index.html#script${sIdx}` }),
        `index.html#script${sIdx} 인라인 스크립트에 JS 문법 오류(SyntaxError)가 없어야 함`
      );
    }

    const html01 = fs.readFileSync(path.join(PUBLIC_DIR, 'protocol-01.html'), 'utf-8');
    assert.ok(html01.includes('VALID_PID_RE = /^PR-[0-9]{2,4}$/'), '프로토콜 ID 정규식 화이트리스트 검증이 포함되어야 함');
    assert.ok(html01.includes('CLICK_COOLDOWN_MS') && html01.includes('MAX_TOGGLES_PER_SESSION'), '좋아요 매크로 클릭 쿨다운 및 세션당 토글 제한이 포함되어야 함');
    assert.ok(html01.includes('onlyOnce: true'), 'Realtime Database 스냅샷 조회에 onlyOnce: true가 적용되어야 함');
    assert.ok(html01.includes('<aside class="no-print fixed bottom-0'), 'StickyActionBar에 인쇄 시 숨김(.no-print) 클래스가 포함되어야 함');

    const swCode = fs.readFileSync(path.join(PUBLIC_DIR, 'sw.js'), 'utf-8');
    assert.ok(
      swCode.includes('ALLOWED_EXTERNAL_HOSTS') && swCode.includes('if (!ALLOWED_EXTERNAL_HOSTS.includes(url.hostname)) return;'),
      'Service Worker(sw.js)가 허용된 외부 정적 자산(Tailwind/Google Fonts) 외의 외부 API/Firebase 요청을 가로채지 않아야 함'
    );
  });
});



