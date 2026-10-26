/**
 * [Presentational Component]
 * 글로벌 통합 푸터 컴포넌트 (Stitch Tactical HUD Dark Brutalist 1:1 규격)
 * Google AdSense 필수 4대 신뢰성 링크(About, Privacy, Terms, Contact) 및 6대 생존 분과 색인 영구 고정 노출
 */
export type FooterActivePage = 'index' | 'about' | 'privacy' | 'terms' | 'contact' | 'protocol';

export function renderFooter(activePage: FooterActivePage = 'index'): string {
  const isAbout = activePage === 'about';
  const isPrivacy = activePage === 'privacy';
  const isTerms = activePage === 'terms';
  const isContact = activePage === 'contact';

  return `
<footer class="border-t border-neutral-800 bg-[#0a0a0a] text-neutral-400 font-mono text-xs w-full mt-auto">
  <!-- 상단 컴플라이언스 & 텔레메트리 헤더 레일 -->
  <div class="border-b border-neutral-900 px-4 sm:px-8 py-2.5 bg-[#0e0e0e]/80">
    <div class="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px]">
      <div class="flex items-center gap-2 text-neutral-300">
        <span class="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        <span class="font-bold tracking-wider uppercase">[SYSTEM STATUS: AIR-GAPPED &amp; PERSISTENT]</span>
      </div>
      <div class="flex items-center gap-4 text-neutral-500 text-[10px]">
        <span>REGISTRY: DOC-089</span>
        <span>•</span>
        <span>GDPR / ADSENSE / PWA COMPLIANT</span>
        <span>•</span>
        <a href="https://github.com/zozero94/survival-protocol" target="_blank" rel="noopener noreferrer" class="text-neutral-400 hover:text-white underline underline-offset-2">
          GIT: zozero94/survival-protocol
        </a>
      </div>
    </div>
  </div>

  <!-- 메인 4-컬럼 전술 그리드 -->
  <div class="max-w-5xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
    <!-- Col 1: 브랜드 선언문 & 사명 -->
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="inline-block w-2 h-2 bg-white"></span>
        <a href="/" data-i18n="brandLong" class="text-white font-bold text-xs uppercase tracking-widest hover:text-white/80 transition-colors">
          [생존 교범 // SURVIVAL PROTOCOL]
        </a>
      </div>
      <p data-i18n="footerDesc" class="text-neutral-400 text-[11px] leading-relaxed">
        한 번 방문한 페이지는 브라우저에 자동 저장되어 비행기 모드나 통신이 끊긴 상황에서도 언제든 열람할 수 있습니다.
      </p>
      <div class="pt-2 text-[10px] text-neutral-500 flex flex-col gap-1">
        <span data-i18n="footerTrait1">● 현대 공산품 의존도: 0.00%</span>
        <span data-i18n="footerTrait2">● 오프라인 단독 작동 보장 (PWA)</span>
        <span data-i18n="footerTrait3">● 100% 무상 공공 도메인 개방</span>
      </div>
    </div>

    <!-- Col 2: 신뢰성 & 법적 필수 규정 (Google AdSense E-E-A-T) -->
    <div class="space-y-3">
      <div class="text-white font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-neutral-800 flex items-center justify-between">
        <span data-i18n="footerCol2Title">신뢰성 &amp; 규정</span>
        <span class="text-[9px] text-neutral-500">COMPLIANCE</span>
      </div>
      <ul class="space-y-2 text-[11px]">
        <li>
          <a href="/about" class="flex items-center gap-1.5 transition-colors ${
            isAbout ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
          }">
            <span class="${isAbout ? 'text-emerald-400' : 'text-neutral-600'}">■</span>
            <span data-i18n="footerLinkAbout">프로젝트 철학 &amp; 검증 체계 (About)</span>
          </a>
        </li>
        <li>
          <a href="/privacy" class="flex items-center gap-1.5 transition-colors ${
            isPrivacy ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
          }">
            <span class="${isPrivacy ? 'text-emerald-400' : 'text-neutral-600'}">■</span>
            <span data-i18n="footerLinkPrivacy">개인정보처리방침 (Privacy Policy)</span>
          </a>
        </li>
        <li>
          <a href="/terms" class="flex items-center gap-1.5 transition-colors ${
            isTerms ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
          }">
            <span class="${isTerms ? 'text-emerald-400' : 'text-neutral-600'}">■</span>
            <span data-i18n="footerLinkTerms">이용약관 및 면책고지 (Terms)</span>
          </a>
        </li>
        <li>
          <a href="/contact" class="flex items-center gap-1.5 transition-colors ${
            isContact ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
          }">
            <span class="${isContact ? 'text-emerald-400' : 'text-neutral-600'}">■</span>
            <span data-i18n="footerLinkContact">비상 통신 &amp; 기술 제보 (Contact)</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Col 3: 분과별 교범 색인 -->
    <div class="space-y-3">
      <div class="text-white font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-neutral-800 flex items-center justify-between">
        <span data-i18n="footerCol3Title">생존 분과 색인</span>
        <span class="text-[9px] text-neutral-500">ARCHIVE TIERS</span>
      </div>
      <ul class="space-y-1.5 text-[11px]">
        <li><a href="/?cat=FOOD" class="text-neutral-400 hover:text-white flex justify-between"><span data-i18n="footerCat1">[01 FOOD] 물·식량·보존</span><span class="text-neutral-600">04 DOCS</span></a></li>
        <li><a href="/?cat=SHELTER" class="text-neutral-400 hover:text-white flex justify-between"><span data-i18n="footerCat2">[02 SHELTER] 불·거처·보온</span><span class="text-neutral-600">04 DOCS</span></a></li>
        <li><a href="/?cat=TOOLS" class="text-neutral-400 hover:text-white flex justify-between"><span data-i18n="footerCat3">[03 TOOLS] 도구·의복·공작</span><span class="text-neutral-600">03 DOCS</span></a></li>
        <li><a href="/?cat=MATERIALS" class="text-neutral-400 hover:text-white flex justify-between"><span data-i18n="footerCat4">[04 MATERIALS] 소재·천연화학</span><span class="text-neutral-600">02 DOCS</span></a></li>
        <li><a href="/?cat=MEDICINE" class="text-neutral-400 hover:text-white flex justify-between"><span data-i18n="footerCat5">[05 MEDICINE] 의약·위생·방호</span><span class="text-neutral-600">02 DOCS</span></a></li>
      </ul>
    </div>

    <!-- Col 4: 오프라인 데이터 및 라이선스 -->
    <div class="space-y-3">
      <div class="text-white font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-neutral-800 flex items-center justify-between">
        <span data-i18n="footerCol4Title">기술 사양 &amp; 라이선스</span>
        <span class="text-[9px] text-neutral-500">OPEN PROTOCOL</span>
      </div>
      <div class="space-y-2 text-[11px] text-neutral-400">
        <p data-i18n="footerPersistence" class="leading-relaxed">
          단 1회 방문 시 전 페이지 HTML, SVG 도면, 검색 인덱스가 브라우저 로컬 저장소에 영구 보존됩니다.
        </p>
        <div class="pt-1 flex flex-col gap-1.5 text-[10px]">
          <a href="/sitemap.xml" data-i18n="footerSitemapLink" class="text-neutral-400 hover:text-white underline underline-offset-2">
            [XML SITEMAP // 검색엔진 색인]
          </a>
          <a href="/manifest.webmanifest" data-i18n="footerManifestLink" class="text-neutral-400 hover:text-white underline underline-offset-2">
            [PWA MANIFEST // 앱 설치 규격]
          </a>
          <span class="text-neutral-500">
            LICENSE: CC0 1.0 &amp; MIT PUBLIC DOMAIN
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- 하단 모노라인 메타데이터 및 법적 면책 고지 스트립 (모바일 하단 고정 바 회피용 패딩 pb-20 md:pb-4) -->
  <div class="border-t border-neutral-900 bg-[#050505] px-4 sm:px-8 pt-4 pb-20 md:pb-4 space-y-2">
    <p data-i18n="footerLegalNotice" class="max-w-5xl mx-auto text-neutral-600 text-[10px] leading-relaxed text-center sm:text-left">
      [안전 면책 및 개인정보 고지] 본 교범은 극한 조난·재난 대비 교육 목적으로 작성되었으며 평시 실습 시 화재·중독·부상 안전 수칙과 현지 법령을 준수해야 합니다. 서비스 품질 개선을 위해 개인 식별 정보가 제외된 익명 열람 통계(GA4/Firebase) 및 로컬 스토리지만을 사용합니다.
    </p>
    <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-neutral-500 text-center sm:text-left pt-1 border-t border-neutral-900/60">
      <div>
        POST-COLLAPSE SURVIVAL PROTOCOL // VER 2.4.0 // ZERO-INTERNET PERSISTENCE ACTIVE
      </div>
      <div>
        DEDICATED TO THE HUMAN PUBLIC DOMAIN // NO COMMERCIAL PAYWALLS EVER
      </div>
    </div>
  </div>
</footer>
  `.trim();
}
