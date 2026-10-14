# [생존 교범 // SURVIVAL PROTOCOL]
> **"모든 전기가 끊겼을 때, 오직 두 손과 이 기록만으로 살아남는다."**  
> Post-Collapse Primitive Survival Field Manual & Autonomous Knowledge Pipeline

---

## 🧭 프로젝트 개요
현대 문명이 붕괴되고 글로벌 통신망과 전력망이 영구 단절되었을 때, 라이터나 플라스틱 등 현대 인공물에 일체 의존하지 않고 자연물과 두 손만으로 생명을 유지하기 위한 실전 원시 생존 기술 기록서입니다.

* **완전 오프라인 PWA (Progressive Web App)**: 1회 방문 시 모든 교범 데이터와 스타일이 기기에 사전 캐시되어 비행기 모드 및 통신 두절 시에도 100% 작동
* **7대 글로벌 다국어 지원**: `ko` (한국어), `en` (영어), `ja` (일본어), `es` (스페인어), `de` (독일어), `pt` (포르투갈어), `zh-TW` (중국어 번체) 무새로고침 0.01초 핫스왑
* **6대 생존 공학 체계**: 식수 확보, 불 피우기, 은신처, 식량 채집, 원시 도구, 야전 의약
* **5개 단위 페이징 피드**: Git JSON 기반 데이터셋 자동 스캔 및 0.01초 무새로고침 페이징
* **브루탈리즘 테크니컬 디자인**: 칠흑의 피치 블랙(`border-radius: 0px`), 1:1 정밀 벡터 인라인 도면 및 16:9 와이드스크린 결과물 프리뷰(Target Outcome)
* **비번호 독립 문서 체계**: 가이드 간 읽는 순서 제약이 없도록 사용자 화면 전반에서 `PR-XX` 일련번호 전면 배제

---

## 🧱 6대 생존 공학 분과 및 발행 현황 (총 7편 배포 완료)

| 카테고리 | 가이드 명칭 | 결과물 도면 | 세부 스텝 도면 | 다국어 지원 | 배포 상태 |
|:---:|:---|:---:|:---:|:---:|:---:|
| **WATER** | [흙탕물을 깨끗한 식수로 바꾸는 법 (숯·모래 정수기)](public/protocol-01.html) | `pr01-outcome.svg` | 5단계 (FIG 01~05) | 7개국어 완비 | ✅ 라이브 |
| **FIRE** | [나뭇가지 마찰로 불 피우는 법 (활비비 불피우기)](public/protocol-02.html) | `pr02-outcome.svg` | 3단계 (FIG 01~03) | 7개국어 완비 | ✅ 라이브 |
| **SHELTER** | [불 없이 체온을 지키는 낙엽 움막 만드는 법](public/protocol-03.html) | `pr03-outcome.svg` | 3단계 (FIG 01~03) | 7개국어 완비 | ✅ 라이브 |
| **TOOLS** | [깬 돌과 칡덩굴로 나무 베는 돌도끼 만드는 법](public/protocol-04.html) | `pr04-outcome.svg` | 3단계 (FIG 01~03) | 7개국어 완비 | ✅ 라이브 |
| **TOOLS** | [나무껍질과 칡덩굴을 꼬아 끊어지지 않는 야생 밧줄 만드는 법](public/protocol-05.html) | `pr05-outcome.svg` | 5단계 (FIG 01~05) | 7개국어 완비 | ✅ 라이브 |
| **SHELTER** | [진흙과 돌을 쌓아 비바람을 막고 열기를 가두는 원시 화덕 만드는 법](public/protocol-06.html) | `pr06-outcome.svg` | 5단계 (FIG 01~05) | 7개국어 완비 | ✅ 라이브 |
| **FOOD** | [나뭇가지 3개와 바위로 짐승 잡는 법 (숫자 4 모양 돌 덫)](public/protocol-08.html) | `pr08-outcome.svg` | 4단계 (FIG 01~04) | 7개국어 완비 | ✅ 라이브 |

> **[주제 정책 공지: 매듭(Knot) 주제 영구 제외]**: 2D/3D 정적 도면만으로 직관적 공간 조작을 전달하기 어렵고 야전 혼선을 초래하는 매듭법은 파이프라인에서 영구 제외되었으며, 기존 PR-07은 `_archived_shells/`로 안전 격리되었습니다 (단, 3D 벡터 도면 기술 자산은 영구 보존).

---

## 📂 아키텍처 구조
```text
primitive-survival/
├── content/               # [Content Layer] Git 기반 순수 JSON 프로토콜 & 지식 트리
│   ├── protocols/         # 개별 생존 교범 마스터 데이터 (PR-01 ~ PR-08)
│   │   └── locales/       # 6개 타겟 언어 번역본 (en, ja, es, de, pt, zh-TW)
│   ├── svgs/              # 1:1 공용 벡터 기술 도면 (총 39종: 스텝 31 + 결과물 8)
│   └── knowledge-tree.json# 문명 복원 지식 그래프 (도메인/티어/분과)
├── src/
│   ├── types/             # [Type Layer] TypeScript 엄격 규격 (단일 진실 공급원)
│   ├── site.config.ts     # 사이트 메타데이터, PWA 경로, AdSense 설정
│   ├── i18n/              # [i18n Layer] 7대 언어 사전 및 무상태 판별 엔진
│   ├── state/             # [State Layer] 페이징, 카테고리 필터, 테마, 선언적 바인딩 스크립트
│   ├── components/        # [Presentational Layer] 순수 UI 컴포넌트 (DOM 무의존)
│   │   ├── feed/          # FeedHeader, ProtocolCard, Pagination
│   │   ├── layout/        # Header, StickyActionBar
│   │   └── protocol/      # HeroSection, OutcomePreview, Checklist, StepCard, FatalWarning
│   ├── services/          # [Service Layer]
│   │   ├── pwa.service.ts # 결정론적 Service Worker 캐시 생성
│   │   ├── google-drive.service.ts # 구글 드라이브 OAuth2 연동 및 문서 동기화
│   │   ├── svg-audit.service.ts # 5중 루프 가드 & 도면 기하학 충돌 감사기
│   │   ├── svg-generator.service.ts # Gemini SVG 합성 및 폴백 생성기
│   │   ├── protocol-generator.service.ts # AI 자동 발행 & 고증 검증기
│   │   ├── telegram-bot.service.ts # 텔레그램 원격 제어 봇
│   │   ├── deploy.service.ts # Git 커밋 & 푸시 자동화
│   │   ├── seo.service.ts # sitemap.xml, robots.txt, Schema.org
│   │   └── topic-curator.service.ts # 지식 트리 연계 차기 주제 큐레이터
│   ├── gdrive-sync.ts     # 구글 드라이브 문서 동기화 CLI 엔트리
│   ├── render.ts          # 상세 교범 정규 웹 페이지 컴파일러
│   ├── render-index.ts    # 5개 페이징 메인 피드 인덱스 컴파일러
│   └── pipeline.ts        # 엔드투엔드 정적 사이트 컴파일 파이프라인
├── api/                   # [Serverless Layer] Vercel 서버리스 웹훅 엔드포인트
│   └── telegram.js        # 텔레그램 웹훅 핸들러 (AES-256-GCM 보안 컨텍스트)
├── public/                # [Build Artifacts] 최종 정적 HTML, sw.js, manifest, sitemap
└── tests/                 # [Quality Audit] 10대 테스트 스위트 (70/70 PASS)
```

---

## 🚀 빠른 시작 (Local Development)

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일에 TELEGRAM_BOT_TOKEN 및 GEMINI_API_KEY 설정 (선택 사항)
```

### 3. 정적 빌드 및 컴파일
```bash
npm run build
# 또는
node --experimental-strip-types src/pipeline.ts
```

### 4. 품질 감사 테스트 실행
```bash
npm test
```
*(70개 전수 테스트: 1) 원시 고증 방어, 2) 스키마 규격, 3) LLM 회복력, 4) HTML 무결성 & FOUC 차단, 5) 5개 페이징 & 피드, 6) PWA 오프라인 캐시, 7) 텔레그램 봇 인가 제어, 8) 자동 생성 파이프라인, 9) SEO & AdSense 규격, 10) 벡터 도면 기하학 감사 & 무한루프 차단, 11) 구글 드라이브 문서 동기화 엔진)*

### 5. 구글 드라이브 클라우드 문서 동기화
```bash
npm run gdrive:sync
```
*(프로젝트 스펙, README, 차기 주제 프롬프트, implementation_plan 전체를 구글 드라이브 공유 폴더에 원클릭 자동 갱신)*

---

## 🤖 전담 자동화 스킬 (Antigravity Skills)

- **`publish-protocol`**: 신규 생존 가이드 기획부터 3~6단계 본문 작성, 3D 테크니컬 벡터 SVG 도면 합성, 5대 루브릭 QA 검수, 6대 글로벌 언어 현지화, 정적 빌드, 그리고 **마지막 `sync` 스킬 자동 호출**까지 원스톱으로 완결하는 전담 엔드투엔드 발행 스킬.
- **`sync`**: 코드베이스 변경 사항과 4대 프로젝트 문서 간의 불일치를 전수 검사하고 구글 드라이브 클라우드로 즉시 동기화하는 감사 스킬.


---

## 📜 라이선스
인간 문명 재건을 위한 무료 오픈소스 생존 기록서 (MIT License).
