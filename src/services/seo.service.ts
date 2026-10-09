import type { Protocol } from '../types/index.ts';
import { SITE_META, ADSENSE_CONFIG, SEO_CONFIG } from '../site.config.ts';

/**
 * [Service Layer]
 * 구글 검색엔진 최적화(SEO), 사이트맵/로봇/ads.txt 자동 생성 및 애드센스 인프라 서비스
 */
export class SeoService {
  /**
   * Google / Naver / Bing 표준 XML 사이트맵 생성 (다국어 hreflang 포함)
   */
  public static generateSitemap(protocols: Protocol[], siteUrl: string = SITE_META.siteUrl): string {
    const today = new Date().toISOString().split('T')[0];

    const entries: string[] = [
      `  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${siteUrl}/?lang=ko"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/?lang=en"/>
    <xhtml:link rel="alternate" hreflang="ja" href="${siteUrl}/?lang=ja"/>
  </url>`,
    ];

    for (const p of protocols) {
      const num = p.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
      const pagePath = `${siteUrl}/protocol-${num}`;
      entries.push(`  <url>
    <loc>${pagePath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${pagePath}?lang=ko"/>
    <xhtml:link rel="alternate" hreflang="en" href="${pagePath}?lang=en"/>
    <xhtml:link rel="alternate" hreflang="ja" href="${pagePath}?lang=ja"/>
  </url>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`.trim();
  }

  /**
   * 검색 로봇 제어 표준 robots.txt 생성
   */
  public static generateRobotsTxt(siteUrl: string = SITE_META.siteUrl): string {
    return `# [SURVIVAL PROTOCOL // ROBOTS.TXT]
User-agent: *
Allow: /
Allow: /sw.js
Allow: /manifest.webmanifest
Allow: /icons/

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml
`.trim();
  }

  /**
   * 구글 애드센스 승인 및 수익화를 위한 ads.txt 생성
   */
  public static generateAdsTxt(customContent?: string): string {
    return (customContent || ADSENSE_CONFIG.adsTxt).trim() + '\n';
  }

  /**
   * Google 검색결과 리치 스니펫용 Schema.org HowTo & Article JSON-LD 구조화 데이터 생성
   */
  public static generateJsonLd(protocol: Protocol, siteUrl: string = SITE_META.siteUrl): string {
    const num = protocol.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
    const pageUrl = `${siteUrl}/protocol-${num}`;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `${protocol.protocolId}: ${protocol.title}`,
      description: protocol.summary,
      url: pageUrl,
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: 'USD',
        value: '0',
      },
      totalTime: 'PT30M',
      supply: protocol.materials.map((m) => ({
        '@type': 'HowToSupply',
        name: m.name,
      })),
      step: protocol.steps.map((s, idx) => ({
        '@type': 'HowToStep',
        position: idx + 1,
        name: `Step ${s.stepNumber}: ${s.title}`,
        text: s.description,
        url: `${pageUrl}#step-${s.stepNumber}`,
      })),
    };

    return JSON.stringify(schema, null, 2);
  }

  /**
   * Google AdSense 공식 비동기 스크립트 태그 렌더링
   */
  public static renderAdsenseHeadScript(clientId: string = ADSENSE_CONFIG.clientId): string {
    if (!clientId) return '<!-- AdSense: Client ID not configured -->';
    return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}" crossorigin="anonymous"></script>`;
  }

  /**
   * Google / Naver 서치콘솔 소유권 확인 메타태그 렌더링
   */
  public static renderVerificationMetaTags(): string {
    const tags: string[] = [];
    if (SEO_CONFIG.googleSiteVerification) {
      tags.push(`<meta name="google-site-verification" content="${SEO_CONFIG.googleSiteVerification}">`);
    }
    if (SEO_CONFIG.naverSiteVerification) {
      tags.push(`<meta name="naver-site-verification" content="${SEO_CONFIG.naverSiteVerification}">`);
    }
    return tags.join('\n  ');
  }

  /**
   * 브루탈리즘 테마와 조화되는 세련된 반응형 광고 슬롯 컨테이너
   */
  public static renderAdContainer(slotId?: string): string {
    if (!ADSENSE_CONFIG.clientId || !slotId) {
      // 미설정 시 UI 영역을 해치지 않는 빈 컨테이너 반환
      return '';
    }
    return `
    <div class="my-6 border border-neutral-800 bg-[#080808] p-2 text-center text-xs text-neutral-500 font-mono">
      <div class="mb-1 text-[10px] uppercase text-neutral-600">[ADVERTISEMENT // FIELD SPONSOR]</div>
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${ADSENSE_CONFIG.clientId}"
           data-ad-slot="${slotId}"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>
    `.trim();
  }
}
