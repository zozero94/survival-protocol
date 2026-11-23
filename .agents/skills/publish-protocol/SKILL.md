---
name: publish-protocol
description: 생존 프로토콜(재난에서 살아남기) 신규 주제를 기획서(NEXT_TOPIC_PROMPT.md)로부터 방안 A+ 다크 테크니컬 넘버링 WebP 도면(16:9 결과도 및 3~6단계 1:1 스텝도), 7개국어 원형 HTML 범례, 초등학생 눈높이 본문, 6개국어 번역, 타임스탬프 동기화, 203+ 전수 테스트 및 PWA 빌드까지 원스톱으로 자율 발행하는 공식 스킬.
---

# ⚔️ [SURVIVAL PROTOCOL // 신규 생존 교범 자율 발행 파이프라인]

본 스킬은 `NEXT_TOPIC_PROMPT.md`에 기획된 차기 생존 프로토콜(`PR-XX`)을 읽고, **방안 A+ 넘버링 테크니컬 도면(`.webp`)** 생성부터 본문 작성, 7개국어 원형 HTML 범례 연동(`data-svg-legend-*`), 6대 언어 번역, 품질 심사, 사이트 컴파일, 테스트 통과, `sync` 연계까지 단일 세션에서 결함 없이 완결하는 공식 파이프라인이다.

---

## 📋 7단계 자율 발행 프로세스 (순서 엄수)

### [Phase 0] 차기 기획서 및 지식 트리 로드
1. **작업 시작 전 원격 최신 동기화 (Pre-Task Remote Sync)**: `git pull --ff-only origin main`을 실행하여 원격 저장소의 최신 커밋을 로컬에 먼저 반영한다.
2. `NEXT_TOPIC_PROMPT.md`를 열어 `PR-XX` 주제, 카테고리(`FOOD`, `SHELTER`, `TOOLS`, `MATERIALS`, `MEDICINE`), 결핍 상황, 단계별 실행 지침을 파악한다.
3. `content/knowledge-tree.json`을 열어 해당 프로토콜이 속할 도메인(`WATER`, `FIRE`, `SHELTER`, `TOOLS`, `FOOD`, `MEDICINE`) 및 분과를 확인한다.
4. **핵심 원칙 사전 점검**:
   - **완제품 우선 & 비상 대체 호환 (Ready-Made Alternative)**: 시판 완제품 장비가 있을 때의 활용법을 상단에 먼저 명시하고, 고갈 시 주변 생활 폐자재/자연물 DIY 대체 제작법을 본문으로 전개한다.
   - **매듭(Knot) 주제 영구 제외**: 정적 도면으로 전달 불가능한 매듭법은 다루지 않는다.
   - **무도구 원칙**: 자, 저울, 타이머 의존을 금지하고 손가락 마디, 뼘, 콩알 크기, 호흡 횟수 등 신체 감각 비유를 병기한다.

---

### [Phase 1] 방안 A+ 넘버링 테크니컬 도면 생성 · 시각 QA · WebP 압축 (`content/images/`)
1. **생성 엔진 & 할당량 기준**:
   - 기본 생성은 **Antigravity 내장 `image-generator` 서브에이전트**를 사용한다 (5시간 롤링 윈도우당 ~12~14장 ≈ ~2편 사이클; 5편 이상 배치 전환은 유료 `GEMINI_API_KEY` 활용 가능).
2. **도면 규격 & 스타일**:
   - **1:1 스텝 도면**: `pr{XX}-step-01-diagram.webp` ~ `pr{XX}-step-0{N}-diagram.webp` (`cwebp -q 84 -resize 800 0`, ~45~60KB)
   - **16:9 와이드 완성 결과물 도면**: `pr{XX}-outcome-diagram.webp` (`cwebp -q 84 -resize 1024 0`, ~60~90KB)
   - 다크 차콜 `#0b0d10` 캔버스 + `#161b22` 블루프린트 그리드 위에서 핸드잉크 입체 단면도와 자연스러운 재질 음영·확대경(Zoom Inset)을 표현한다.
   - **Strict Zero-Words Rule**: 이미지 내부에 글자/단어/단위(`8cm`, `3min`, `100°C` 등)를 일체 굽지 않고, 오직 **청록(`#22d3ee`) 이중 링 원형 배지(`1`, `2`, `3` / Outcome `1~5`) + 직선 지시선 + 끝점 도트**만 작도한다.
3. **필수 시각 QA (`read_file`)**:
   - 생성된 모든 이미지를 `read_file`로 직접 확인하여 ① 텍스트/오탈자 0건, ② 숫자 배지·지시선과 실제 부품·범례 1:1 매칭, ③ Track A/B 소재 고증(현대 금지물 0건)을 검증한다. (불합격 컷만 최대 1~2회 재생성)
4. *(레거시 폴백 호환)*: 기존 `svgFileName`(`content/svgs/*.svg`)이 남아 있는 경우 폴백으로 유지 가능하며, 신규 SVG를 추가할 때만 `SvgAuditService` & `tests/10_svg_audit_loop.test.ts`를 함께 갱신한다.

---

### [Phase 1.5] 3D 실물·식생 식별 에셋 생성 및 배치 (`content/images/`)
1. 각 스텝의 `deepDive.fieldSpecs`에 지정할 실물 이미지(`imageFileName`: `id-{slug}.jpg`)를 준비한다.
2. `image-generator`를 호출하여 4:3 종횡비의 사실적인 야전 실물 매크로 이미지를 생성·시각 검수한 뒤 `content/images/{imageFileName}`으로 저장한다.

---

### [Phase 2] 초등학생 눈높이 마스터 JSON 작성 (`content/protocols/`)
1. 경로: `content/protocols/{XX}-{slug}.json` (예: `41-pipe-burst-emergency-seal.json`)
2. **필수 스키마 규격** (`Protocol` 타입 엄수):
   - `protocolId`: `"PR-XX"`
   - `category`: 5대 SSOT 중 하나 (`FOOD`, `SHELTER`, `TOOLS`, `MATERIALS`, `MEDICINE`)
   - `title`: `[문제/상황] + [해결 행동] ~법` 형식의 쉬운 일상 한국어 직관 대제목 (**15~28자 권장, 10~35자 엄수, 재료 나열·괄호 부제 금지**)
   - `summary`: 재난 상황 정의 및 핵심 작동 원리 요약 (완제품 우선 활용법 및 비상 DIY 호환 안내 포함)
   - `materials`: 재료 목록 (`id`, `name`, `desc`, `isGathered` — `materials[].name` 내부 마크다운 링크 금지)
   - `steps`: 3~6단계 가변 스텝 (`stepNumber`, `title`, `description`, `actionNote`, **`imageFileName`**: `"pr{XX}-step-0{N}-diagram.webp"`, **`svgLabels`**: `[0]` 헤더 · `[1..N-2]` 도면 내 숫자 `1..N` 1:1 대응 설명 · `[N-1]` 앰버 핵심 요약, 필요 시 `svgFileName` 폴백 및 `deepDive.fieldSpecs`)
     - `description`: `1. **행동 키워드**: 구체적 행동 지침` 번호형 액션 체크리스트 규격 준수 (단일 번호 줄 240자 이하)
     - 내부 크로스링크: **반드시 클린 URL `[라벨](/protocol-YY)` 형식 (절대 `.html` 금지)**
   - `fatalMistake`: 치명적 실수 및 야전 안전 주의사항 (`title`, `description`, `consequence`)
   - `faqs`: 현장 돌발 상황 대응 Q&A 2~3종 (**반드시 `{ "question": "...", "causeDiagnostic": "...", "resolution": "..." }` 3개 키 구조 사용, 절대 `answer` 단일 키 사용 금지**)
   - `shortsScript`: `{ "hook": "...", "body": "...", "outro": "..." }`
   - `outcome`: 완성 결과물 프리뷰 (`title`, `description`, **`imageFileName`**: `"pr{XX}-outcome-diagram.webp"`, **`svgLabels`**: `[0]` 헤더 · `[1..N-2]` 번호 `1..5` 1:1 대응 설명 · `[N-1]` 최종 검수 핵심 요약, 필요 시 `svgFileName` 폴백)

---

### [Phase 3] 6개국 글로벌 다국어 번역 (`content/protocols/locales/`)
1. 타겟 언어: `en`, `ja`, `es`, `de`, `pt`, `zh-TW`
2. 경로: `content/protocols/locales/{XX}-{slug}.{lang}.json` (총 6개 파일)
3. 모든 필드(`title`, `summary`, `materials`, `steps`, `fatalMistake`, `faqs`, `shortsScript`, `outcome`)를 누락 없이 1:1 완벽 번역한다.
4. **도면 이미지 & 원형 HTML 범례 1:1 정합성**:
   - 7개 언어 JSON 모두 동일한 `imageFileName`(`pr{XX}-step-0{N}-diagram.webp`, `pr{XX}-outcome-diagram.webp`)을 공유한다.
   - 각 스텝 및 `outcome`의 `svgLabels` 배열 요소 개수·인덱스 매핑(`1..N` 호출 배지 순서)은 한국어 원본과 정확히 일치해야 하며 `data-svg-legend-*` 핫스왑 및 `tests/06_feed_pagination.test.ts`를 100% 통과해야 한다.

---

### [Phase 4] 품질 심사 & 회귀 검증
1. 필요 시 전문 서브에이전트 및 서비스 감사 호출:
   - `plain-korean-editor`: 난해어 배제 및 초등학생 눈높이 문체 검수
   - `posting-quality-auditor` & `legal-google-policy-auditor`: 5대 심층 품질 심사 (Safety Red-Team, 무도구 재현성, E-E-A-T SEO, 글로벌 현지화, 법무/정책)
   - `protocol-cross-linker`: 타 프로토콜과의 문맥 연결점 발굴 및 인라인 하이퍼링크 주입
   - `content-enrichment-auditor`: 인과 설명, 도면 충실도 및 실사 도감 보강 점검
   - *(기존 SVG 도면 수정/추가 시 `svg-design-auditor` 병행)*

---

### [Phase 5] 지식 트리 갱신 & 타임스탬프 동기화
1. `content/knowledge-tree.json` 갱신 (`totalProtocols`, 도메인 `protocolIds`, `protocols` 메타데이터).
2. 타임스탬프 동기화:
   ```bash
   npm run sync:timestamps
   ```

---

### [Phase 6] 정적 사이트 컴파일 & 전수 테스트 통과
1. 사이트 빌드 & 타입체크:
   ```bash
   npm run build && npm run typecheck
   ```
   (PWA 오프라인 캐시 `sw.js`, `public/index.html`, `public/protocol-XX.html`, `public/images/pr{XX}-*-diagram.webp`, 초성 검색 인덱스 갱신)
2. 전수 단위/통합 테스트 실행:
   ```bash
   npm test
   ```
   (**16개 스위트 / 203+ 전수 테스트 100% PASS, fail 0 확인**)

---

### [Phase 7] 문서 동기화(`sync`) & 사용자 승인 후 원격 배포
1. `README.md`, `PROJECT_SPEC.md`, `AGENTS.md`, `NEXT_TOPIC_PROMPT.md` (차기 `PR-{XX+1}` 기획으로 갱신) 동기화.
2. 로컬 프리뷰 서버(`npm run serve`) 링크(`http://localhost:3000/protocol-XX`) 제공.
3. ⚠️ **원격 `git push origin main` 및 `npm run gdrive:sync`는 사용자가 로컬 결과를 확인하고 명시적으로 승인(또는 `/goal` 배치에 명시)한 뒤 실행한다**:
   ```bash
   npm run gdrive:sync
   git add -A
   git commit -m "feat: publish PR-XX (<주제 영문/한글 요약>) and sync documentation"
   git push origin main
   ```
