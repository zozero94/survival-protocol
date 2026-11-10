<!-- ~/review-kit/build.py가 만든 파일. 여기를 고치지 말고 ~/review-kit/projects/survival-protocol.md를 고친다. -->

# Survival Protocol (재난에서 살아남기)

- **핵심 아키텍처**: Node.js 24 LTS, TypeScript ESM (`--experimental-strip-types`), 100% 오프라인 PWA (`sw.js`), Fuse.js 클라이언트 인메모리 초성 검색 엔진.
- **SSOT 문서**: `PROJECT_SPEC.md`, `AGENTS.md`, `content/knowledge-tree.json`.
- **5대 분과 엄격 준수**: `FOOD`, `SHELTER`, `TOOLS`, `MATERIALS`, `MEDICINE` 외의 임의 카테고리 추가 절대 금지.
- **내부 링크 클린 URL 원칙**: 마크다운 본문 및 크로스링크는 반드시 `[텍스트](/protocol-XX)` 형식이어야 하며, `.html` 확장자를 붙이지 않는다 (Vercel 308 리디렉션 방지).
- **매듭(Knot) 주제 영구 제외**: 2D/3D 정적 도면으로 시공간 전달이 불가능한 매듭법은 다루지 않는다.
- **초등학생 눈높이 문체 & 무도구 원칙**: 난해한 학술 용어(다공성, 흡착, 비등 멸균 등) 배제, 자·저울·타이머 없는 신체 감각 비유 병기.
- **7대 다국어 동기화**: `ko` (SSOT), `en`, `ja`, `es`, `de`, `pt`, `zh-TW` 1:1 라벨 및 핫스왑 지원.
- **빌드 및 테스트 파이프라인**: `npm test` (15개 스위트 / 160개 테스트 100% 통과 필수), `npm run build`, `npm run sync:timestamps`.

## 규칙 문서 (project-rules-auditor 전용 — 다른 에이전트는 읽고 넘긴다)

1. **프로토콜 발행 및 수정**
   - 신호: `content/protocols/`, `content/svgs/`, `content/images/` 변경
   - 규칙: 16:9 Outcome 도면(800x450), 3~4단계 스텝 도면, 7개 언어 번역본, `knowledge-tree.json` 1:1 매핑.
2. **SEO 및 PWA 무결성**
   - 신호: `src/services/seo.service.ts`, `src/services/pwa.service.ts`, `src/render*.ts`
   - 규칙: Canonical 태그, sitemap.xml, robots.txt, sw.js 캐시 해시 갱신 및 Vercel cleanUrls 규격 준수.
