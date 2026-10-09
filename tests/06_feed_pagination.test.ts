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
});
