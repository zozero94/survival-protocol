import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const indexPath = path.join(publicDir, 'index.html');
const swPath = path.join(publicDir, 'sw.js');

describe('📑 [Suite 5: 메인 인덱스 & 페이징] 5개 카드 피드 및 오프라인 캐시 무결성 검증', () => {
  test('public/index.html 파일이 존재하고 정상 크기여야 한다', () => {
    assert.ok(fs.existsSync(indexPath), 'index.html 파일이 존재해야 합니다.');
    const stat = fs.statSync(indexPath);
    assert.ok(stat.size > 2000, `index.html 크기가 너무 작습니다 (${stat.size} bytes)`);
  });

  test('index.html 내에 ARCHIVE-0 명칭이 배제되고 생존 교범 브랜딩이 적용되어야 한다', () => {
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.equal(html.includes('[ARCHIVE-0]'), false, '헤더나 본문에 ARCHIVE-0이 포함되어서는 안 됩니다.');
    assert.ok(html.includes('생존 교범'), '생존 교범 브랜딩이 포함되어야 합니다.');
  });

  test('index.html 내에 5개 단위 페이징과 카테고리 필터 요소가 탑재되어야 한다', () => {
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(html.includes('id="pagination-nav"'), '페이징 네비게이션이 존재해야 합니다.');
    assert.ok(html.includes('data-action="goto-page"'), '페이지 이동 액션이 존재해야 합니다.');
    assert.ok(html.includes('data-action="filter-category"'), '카테고리 필터 액션이 존재해야 합니다.');
    assert.ok(html.includes('data-protocol-card='), '프로토콜 카드들이 렌더링되어 있어야 합니다.');
  });

  test('sw.js에 메인 인덱스와 각 프로토콜 상세 페이지가 사전 캐시 목록에 등재되어야 한다', () => {
    const sw = fs.readFileSync(swPath, 'utf-8');
    assert.ok(sw.includes('"/index.html"'), 'index.html이 precache에 포함되어야 합니다.');
    assert.ok(sw.includes('"/protocol-01.html"'), 'protocol-01.html이 precache에 포함되어야 합니다.');
  });

  test('메인 index.html과 상세 페이지 상단/하단 제목 영역이 7개국어(ko, en, ja, es, de, pt, zh-TW) 핫스왑 바인딩을 완비해야 한다', () => {
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(indexHtml.includes('window.__FEED_PROTOCOLS__ ='), '메인 피드에 7개국어 프로토콜 맵이 내장되어야 함');
    assert.ok(indexHtml.includes('data-i18n="feedHeroHeadline"'), '메인 히어로 헤드라인 다국어 바인딩 필수');
    assert.ok(indexHtml.includes('data-card-title="PR-01"'), '피드 카드 제목 다국어 바인딩 필수');
    assert.ok(indexHtml.includes('data-card-summary="PR-01"'), '피드 카드 요약 다국어 바인딩 필수');
    assert.ok(indexHtml.includes('data-card-mat="PR-01"'), '피드 카드 재료 칩 다국어 바인딩 필수');

    const p01Html = fs.readFileSync(path.join(publicDir, 'protocol-01.html'), 'utf-8');
    assert.ok(p01Html.includes('data-i18n="brandShort"'), '상세 상단 헤더 브랜드 다국어 바인딩 필수');
    assert.ok(p01Html.includes('href="/protocol-02"'), '하단 다음 프로토콜 링크가 실제 경로를 가리켜야 함');
    assert.ok(p01Html.includes('"nextProtocolTitle":"Next: PR-02'), '영어 다음 프로토콜 제목이 내장되어야 함');
  });
});

