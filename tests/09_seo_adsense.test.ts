import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { SeoService } from '../src/services/seo.service.ts';
import { ProtocolGeneratorService } from '../src/services/protocol-generator.service.ts';
import { PROTOCOL_FAQS } from '../src/content/protocol-faqs.ts';

describe('🌐 [Suite 9: SEO & AdSense] 검색엔진 최적화 및 구글 애드센스 규격 전수 검증', () => {
  const protocols = ProtocolGeneratorService.listProtocols();

  it('sitemap.xml은 모든 프로토콜과 다국어 hreflang 속성을 정확히 포함해야 한다', () => {
    const sitemap = SeoService.generateSitemap(
      protocols.map((p) => ProtocolGeneratorService.getProtocolById(p.protocolId)!.data),
      'https://survival-protocol.com'
    );

    assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(sitemap.includes('<urlset'));
    assert.ok(sitemap.includes('https://survival-protocol.com/'));
    assert.ok(sitemap.includes('https://survival-protocol.com/protocol-01'));
    protocols.forEach((p) => {
      const num = p.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
      assert.ok(sitemap.includes(`https://survival-protocol.com/protocol-${num}`));
    });
    assert.ok(sitemap.includes('hreflang="ko"'));
    assert.ok(sitemap.includes('hreflang="en"'));
    assert.ok(sitemap.includes('hreflang="ja"'));
    assert.ok(sitemap.includes('hreflang="es"'));
    assert.ok(sitemap.includes('hreflang="de"'));
    assert.ok(sitemap.includes('hreflang="pt"'));
    assert.ok(sitemap.includes('hreflang="zh-TW"'));
    assert.ok(sitemap.includes('hreflang="x-default"'));
  });

  it('robots.txt는 모든 봇을 허용하고 사이트맵 경로를 정확히 지시해야 한다', () => {
    const robots = SeoService.generateRobotsTxt('https://survival-protocol.com');
    assert.ok(robots.includes('User-agent: *'));
    assert.ok(robots.includes('Allow: /'));
    assert.ok(robots.includes('Sitemap: https://survival-protocol.com/sitemap.xml'));
  });

  it('ads.txt는 구글 공식 AdSense 규격 형식을 만족해야 한다', () => {
    const adsTxt = SeoService.generateAdsTxt();
    assert.strictEqual(adsTxt.trim(), 'google.com, pub-4169469417741632, DIRECT, f08c47fec0942fa0');
  });

  it('generateJsonLd는 유효한 Schema.org HowTo 스키마를 생성해야 한다', () => {
    const proto1 = ProtocolGeneratorService.getProtocolById('PR-01')!.data;
    const jsonLdRaw = SeoService.generateJsonLd(proto1, 'https://survival-protocol.com');
    const parsed = JSON.parse(jsonLdRaw);

    assert.strictEqual(parsed['@context'], 'https://schema.org');
    assert.strictEqual(parsed['@type'], 'HowTo');
    assert.ok(parsed.name.includes('PR-01'));
    assert.strictEqual(parsed.step.length, proto1.steps.length);
    assert.ok(parsed.step[0].name.includes(proto1.steps[0].title));
    assert.strictEqual(parsed.supply.length, proto1.materials.length);
  });

  it('renderAdsenseHeadScript는 기본 설정된 공식 클라이언트 ID(ca-pub-4169469417741632)와 메타/스크립트 태그를 반환해야 한다', () => {
    const tag = SeoService.renderAdsenseHeadScript();
    assert.ok(tag.includes('<meta name="google-adsense-account" content="ca-pub-4169469417741632">'));
    assert.ok(tag.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4169469417741632'));
  });

  it('generateFaqJsonLd는 유효한 Schema.org FAQPage 스키마를 생성해야 한다', () => {
    const faqs = PROTOCOL_FAQS['PR-01'];
    assert.ok(faqs && faqs.length >= 2, 'PR-01 FAQ 항목이 최소 2개 이상 존재해야 합니다.');
    const jsonLdRaw = SeoService.generateFaqJsonLd(faqs);
    assert.ok(jsonLdRaw, 'FAQ JSON-LD 문자열이 생성되어야 합니다.');
    const parsed = JSON.parse(jsonLdRaw);

    assert.strictEqual(parsed['@context'], 'https://schema.org');
    assert.strictEqual(parsed['@type'], 'FAQPage');
    assert.strictEqual(parsed.mainEntity.length, faqs.length);
    assert.strictEqual(parsed.mainEntity[0]['@type'], 'Question');
    assert.strictEqual(parsed.mainEntity[0].name, faqs[0].question);
    assert.strictEqual(parsed.mainEntity[0].acceptedAnswer['@type'], 'Answer');
    assert.strictEqual(parsed.mainEntity[0].acceptedAnswer.text, faqs[0].resolution);
  });

  it('전체 프로토콜 HTML(PR-01~PR-12)은 접이식 FAQ 컴포넌트와 FAQPage 구조화 데이터를 온전히 탑재해야 한다', () => {
    const publicDir = path.resolve('public');
    protocols.forEach((p) => {
      const num = p.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
      const filePath = path.join(publicDir, `protocol-${num}.html`);
      assert.ok(fs.existsSync(filePath), `HTML 파일이 존재해야 합니다: ${filePath}`);

      const html = fs.readFileSync(filePath, 'utf-8');

      // 1. FAQ 섹션 마크업 존재 여부
      assert.ok(
        html.includes('aria-label="Field Troubleshooting Accordion Nodes"'),
        `[${p.protocolId}] 접이식 FAQ 섹션 아코디언이 누락되었습니다.`
      );

      // 2. 가독성을 위해 기본 상태에서 접혀있어야 함 (<details> بدون open)
      const detailsMatches = html.match(/<details\b[^>]*>/g) || [];
      assert.ok(detailsMatches.length >= 2, `[${p.protocolId}] 최소 2개 이상의 FAQ 아코디언이 있어야 합니다.`);
      for (const d of detailsMatches) {
        assert.ok(
          !d.includes(' open'),
          `[${p.protocolId}] 사용자의 쾌적한 열람을 위해 FAQ는 기본 접힘 상태(open 속성 없음)여야 합니다: ${d}`
        );
      }

      // 3. Schema.org FAQPage 구조화 데이터 탑재 확인
      assert.ok(
        html.includes('"@type": "FAQPage"'),
        `[${p.protocolId}] Schema.org FAQPage JSON-LD가 누락되었습니다.`
      );
    });
  });
});
