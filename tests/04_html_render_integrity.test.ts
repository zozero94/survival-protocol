import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderCanonicalProtocolPage } from '../src/render.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compiledHtmlPath = path.resolve(__dirname, '../public/protocol-01.html');

describe('🌐 [Suite 4: 출력 무결성] 컴파일된 HTML 및 다국어 핫스왑 엔진 전수 검증', () => {
  test('public/protocol-01.html 파일이 존재하고 0바이트가 아니어야 한다', () => {
    assert.ok(fs.existsSync(compiledHtmlPath), 'protocol-01.html 파일이 생성되어 있어야 함');
    const stat = fs.statSync(compiledHtmlPath);
    assert.ok(stat.size > 1000, `HTML 파일 크기가 너무 작음 (${stat.size} bytes)`);
  });

  test('컴파일된 HTML 본문 내에 렌더링 버그 문자열(>undefined<, [object Object])이 없어야 한다', () => {
    const html = fs.readFileSync(compiledHtmlPath, 'utf-8');
    assert.equal(html.includes('>undefined<'), false, 'HTML 본문 태그 내에 undefined가 렌더링되어선 안 됨');
    assert.equal(html.includes('[object Object]'), false, 'HTML 내에 [object Object]가 노출되어선 안 됨');
  });

  test('FOUC 쉴드 스타일 및 4대 선언적 바인딩 속성이 100% 탑재되어 있어야 한다', () => {
    const html = fs.readFileSync(compiledHtmlPath, 'utf-8');
    assert.ok(html.includes('id="fouc-shield"'), 'FOUC 쉴드가 탑재되어 있어야 함');
    assert.ok(html.includes('data-i18n='), 'data-i18n 속성이 존재해야 함');
    assert.ok(html.includes('data-proto='), 'data-proto 속성이 존재해야 함');
    assert.ok(html.includes('data-proto-item='), 'data-proto-item 속성이 존재해야 함');
    assert.ok(html.includes('data-proto-fatal='), 'data-proto-fatal 속성이 존재해야 함');
    assert.ok(html.includes('data-action='), '선언적 이벤트 위임 data-action이 존재해야 함');
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
});

