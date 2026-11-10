---
name: publish-protocol
description: 생존 프로토콜(재난에서 살아남기) 신규 주제를 기획서(NEXT_TOPIC_PROMPT.md)로부터 16:9 와이드 결과도 및 3~4단계 3D 벡터 SVG 도면, 초등학생 눈높이 본문, 6개국어 번역, 타임스탬프 동기화, 전수 테스트 및 PWA 빌드까지 원스톱으로 자율 발행하는 공식 스킬.
---

# ⚔️ [SURVIVAL PROTOCOL // 신규 생존 교범 자율 발행 파이프라인]

본 스킬은 `NEXT_TOPIC_PROMPT.md`에 기획된 차기 생존 프로토콜(`PR-XX`)을 읽고, 기계역학적 SVG 도면 합성부터 본문 작성, 6대 언어 번역, 품질 심사, 사이트 컴파일, 테스트 통과, Git 배포까지 단일 세션에서 결함 없이 완결하는 공식 파이프라인이다.

---

## 📋 7단계 자율 발행 프로세스 (순서 엄수)

### [Phase 0] 차기 기획서 및 지식 트리 로드
1. **작업 시작 전 원격 최신 동기화 (Pre-Task Remote Sync)**: `git pull --ff-only origin main`을 실행하여 원격 저장소의 최신 커밋을 로컬에 먼저 반영한다.
2. `NEXT_TOPIC_PROMPT.md`를 열어 `PR-XX` 주제, 카테고리(`FOOD`, `SHELTER`, `TOOLS`, `MATERIALS`, `MEDICINE`), 결핍 상황, 4단계 실행 지침을 파악한다.
3. `content/knowledge-tree.json`을 열어 해당 프로토콜이 속할 도메인(`WATER`, `FIRE`, `SHELTER`, `TOOLS`, `FOOD`, `MEDICINE`) 및 분과를 확인한다.
4. **핵심 원칙 사전 점검**:
   - **완제품 우선 & 비상 대체 호환 (Ready-Made Alternative)**: 시판 완제품 장비가 있을 때의 활용법을 상단에 먼저 명시하고, 고갈 시 주변 생활 폐자재/자연물 DIY 대체 제작법을 본문으로 전개한다.
   - **매듭(Knot) 주제 영구 제외**: 2D 정적 도면으로 전달 불가능한 매듭법은 다루지 않는다.
   - **무도구 원칙**: 자, 저울, 타이머 의존을 금지하고 손가락 마디, 뼘, 콩알 크기, 호흡 횟수 등 신체 감각 비유를 병기한다.

---

### [Phase 1] 3D 벡터 SVG 기술 도면 합성 (`content/svgs/`)
1. **16:9 와이드 완성 결과물 도면**:
   - 경로: `content/svgs/pr{XX}-outcome.svg` (`viewBox="0 0 800 450"`)
   - 최종 완성된 도구/설비의 전체 결합 구조와 작동 원리를 조감도로 정밀 표현한다.
2. **3~4단계 스텝별 기술 도면**:
   - 경로: `content/svgs/pr{XX}-step-01.svg` ~ `pr{XX}-step-0{N}.svg` (`viewBox="0 0 680 340"` 또는 `0 0 800 450`)
   - 기계공학적 축선 정합성(접촉 오차 $\le 2\text{px}$), 칠흑의 다크 테크니컬 팔레트(`fill="#121212"`, `stroke="#333333"`, 강조 `#fde68a`, 경고 `#E02424`, 안전 `#4ade80`), 치수 보조선 및 `<text>` 라벨을 정밀 배치한다.
   - 각 SVG 도면의 `<text>` 라벨 개수와 내용은 스텝의 `svgLabels` 배열과 1:1로 일치해야 한다.

---

### [Phase 2] 초등학생 눈높이 마스터 JSON 작성 (`content/protocols/`)
1. 경로: `content/protocols/{XX}-{slug}.json` (예: `27-emergency-whistle-heliograph.json`)
2. **필수 스키마 규격** (`Protocol` 타입 엄수):
   - `protocolId`: `"PR-XX"`
   - `category`: 5대 SSOT 중 하나 (`FOOD`, `SHELTER`, `TOOLS`, `MATERIALS`, `MEDICINE`)
   - `title`: 행동 중심 직관적 대제목 (초등학생 11~13세 눈높이)
   - `summary`: 재난 상황 정의 및 핵심 작동 원리 요약
   - `readyMadeAlternative`: 완제품 우선 활용법 및 비상 DIY 호환 안내
   - `materials`: 재료 목록 (`name`, `qty`, `desc`, `fieldSpecs` 실물/식생 식별 정보)
   - `steps`: 3~4단계 가변 스텝 (`stepNumber`, `title`, `description`, `actionNote`, `svgFileName`, `svgLabels`)
     - `description`: `1. **행동 키워드**: 구체적 행동 지침` 번호형 액션 체크리스트 규격 준수
     - 내부 크로스링크: **반드시 클린 URL `[라벨](/protocol-YY)` 형식 (절대 `.html` 금지)**
   - `fatalMistake`: 치명적 실수 및 야전 안전 주의사항 (`mistake`, `consequence`, `prevention`)
   - `faqs`: 현장 돌발 상황 대응 Q&A 2~3종

---

### [Phase 3] 6개국 글로벌 다국어 번역 (`content/protocols/locales/`)
1. 타겟 언어: `en`, `ja`, `es`, `de`, `pt`, `zh-TW`
2. 경로: `content/protocols/locales/{XX}-{slug}.{lang}.json` (총 6개 파일)
3. 모든 필드(`title`, `summary`, `materials`, `steps`, `fatalMistake`, `faqs`, `svgLabels`)를 누락 없이 1:1 완벽 번역한다.
4. **SVG 라벨 수 일치**: 각 스텝의 `svgLabels` 배열 요소 개수는 원본 SVG의 `<text>` 개수 및 한국어 원본과 정확히 일치해야 한다 (Suite 10 정적 감사 통과 조건).

---

### [Phase 4] 품질 심사 & 회귀 검증
1. 필요 시 전문 서브에이전트 호출:
   - `svg-design-auditor`: 도면 기하학 공차 및 3D 시각 정합성 검수
   - `plain-korean-editor`: 난해어 배제 및 초등학생 눈높이 문체 검수
   - `posting-quality-auditor`: 4대 심층 품질 심사 (Safety Red-Team, 무도구 재현성, SEO, 글로벌 현지화)
   - `protocol-cross-linker`: 타 프로토콜과의 문맥 연결점 발굴 및 인라인 하이퍼링크 주입

---

### [Phase 5] 지식 트리 갱신 & 타임스탬프 동기화
1. `content/knowledge-tree.json` 갱신:
   - `totalProtocols` 수치 +1 증가
   - 해당 도메인(`domains[DOMAIN].protocolIds`)에 `"PR-XX"` 추가
   - `protocols` 배열에 메타데이터 객체 추가
2. 타임스탬프 동기화:
   ```bash
   npm run sync:timestamps
   ```
   (실질 콘텐츠 SHA-256 해시 지문 계산 및 `createdAt`/`updatedAt` 결정론적 영속화)

---

### [Phase 6] 정적 사이트 컴파일 & 전수 테스트 통과
1. 사이트 빌드:
   ```bash
   npm run build
   ```
   (PWA 오프라인 캐시 `sw.js`, `public/index.html`, `public/protocol-XX.html`, 초성 검색 인덱스 갱신)
2. 전수 단위/통합 테스트 실행:
   ```bash
   npm test
   ```
   (15개 스위트 / 160개 이상 전수 테스트 100% PASS 확인)

---

### [Phase 7] 전체 문서 동기화 & 원격 배포 (Git Commit & Push)
1. `README.md` 갱신: 25편 ➔ 26편 (총 발행 편수 갱신 및 카테고리 현황 테이블에 PR-XX 추가)
2. `NEXT_TOPIC_PROMPT.md` 갱신: 차기 프로토콜(`PR-{XX+1}`) 기획서로 프롬프트 교체
3. Git 커밋 및 푸시:
   ```bash
   git add -A
   git commit -m "feat: publish PR-XX (<주제 영문/한글 요약>) and sync documentation"
   git push origin main
   ```
