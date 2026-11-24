import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderCanonicalProtocolPage } from '../src/render.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const compiledHtmlPath = path.resolve(publicDir, 'protocol-01.html');

describe('🌐 [Suite 4: 출력 무결성] 컴파일된 HTML 및 다국어 핫스왑 엔진 전수 검증', () => {
  test('public/protocol-01.html 파일이 존재하고 0바이트가 아니어야 한다', () => {
    assert.ok(fs.existsSync(compiledHtmlPath), 'protocol-01.html 파일이 생성되어 있어야 함');
    const stat = fs.statSync(compiledHtmlPath);
    assert.ok(stat.size > 1000, `HTML 파일 크기가 너무 작음 (${stat.size} bytes)`);
  });

  test('컴파일된 HTML 본문 내에 렌더링 버그 문자열(>undefined<, [object Object])이 없어야 한다', () => {
    const htmlFiles = fs.readdirSync(publicDir).filter(f => f.startsWith('protocol-') && f.endsWith('.html'));
    assert.ok(htmlFiles.length > 0, '프로토콜 HTML 파일이 존재해야 함');
    for (const f of htmlFiles) {
      const html = fs.readFileSync(path.join(publicDir, f), 'utf-8');
      assert.equal(/>\s*undefined\s*</.test(html), false, `${f} 본문 태그 내에 undefined가 렌더링되어선 안 됨`);
      assert.equal(html.includes('[object Object]'), false, `${f} 내에 [object Object]가 노출되어선 안 됨`);
    }
  });

  test('FOUC 쉴드 스타일 및 4대 선언적 바인딩 속성이 100% 탑재되어 있어야 한다', () => {
    const html = fs.readFileSync(compiledHtmlPath, 'utf-8');
    assert.ok(html.includes('id="fouc-shield"'), 'FOUC 쉴드가 탑재되어 있어야 함');
    assert.ok(html.includes('data-i18n='), 'data-i18n 속성이 존재해야 함');
    assert.ok(html.includes('data-proto='), 'data-proto 속성이 존재해야 함');
    assert.ok(html.includes('data-proto-item='), 'data-proto-item 속성이 존재해야 함');
    assert.ok(html.includes('data-proto-fatal='), 'data-proto-fatal 속성이 존재해야 함');
    assert.ok(html.includes('data-proto-outcome='), 'data-proto-outcome 속성이 존재해야 함');
    assert.ok(html.includes('data-action='), '선언적 이벤트 위임 data-action이 존재해야 함');
  });

  test('최종 완성 결과물(Outcome Preview) 도면이 필수 준비물 체크리스트 직전에 배치되어야 한다', () => {
    const html = fs.readFileSync(compiledHtmlPath, 'utf-8');
    assert.ok(html.includes('ui-outcome-title'), '결과물 미리보기 컴포넌트가 렌더링되어야 함');
    assert.ok(html.includes('data-svg="outcome"') && html.includes('FIG. OUTCOME //'), '초고화질 결과물 SVG가 인라인 탑재되어야 함');
    const outcomeIdx = html.indexOf('ui-outcome-title');
    const checklistIdx = html.indexOf('ui-checklist-title');
    assert.ok(outcomeIdx > 0 && checklistIdx > 0 && outcomeIdx < checklistIdx, '결과물 이미지가 필수 준비물 체크리스트 위에 위치해야 함');
  });

  test('ARCHIVE-0 명칭이 배제되고 PWA 메타 및 오프라인 배너가 탑재되어 있어야 한다', () => {
    const html = fs.readFileSync(compiledHtmlPath, 'utf-8');
    assert.equal(html.includes('[ARCHIVE-0]'), false, '헤더나 본문에 ARCHIVE-0 브랜딩이 남아있어선 안 됨');
    assert.ok(html.includes('manifest.webmanifest'), 'PWA 매니페스트 링크가 포함되어야 함');
    assert.ok(html.includes('id="offline-banner"'), '오프라인 배너가 포함되어야 함');
    assert.ok(html.includes('data-network'), '네트워크 감지 런타임 스크립트가 포함되어야 함');
  });

  test('렌더러 함수(renderCanonicalProtocolPage)가 필수 데이터 누락 시 안전하게 예외를 발생시켜야 한다', () => {
    assert.throws(() => {
      renderCanonicalProtocolPage({});
    }, /프로토콜 데이터셋이 비어 있습니다/);
  });

  test('Option A+ 넘버링 도면(PR-01 전체 6종: Step 01~05 + Outcome)의 WebP 도면 및 다국어 HTML 원형 배지 범례가 정상 렌더링되어야 한다', () => {
    const html01 = fs.readFileSync(compiledHtmlPath, 'utf-8');
    assert.ok(html01.includes('/images/pr01-outcome-diagram.webp'), 'PR-01에 Option A+ Outcome WebP 경로가 포함되어야 함');
    assert.ok(html01.includes('TECHNICAL DIAGRAM'), 'PR-01 스텝 배지가 TECHNICAL DIAGRAM이어야 함');
    assert.ok(html01.includes('data-svg-legend-outcome-idx="0"'), 'PR-01 Outcome 하단에 HTML 다국어 범례 컨테이너가 렌더링되어야 함');
    assert.ok(fs.existsSync(compiledHtmlPath.replace(/[^/\\]+$/, 'images/pr01-outcome-diagram.webp')), 'public/images/pr01-outcome-diagram.webp 파일이 복사되어야 함');
    for (let i = 0; i < 5; i++) {
      const file = `pr01-step-0${i + 1}-diagram.webp`;
      assert.ok(html01.includes(`/images/${file}`), `PR-01 Step 0${i + 1} Option A+ WebP 경로가 포함되어야 함`);
      assert.ok(html01.includes(`data-svg-legend-step="${i}"`), `PR-01 Step 0${i + 1} HTML 다국어 범례 컨테이너가 렌더링되어야 함`);
      assert.ok(fs.existsSync(compiledHtmlPath.replace(/[^/\\]+$/, `images/${file}`)), `public/images/${file} 파일이 복사되어야 함`);
    }
    assert.ok(html01.includes("querySelectorAll('[data-svg-legend-step]')"), '로케일 런타임에 스텝 범례 핫스왑 로직이 탑재되어야 함');
    assert.ok(html01.includes("querySelectorAll('[data-svg-legend-outcome-idx]')"), '로케일 런타임에 결과물 범례 핫스왑 로직이 탑재되어야 함');
  });

  test('Option A+ 넘버링 도면(PR-02 전체 4종: Step 01~03 + Outcome)의 WebP 도면, 7개국어 범례 동기화 및 HTML 렌더링이 무결해야 한다', () => {
    const html02 = fs.readFileSync(path.resolve(publicDir, 'protocol-02.html'), 'utf-8');
    assert.ok(html02.includes('/images/pr02-outcome-diagram.webp'), 'PR-02에 Option A+ Outcome WebP 경로가 포함되어야 함');
    assert.ok(html02.includes('TECHNICAL DIAGRAM'), 'PR-02 스텝 배지가 TECHNICAL DIAGRAM이어야 함');
    assert.ok(html02.includes('data-svg-legend-outcome-idx="0"'), 'PR-02 Outcome 하단에 HTML 다국어 범례 컨테이너가 렌더링되어야 함');
    assert.ok(html02.includes('PR-02 OUTCOME //'), 'PR-02 Outcome 범례 헤더가 렌더링되어야 함');
    assert.ok(fs.existsSync(path.resolve(publicDir, 'images/pr02-outcome-diagram.webp')), 'public/images/pr02-outcome-diagram.webp 파일이 복사되어야 함');
    for (let i = 0; i < 3; i++) {
      const file = `pr02-step-0${i + 1}-diagram.webp`;
      assert.ok(html02.includes(`/images/${file}`), `PR-02 Step 0${i + 1} Option A+ WebP 경로가 포함되어야 함`);
      assert.ok(html02.includes(`data-svg-legend-step="${i}"`), `PR-02 Step 0${i + 1} HTML 다국어 범례 컨테이너가 렌더링되어야 함`);
      assert.ok(fs.existsSync(path.resolve(publicDir, `images/${file}`)), `public/images/${file} 파일이 복사되어야 함`);
    }

    const protocolsDir = path.resolve(__dirname, '../content/protocols');
    const ko02 = JSON.parse(fs.readFileSync(path.join(protocolsDir, '02-friction-fire.json'), 'utf-8')) as Protocol;
    assert.strictEqual(ko02.outcome?.diagramLegend?.length, 7, 'PR-02 ko outcome.diagramLegend 길이는 7이어야 함');
    for (const lang of ['en', 'ja', 'es', 'de', 'pt', 'zh-TW']) {
      const loc02 = JSON.parse(fs.readFileSync(path.join(protocolsDir, 'locales', `02-friction-fire.${lang}.json`), 'utf-8')) as Protocol;
      assert.strictEqual(loc02.outcome?.imageFileName, 'pr02-outcome-diagram.webp', `PR-02 ${lang} outcome.imageFileName 불일치`);
      assert.strictEqual(loc02.outcome?.diagramLegend?.length, 7, `PR-02 ${lang} outcome.diagramLegend 길이 불일치`);
      assert.equal(/[가-힣]/.test((loc02.outcome?.diagramLegend || []).join(' ')), false, `PR-02 ${lang} outcome.diagramLegend에 미번역 한글 잔존`);
      ko02.steps.forEach((step, idx) => {
        const locStep = loc02.steps[idx];
        assert.strictEqual(locStep.imageFileName, step.imageFileName, `PR-02 ${lang} Step ${idx + 1} imageFileName 불일치`);
        assert.strictEqual(locStep.diagramLegend?.length, step.diagramLegend?.length, `PR-02 ${lang} Step ${idx + 1} diagramLegend 길이 불일치`);
        assert.equal(/[가-힣]/.test((locStep.diagramLegend || []).join(' ')), false, `PR-02 ${lang} Step ${idx + 1} diagramLegend에 미번역 한글 잔존`);
      });
    }
  });

  const assertOptionAProtocolIntegrity = (
    protocolCode: string,
    htmlFileName: string,
    slug: string,
    prefix: string,
    stepCount: number,
    expectedOutcomeLegendLen: number
  ) => {
    const html = fs.readFileSync(path.resolve(publicDir, htmlFileName), 'utf-8');
    const outcomeWebp = `${prefix}-outcome-diagram.webp`;
    assert.ok(html.includes(`/images/${outcomeWebp}`), `${protocolCode}에 Option A+ Outcome WebP 경로가 포함되어야 함`);
    assert.ok(html.includes('TECHNICAL DIAGRAM'), `${protocolCode} 스텝 배지가 TECHNICAL DIAGRAM이어야 함`);
    assert.ok(html.includes('data-svg-legend-outcome-idx="0"'), `${protocolCode} Outcome 하단에 HTML 다국어 범례 컨테이너가 렌더링되어야 함`);
    assert.ok(html.includes(`${protocolCode} OUTCOME //`), `${protocolCode} Outcome 범례 헤더가 렌더링되어야 함`);
    assert.ok(fs.existsSync(path.resolve(publicDir, `images/${outcomeWebp}`)), `public/images/${outcomeWebp} 파일이 복사되어야 함`);
    for (let i = 0; i < stepCount; i++) {
      const file = `${prefix}-step-0${i + 1}-diagram.webp`;
      assert.ok(html.includes(`/images/${file}`), `${protocolCode} Step 0${i + 1} Option A+ WebP 경로가 포함되어야 함`);
      assert.ok(html.includes(`data-svg-legend-step="${i}"`), `${protocolCode} Step 0${i + 1} HTML 다국어 범례 컨테이너가 렌더링되어야 함`);
      assert.ok(fs.existsSync(path.resolve(publicDir, `images/${file}`)), `public/images/${file} 파일이 복사되어야 함`);
    }

    const protocolsDir = path.resolve(__dirname, '../content/protocols');
    const koProto = JSON.parse(fs.readFileSync(path.join(protocolsDir, `${slug}.json`), 'utf-8')) as Protocol;
    assert.strictEqual(koProto.outcome?.diagramLegend?.length, expectedOutcomeLegendLen, `${protocolCode} ko outcome.diagramLegend 길이는 ${expectedOutcomeLegendLen}이어야 함`);
    for (const lang of ['en', 'ja', 'es', 'de', 'pt', 'zh-TW']) {
      const locProto = JSON.parse(fs.readFileSync(path.join(protocolsDir, 'locales', `${slug}.${lang}.json`), 'utf-8')) as Protocol;
      assert.strictEqual(locProto.outcome?.imageFileName, outcomeWebp, `${protocolCode} ${lang} outcome.imageFileName 불일치`);
      assert.strictEqual(locProto.outcome?.diagramLegend?.length, expectedOutcomeLegendLen, `${protocolCode} ${lang} outcome.diagramLegend 길이 불일치`);
      assert.equal(/[가-힣]/.test((locProto.outcome?.diagramLegend || []).join(' ')), false, `${protocolCode} ${lang} outcome.diagramLegend에 미번역 한글 잔존`);
      koProto.steps.forEach((step, idx) => {
        const locStep = locProto.steps[idx];
        assert.strictEqual(locStep.imageFileName, step.imageFileName, `${protocolCode} ${lang} Step ${idx + 1} imageFileName 불일치`);
        assert.strictEqual(locStep.diagramLegend?.length, step.diagramLegend?.length, `${protocolCode} ${lang} Step ${idx + 1} diagramLegend 길이 불일치`);
        assert.equal(/[가-힣]/.test((locStep.diagramLegend || []).join(' ')), false, `${protocolCode} ${lang} Step ${idx + 1} diagramLegend에 미번역 한글 잔존`);
      });
    }
  };

  test('Option A+ 넘버링 도면(PR-03 전체 4종: Step 01~03 + Outcome)의 WebP 도면, 7개국어 범례 동기화 및 HTML 렌더링이 무결해야 한다', () => {
    assertOptionAProtocolIntegrity('PR-03', 'protocol-03.html', '03-debris-hut-insulation-shelter', 'pr03', 3, 7);
  });

  test('Option A+ 넘버링 도면(PR-04 전체 4종: Step 01~03 + Outcome)의 WebP 도면, 7개국어 범례 동기화 및 HTML 렌더링이 무결해야 한다', () => {
    assertOptionAProtocolIntegrity('PR-04', 'protocol-04.html', '04-stone-axe-making', 'pr04', 3, 7);
  });

  test('Option A+ 넘버링 도면(PR-05 전체 6종: Step 01~05 + Outcome)의 WebP 도면, 7개국어 범례 동기화 및 HTML 렌더링이 무결해야 한다', () => {
    assertOptionAProtocolIntegrity('PR-05', 'protocol-05.html', '05-natural-cordage', 'pr05', 5, 7);
  });
});

