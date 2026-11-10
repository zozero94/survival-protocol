# 🤖 [SURVIVAL PROTOCOL // AGENT SYSTEM CONTEXT & NAVIGATION GUIDE]
> **AI 에이전트 인수인계 및 고속 컨텍스트 로딩 가이드**  
> 본 프로젝트(`survival-protocol`)에 참여하는 모든 AI 에이전트는 대화 시작 시 본 문서를 최우선 참조하여 아키텍처와 규칙을 파악하십시오.

---

## 🧭 1. 프로젝트 개요 & 미션
- **사이트명**: 재난에서 살아남기 (`survival-protocol.com`)
- **미션**: 대규모 재난(정전·단수·전쟁)부터 문명이 멈춘 포스트 아포칼립스 상황까지, 주변의 버려진 생활 폐자재와 자연물을 활용해 생명을 유지하기 위한 실전 생존 기술을 흑백 브루탈리즘 야전 교본 스타일로 디지털 아카이빙.
- **핵심 기술 스택**: TypeScript (ESM, `--experimental-strip-types`), PWA (100% 완전 오프라인 캐시), Fuse.js (인메모리 초성 검색), Tailwind CSS (Brutalist Dark HUD).
- **글로벌 7대 다국어**: `ko` (한국어 SSOT), `en`, `ja`, `es`, `de`, `pt`, `zh-TW` (0.01초 무새로고침 핫스왑).

---

## 🗺️ 2. 핵심 파일 및 단일 진실 공급원 (SSOT) 맵

AI 에이전트가 탐색할 때 무차별 검색(`grep/find`) 대신 아래 경로를 직접 참조하십시오:

| 역할 / 성격 | 파일 경로 | 설명 |
|:---|:---|:---|
| **지식 그래프 트리** | [content/knowledge-tree.json](file:///home/antigravity/zozero94/survival-protocol/content/knowledge-tree.json) | 6대 도메인(WATER, FIRE, SHELTER, TOOLS, FOOD, MEDICINE) 및 프로토콜 ID 색인 |
| **전체 기술 명세서** | [PROJECT_SPEC.md](file:///home/antigravity/zozero94/survival-protocol/PROJECT_SPEC.md) | 아키텍처, 4대 품질 심사 체계, 5대 카테고리 규격, 코딩 컨벤션 |
| **차기 작업 큐** | [NEXT_TOPIC_PROMPT.md](file:///home/antigravity/zozero94/survival-protocol/NEXT_TOPIC_PROMPT.md) | 다음에 제작할 차기 프로토콜 기획서 및 프롬프트 |
| **전체 배포 인덱스** | [README.md](file:///home/antigravity/zozero94/survival-protocol/README.md) | 26개 전 프로토콜 발행 현황표 및 카테고리 색인 |
| **사이트 메타 & 환경** | [src/site.config.ts](file:///home/antigravity/zozero94/survival-protocol/src/site.config.ts) | 도메인, PWA 경로, AdSense, Firebase 설정 |
| **타입 인터페이스** | [src/types/protocol.types.ts](file:///home/antigravity/zozero94/survival-protocol/src/types/protocol.types.ts) | `Protocol`, `ProtocolStep`, `MaterialItem` 등 강타입 SSOT |
| **다국어 사전** | [src/i18n/ui-strings.ts](file:///home/antigravity/zozero94/survival-protocol/src/i18n/ui-strings.ts) | 7개국어 UI 텍스트 사전 (`UI_STRINGS`) |

---

## 📁 3. 결정론적 디렉토리 네이밍 규칙

새로운 프로토콜 `PR-XX`를 생성하거나 수정할 때는 다음 경로를 1:1로 매핑합니다:

```text
content/
├── protocols/
│   ├── {XX}-{slug}.json                  # 마스터 데이터 (한국어 원본)
│   └── locales/
│       ├── {XX}-{slug}.en.json           # 영어 번역본
│       ├── {XX}-{slug}.ja.json           # 일본어 번역본
│       ├── {XX}-{slug}.es.json           # 스페인어 번역본
│       ├── {XX}-{slug}.de.json           # 독일어 번역본
│       ├── {XX}-{slug}.pt.json           # 포르투갈어 번역본
│       └── {XX}-{slug}.zh-TW.json        # 중국어 번체 번역본
├── svgs/
│   ├── pr{XX}-outcome.svg                # 16:9 와이드 결과물 프리뷰 도면 (800×450)
│   ├── pr{XX}-step-01.svg                # 1단계 인라인 기술 도면
│   ├── pr{XX}-step-02.svg                # 2단계 인라인 기술 도면
│   ├── pr{XX}-step-03.svg                # 3단계 인라인 기술 도면
│   └── pr{XX}-step-04.svg                # 4단계 인라인 기술 도면
└── images/
    └── id-{asset-slug}.jpg               # 3D 포토리얼 실물/식생 식별 에셋
```

---

## ⚙️ 4. 필수 명령어 및 빌드 파이프라인

터미널에서 작업 수행 시 다음 명령어를 표준으로 사용합니다:

```bash
# 0. 작업 시작 전 원격 최신 동기화 (Pre-Task Remote Sync)
git pull --ff-only origin main

# 1. 의존성 설치
npm install

# 2. 전수 단위/통합 테스트 (15개 스위트 / 160개 테스트)
npm test

# 3. 정적 웹진 컴파일 & PWA 오프라인 캐시 빌드 (public/ 생성)
npm run build

# 4. 콘텐츠 SHA-256 해시 및 타임스탬프 영속화 동기화
npm run sync:timestamps

# 5. SVG 기하학 공차 및 다국어 텍스트 정적 감사
npm run audit:svg-design

# 6. TypeScript 컴파일 무결성 검사
npm run typecheck
```

---

## 🚫 5. 에이전트 절대 준수 규칙 (Hard Constraints)

1. **작업 시작 전 원격 최신 동기화 (Pre-Task Remote Sync)**:
   - 새로운 작업이나 기능 개발, 프로토콜 발행 등 작업 착수 전, 반드시 원격 저장소(`origin/main`)에 pull할 내용이 있는지 확인하고(`git pull --ff-only origin main`), 최신 상태로 업데이트한 뒤 작업을 진행하십시오.
2. **내부 링크 클린 URL 준수 (No `.html` in Markdown Links)**:
   - 본문 크로스링크는 반드시 `[텍스트](/protocol-XX)` 형식이어야 합니다. `.html` 확장자를 붙이지 마십시오 (Vercel 308 리디렉션 방지).
3. **매듭(Knot) 주제 영구 제외**:
   - 2D/3D 정적 도면만으로 시공간 조작 전달이 불가능한 매듭법은 다루지 않습니다 (PR-07은 아카이브 격리됨).
4. **5대 SSOT 카테고리 강타입 준수**:
   - `FOOD`, `SHELTER`, `TOOLS`, `MATERIALS`, `MEDICINE` 외의 임의 카테고리는 허용되지 않습니다.
5. **초등학생(11~13세) 눈높이 문체 & 무도구 원칙**:
   - 난해한 학술 용어(다공성, 비등 멸균, 흡착 등)는 일상어로 순화하십시오.
   - 자·저울·타이머 등 현대 계측기 의존을 금지하고, 뼘·손가락 마디·콩알 크기 등 신체 감각 비유를 병기하십시오.
6. **완제품 우선 & 비상 대체 호환 (Ready-Made Alternative)**:
   - 시판 완제품 장비가 있을 때의 활용법을 먼저 안내하고, 없을 때의 DIY 대체법을 제시하십시오.

---

## 👥 6. 전문 서브에이전트 역할 목록 (`.agents/agents/`)

복합 작업 시 다음 전문 서브에이전트를 호출(`invoke_subagent`)하여 협업하십시오:

| 서브에이전트 명칭 | 전담 역할 및 검수 영역 |
|:---|:---|
| `svg-design-auditor` | SVG 벡터 도면 기계공학 축선 정합성, 유클리드 좌표 공차, 3D 재질 리얼리즘 검수 |
| `protocol-cross-linker` | 타 프로토콜과의 문맥 연결점 발굴 및 인라인 하이퍼텍스트 링크 주입 |
| `posting-quality-auditor` | 4대 심층 품질 심사 (안전성 Red-Team, 무도구 재현성, E-E-A-T SEO, 7개 언어 현지화) |
| `plain-korean-editor` | 난해어 자동 교정 및 초등학생 눈높이 테크니컬 라이팅 문체 감수 |
| `qa-test-automation-engineer` | 테스트 스위트 커버리지 감사 및 런타임 회귀 테스트 설계 |
| `release-sre-readiness-auditor` | PWA 오프라인 작동, 무장애 배포, SEO 메타태그 최종 점검 |
