# [생존 교범 // SURVIVAL PROTOCOL]
> **"모든 전기가 끊겼을 때, 오직 두 손과 이 기록만으로 살아남는다."**  
> Post-Collapse Primitive Survival Field Manual & Autonomous Knowledge Pipeline

---

## 🧭 프로젝트 개요
현대 문명이 붕괴되고 글로벌 통신망과 전력망이 영구 단절되었을 때, 라이터나 플라스틱 등 현대 인공물에 일체 의존하지 않고 자연물과 두 손만으로 생명을 유지하기 위한 실전 원시 생존 기술 기록서입니다.

* **완전 오프라인 PWA (Progressive Web App)**: 1회 방문 시 모든 교범 데이터와 스타일이 기기에 사전 캐시되어 비행기 모드 및 통신 두절 시에도 100% 작동
* **6대 생존 공학 체계**: 식수 확보, 불 피우기, 은신처, 식량 채집, 원시 도구, 야전 의약
* **5개 단위 페이징 피드**: Git JSON 기반 데이터셋 자동 스캔 및 0.01초 무새로고침 페이징
* **브루탈리즘 디자인**: 칠흑의 피치 블랙(`border-radius: 0px`), 40×40 정밀 벡터 인라인 도면

---

## 🧱 6대 생존 공학 분과
1. **[식수 확보 // WATER]** : 숯 다층 여과기, 태양열 지하 증류, 끓임 멸균
2. **[불 피우기 // FIRE]** : 원시 활비비(Bow Drill) 고속 회전 마찰 발화
3. **[은신처 // SHELTER]** : 낙엽 1미터 단열 데브리 헛(Debris Hut)
4. **[식량 채집 // FOOD]** : 8단계 유니버설 에디빌리티 테스트, 노천 토기 조리
5. **[원시 도구 // TOOLS]** : 타제 석기, 칡 껍질 역방향 꼬임 로프
6. **[야전 의약 // MEDICINE]** : 소나무 송진 항균 정제 및 천연 지혈 연고

---

## 📂 아키텍처 구조
```
primitive-survival/
├── content/               # [Content Layer] Git 기반 순수 JSON 프로토콜 & 지식 트리
│   ├── protocols/         # 개별 생존 교범 마스터 데이터 (PR-01 ~ PR-N)
│   └── knowledge-tree.json# 문명 복원 지식 그래프 (도메인/티어/분과)
├── src/
│   ├── types/             # [Type Layer] TypeScript 엄격 규격 (단일 진실 공급원)
│   ├── site.config.ts     # 사이트 메타데이터, PWA 경로, CDN 단일 SSOT
│   ├── services/          # [Service Layer] PWA 생성, LLM 큐레이터, 쇼츠 변환 순수 함수
│   ├── state/             # [State Layer] 페이징, 카테고리 필터, 테마, PWA 감지 런타임 스크립트
│   ├── components/        # [Presentational Layer] 순수 UI 컴포넌트 (DOM 무의존)
│   │   ├── feed/          # FeedHeader, ProtocolCard, Pagination
│   │   ├── layout/        # Header, StickyActionBar
│   │   └── protocol/      # HeroSection, Checklist, StepCard, FatalWarning
│   ├── render.ts          # 상세 교범 정규 웹 페이지 컴파일러
│   ├── render-index.ts    # 5개 페이징 메인 피드 인덱스 컴파일러
│   └── pipeline.ts        # 엔드투엔드 정적 사이트 컴파일 파이프라인
├── public/                # [Build Artifacts] 최종 정적 HTML, sw.js, manifest
└── tests/                 # [Quality Audit] 5대 테스트 스위트 (26/26 PASS)
```

---

## 🚀 빠른 시작 (Local Development)

### 1. 의존성 설치
\`\`\`bash
npm install
\`\`\`

### 2. 환경 변수 설정
\`\`\`bash
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 입력 (지식 트리 자동 성장 시 필요)
\`\`\`

### 3. 정적 빌드 및 컴파일
\`\`\`bash
npm run dev
# 또는
node --experimental-strip-types src/pipeline.ts
\`\`\`

### 4. 품질 감사 테스트 실행
\`\`\`bash
npm test
\`\`\`
*(26개 전수 테스트: 고증 방어, 스키마 규격, LLM 회복력, HTML 무결성, PWA 오프라인 캐시, 5개 페이징)*

---

## 📜 라이선스
인간 문명 재건을 위한 무료 오픈소스 생존 기록서 (MIT License).
