import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SeoService } from '../src/services/seo.service.ts';
import { ProtocolGeneratorService } from '../src/services/protocol-generator.service.ts';

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
    assert.strictEqual(parsed.step.length, 3);
    assert.strictEqual(parsed.step[0].name, 'Step 01: 나무통 아랫부분을 천이나 이끼로 막기');
    assert.strictEqual(parsed.supply.length, 3);
  });

  it('renderAdsenseHeadScript는 기본 설정된 공식 클라이언트 ID(ca-pub-4169469417741632)와 메타/스크립트 태그를 반환해야 한다', () => {
    const tag = SeoService.renderAdsenseHeadScript();
    assert.ok(tag.includes('<meta name="google-adsense-account" content="ca-pub-4169469417741632">'));
    assert.ok(tag.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4169469417741632'));
  });
});
