# NEXT PROTOCOL SPECIFICATION — PR-37

다음 `/publish-protocol` 파이프라인 실행 시 아래 기획 명세를 최우선으로 반영하여 신규 생존 교범을 작성·검수·번역·배포합니다.

---

## 🎯 PR-37 기획 명세 (2:1 순환 — 도시·재난 1회차 / 붕괴 매몰 인명 구조 공학)

- **Protocol ID**: `PR-37`
- **Category (SSOT 5대 분과 강제)**: `TOOLS` (`[03 TOOLS] 도구·의복·공작`)
- **배분 사이클 위치**: 야생·자연 회차(PR-36) 이후 **도시·재난 1회차 (Urban/Disaster Turn #1)**
- **Title (초등학생 직관 어휘 적용, 65자 이하 준수)**: `"지진·건물 붕괴 매몰 시 각목 지렛대와 우물정(井) 나무 괴임으로 콘크리트 잔해를 안전하게 들어 올리는 무전력 구조법"` (58자)
- **Threat Level**: `HIGH`
- **Ready-Made Alternative 최우선 안내**:
  - 119 구조대 연락이 닿고 유압 스프레더·공기 매트 잭·차량용 유압 잭 등 완제품 구조·리프팅 장비가 현장에 있다면 구조대와 기성 유압 장비를 최우선으로 투입할 것을 첫 문장에서 안내하고, 통신 두절과 장비 고갈 상태에서 2인 이상 생존자가 무거운 콘크리트 판·대들보를 안전하게 들어 올려 깔린 동료를 빼내는 FEMA/CERT 표준 지렛대 + 우물정(井) 괴임(Box Cribbing) 무전력 공법을 다룹니다.

---

## 🔬 4단계 공정 설계 (초등학생 수준 직관 명칭 & 무전력 물리 공학)

1. **Step 1 (`pr37-step-01.svg` + `id-collapsed-concrete-crib-site-prep.jpg`)**:
   - **2차 붕괴 점검 후 단단한 바닥에 받침점과 긴 각목 지렛대 걸기**: 먼저 위쪽 부서진 기둥과 여진 낙하물 유무를 훑어본 뒤, 내 키만 한 튼튼한 통나무나 두꺼운 각목 지렛대 끝을 콘크리트 모서리 아래에 손가락 마디만큼만 끼우고 들릴 쪽 가까이 무릎 높이 받침통나무(받침점)를 단단한 맨바닥에 둡니다(물렁한 흙바닥이나 깨진 벽돌 받침 금지).
2. **Step 2 (`pr37-step-02.svg` + `id-box-cribbing-well-stack-prep.jpg`)**:
   - **잔해 양옆에 손목 굵기 네모 각목·벽돌을 우물정(井) 자로 단단히 괴어 기초 쌓기**: 지렛대를 누르기 전, 들어 올릴 콘크리트 바로 옆 단단한 바닥 위에 길이가 같은 네모 각목 2개씩 번갈아 직각(우물정 井)으로 겹쳐 잔해 아래 틈새 직전 높이까지 미리 쌓아 둡니다(절대 둥근 통나무 여러 개를 괴임으로 쓰지 말 것: 굴러 떨어짐).
3. **Step 3 (`pr37-step-03.svg` + `id-lever-one-inch-lift-crib-chase.jpg`)**:
   - **"1인치(손가락 두 마디) 들고 즉시 1인치 괴기" 교대 반복으로 안전 간격 확보**: 한 사람이 체중을 실어 지렛대를 손가락 두 마디만큼만 조심스럽게 내리면, 보조자가 손과 손목을 잔해 밑에 절대 넣지 않고 긴 막대나 바깥쪽 끝만 잡아 우물정 나무 괴임 1층을 바로 밀어 넣은 뒤 지렛대 힘을 천천히 풀어 무게가 나무 괴임에 얹히게 확인합니다.
4. **Step 4 (`pr37-step-04.svg` + `id-safe-cribbed-extraction-void.jpg`)**:
   - **우물정 괴임이 하중을 완전히 떠받친 상태에서 깔린 동료 부상자 빼내기**: 한꺼번에 높이 들다 잔해가 미끄러지지 않도록 우물정 나무 블록을 한 층씩 착실히 쌓아 성인 몸통이 빠져나갈 공간과 쐐기 안전잠금을 확보한 뒤, 부목([나뭇가지 부목](/protocol-18))·[지혈대](/protocol-32) 등 응급 처치 후 부드럽게 끌어냅니다.
5. **Outcome (`pr37-outcome.svg`)**:
   - 4단계 통합 흐름도 (받침점·긴 각목 배치 ➔ 우물정(井) 네모 각목 기초 ➔ "손가락 두 마디 들고 즉시 괴기" ➔ 안전 괴임 완성 후 부상자 구조).

---

## ⚠️ 필수 체크리스트 (PR-37 작성 시 준수 사항)

1. 제목 길이 **10~65자 이내 엄수** (`PostingReviewService` SEO 검증 감점 방지).
2. `PlainKoreanEditorService` 금지어 및 `ContentEnrichmentService` 각 스텝 **인과 이유 단어(`위해`, `막기`, `방지`, `유지`, `예방` 등) 포함** 및 **단일 번호 줄 240자 이하** 엄수.
3. `materials[].name` 내부에는 마크다운 링크(`[...]`) 절대 금지 (`Checklist.ts` raw 출력 규칙). 관련 링크(`/protocol-18`, `/protocol-24`, `/protocol-27`, `/protocol-31`, `/protocol-32`)는 본문·설명에만 `.html` 없이 배치.
4. `svgLabels`에는 `FORBIDDEN_MODERN_ARTIFACTS`(`철사`, `나일론`, `테이프`, `플라스틱` 등) 미사용 및 모든 6대 언어 번역본(`locales/*.json`) 한글 잔존 0건 확인.
5. Fatal Mistake 필수 경고: **나무 괴임(우물정 블록) 없이 지렛대를 손이나 어깨로만 버틴 채 사람 손발·몸을 콘크리트 아래로 집어넣는 치명적 압사 사고** 및 **둥근 통나무·깨진 속빈 벽돌을 받침으로 써서 한 번에 꺾여 무너지는 실수**.
6. 발행 후 `tests/10_svg_audit_loop.test.ts`, `Footer.ts`, `knowledge-tree.json`, `README.md`, `PROJECT_SPEC.md`, `AGENTS.md`, `NEXT_TOPIC_PROMPT.md`(-> PR-38 도시·재난 2회차) 동기화 ➔ `npm run sync:timestamps && npm run build && npm run typecheck && npm test && npm run gdrive:sync` ➔ `git push origin main` 직행.
