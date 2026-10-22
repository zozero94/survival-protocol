import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ADSENSE_CONFIG, SITE_META } from '../src/site.config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

describe('📜 [Suite 19: Google AdSense E-E-A-T & 법적 규정 4대 페이지 전수 감사]', () => {
  const policyPages = [
    { file: 'about.html', path: '/about', expectedKey: 'E-E-A-T' },
    { file: 'privacy.html', path: '/privacy', expectedKey: 'Google AdSense' },
    { file: 'terms.html', path: '/terms', expectedKey: '면책' },
    { file: 'contact.html', path: '/contact', expectedKey: 'contact@survival-protocol.com' },
  ];

  it('19-1: 4대 정책 페이지(about, privacy, terms, contact)가 public/에 정적 컴파일되어 존재해야 한다', () => {
    for (const p of policyPages) {
      const filePath = path.join(publicDir, p.file);
      assert.ok(fs.existsSync(filePath), `${p.file} 파일이 public/에 생성되어 있어야 함`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 20000, `${p.file} 크기가 충분히 커야 함 (현재: ${stat.size} bytes)`);
    }
  });

  it('19-2: 모든 정책 페이지는 AdSense 스크립트, SEO 메타, PWA 링크 및 검색 모달을 탑재해야 한다', () => {
    for (const p of policyPages) {
      const html = fs.readFileSync(path.join(publicDir, p.file), 'utf-8');

      // AdSense 공식 클라이언트 ID 검증
      assert.ok(
        html.includes(ADSENSE_CONFIG.clientId),
        `${p.file}에 공식 AdSense 클라이언트 ID(${ADSENSE_CONFIG.clientId})가 포함되어야 함`
      );
      assert.ok(
        html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'),
        `${p.file}에 Google AdSense 공식 헤드 스크립트가 로드되어야 함`
      );

      // SEO & PWA
      assert.ok(html.includes(`<link rel="canonical" href="${SITE_META.siteUrl}${p.path}">`), `${p.file} canonical 태그 검증`);
      assert.ok(html.includes('rel="manifest" href="/manifest.webmanifest"'), `${p.file} manifest 링크 검증`);
      assert.ok(html.includes('id="search-modal"'), `${p.file} 인메모리 검색 모달 탑재 검증`);
      assert.ok(html.includes('[SYSTEM STATUS: AIR-GAPPED &amp; PERSISTENT]'), `${p.file} 상단 전술 텔레메트리 스트립 검증`);
      assert.ok(html.includes('<footer class="border-t border-neutral-800'), `${p.file} 통합 글로벌 푸터 탑재 검증`);
    }
  });

  it('19-3: about.html은 4대 실증 체계(E-E-A-T), 편찬 위원회, CC0 오픈소스 배포 헌장을 온전히 포함해야 한다', () => {
    const html = fs.readFileSync(path.join(publicDir, 'about.html'), 'utf-8');
    assert.ok(html.includes('4대 엄격 실증 체계'), '4대 실증 체계 헤드라인 포함');
    assert.ok(html.includes('수석 편찬 및 현장 검증 위원회'), '검증 위원회 섹션 포함');
    assert.ok(html.includes('ZERO-TOOL REPRODUCIBILITY'), '원시 자연물 100% 고증 원칙 포함');
    assert.ok(html.includes('CC0 PUBLIC DOMAIN'), 'CC0 오픈소스 배포 헌장 포함');
  });

  it('19-4: privacy.html은 Google AdSense 맞춤 쿠키, GA4 비식별화, Firebase 텔레메트리 및 옵트아웃 링크를 명시해야 한다', () => {
    const html = fs.readFileSync(path.join(publicDir, 'privacy.html'), 'utf-8');
    assert.ok(html.includes('GOOGLE ADSENSE &amp; THIRD-PARTY COOKIES'), 'Google AdSense 고지 섹션 포함');
    assert.ok(html.includes('_gads'), 'AdSense 쿠키 키 명시');
    assert.ok(html.includes('https://adssettings.google.com'), 'Google Ads 설정 옵트아웃 링크 포함');
    assert.ok(html.includes('https://www.aboutads.info/choices'), 'AboutAds 옵트아웃 링크 포함');
    assert.ok(html.includes('IP Anonymization: true') || html.includes('IP Anonymization'), 'GA4 IP 비식별화 원칙 포함');
    assert.ok(html.includes('executeHardPurge'), '로컬 스토리지 즉시 소각 함수 탑재');
  });

  it('19-5: terms.html은 야전 안전 면책 조항, 비영리 연구 목적, 무보증 원칙을 온전히 포함해야 한다', () => {
    const html = fs.readFileSync(path.join(publicDir, 'terms.html'), 'utf-8');
    assert.ok(html.includes('재난 대비 생존 교육 및 야전 안전 면책 조항'), '면책 조항 대제목 포함');
    assert.ok(html.includes('[NON-COMMERCIAL]'), '비영리 공공 목적 명시');
    assert.ok(html.includes('[ZERO WARRANTY]'), '무보증 원칙 명시');
    assert.ok(html.includes('현행 산림보호법'), '현행법령 준수 의무 명시');
  });

  it('19-6: contact.html은 PGP 암호화 서신, 공식 GitHub 저장소, 텔레그램 채널 및 Errata 폼을 포함해야 한다', () => {
    const html = fs.readFileSync(path.join(publicDir, 'contact.html'), 'utf-8');
    assert.ok(html.includes('contact@survival-protocol.com'), '대표 공식 이메일 포함');
    assert.ok(html.includes('github.com/zozero94/survival-protocol'), '공식 깃허브 저장소 링크 포함');
    assert.ok(html.includes('id="dispatchForm"'), '야전 제보 및 정오표(Errata) 양식 폼 탑재');
    assert.ok(html.includes('handleDispatch'), '로컬 샌드박스 버퍼링 핸들러 탑재');
  });

  it('19-7: 모든 정책 페이지의 인라인 <script> 블록에 JS 문법 오류(SyntaxError)가 0건이어야 한다', () => {
    const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    for (const p of policyPages) {
      const html = fs.readFileSync(path.join(publicDir, p.file), 'utf-8');
      let m: RegExpExecArray | null;
      let sIdx = 0;
      while ((m = scriptRe.exec(html)) !== null) {
        sIdx++;
        const attrs = m[1] || '';
        const code = m[2] || '';
        if (attrs.includes('application/ld+json') || !code.trim()) continue;
        assert.doesNotThrow(
          () => new vm.Script(code, { filename: `${p.file}#script${sIdx}` }),
          `${p.file}#script${sIdx} 인라인 스크립트에 JS 문법 오류가 없어야 함`
        );
      }
    }
  });

  it('19-8: sitemap.xml과 sw.js에 4대 정책 페이지가 완벽히 등록되어야 한다', () => {
    const sitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf-8');
    const sw = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf-8');

    for (const p of policyPages) {
      assert.ok(sitemap.includes(`${SITE_META.siteUrl}${p.path}`), `sitemap.xml에 ${p.path} 등록 확인`);
      assert.ok(sw.includes(`"${p.path}"`), `sw.js에 ${p.path} 캐시 등록 확인`);
      assert.ok(sw.includes(`"/${p.file}"`), `sw.js에 /${p.file} 캐시 등록 확인`);
    }
  });
});
