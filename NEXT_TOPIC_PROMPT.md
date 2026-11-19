# NEXT PROTOCOL SPECIFICATION — PR-36

다음 `/publish-protocol` 파이프라인 실행 시 아래 기획 명세를 최우선으로 반영하여 신규 생존 교범을 작성·검수·번역·배포합니다.

---

## 🎯 PR-36 기획 명세 (2:1 순환 — 원시·야생 야전 식량 확보 회차)

- **Protocol ID**: `PR-36`
- **Category (SSOT 5대 분과 강제)**: `FOOD` (`[01 FOOD] 물·식량·보존`)
- **배분 사이클 위치**: 도시·재난(PR-34, PR-35) 2연속 발행 이후 **원시·자연/야전 회차 (Wilderness Turn)**
- **Title (초등학생 직관 어휘 적용)**: `"야생 고립·식량 고갈 시 떫은 도토리·상수리 열매를 돌로 빻아 찬물 우려내기로 독성 탄닌을 빼고 장기 보존 도토리 전분·묵 만드는 법"`
- **Threat Level**: `HIGH`
- **Ready-Made Alternative 최우선 안내**:
  - 가정·대피소에 통조림·건조 비상식량·즉석 묵가루가 이미 비치되어 있다면 완제품 식량을 우선 섭취할 것을 첫 문장에서 안내하고, 장기 조난·고립으로 열량이 바닥난 야외 환경에서 풍부한 도토리의 독성 탄닌을 안전하게 제거해 고열량 보존식을 만드는 야전 공법을 다룹니다.

---

## 🔬 4단계 공정 설계 (초등학생 수준 직관 명칭 & 무도구 원시 공정)

1. **Step 1 (`pr36-step-01.svg` + `id-acorn-selection-float-test-sorting.jpg`)**:
   - **벌레 먹은 도토리 가려내기 & 껍질 까기**: 단단하고 갈색 윤기가 도는 도토리·상수리를 모아 물에 띄웠을 때 둥둥 뜨는 알맹이(벌레 구멍·썩은 열매)는 버리고 가라앉은 알맹이만 건진 뒤, 둥글고 평평한 강돌로 껍질을 톡 깨어 속살을 꺼냅니다.
2. **Step 2 (`pr36-step-02.svg` + `id-granite-stone-crushing-acorn-paste.jpg`)**:
   - **넓은 돌판에서 도토리 알맹이 곱게 빻기**: 단단한 화강암 평석 위에서 둥근 돌공이로 도토리 속살을 두드리고 갈아 입자가 고운 가루·반죽으로 만듭니다(잘게 부술수록 물과 닿는 면적이 넓어져 떫은 탄닌이 빨리 빠집니다).
3. **Step 3 (`pr36-step-03.svg` + `id-cold-stream-leaching-tannin-removal.jpg`)**:
   - **깨끗한 면 천 주머니에 담아 찬물로 떫은 탄닌 우려내기**: 빻은 도토리 가루를 촘촘한 면 수건·옷감에 싸서 차가운 계곡물 흐르는 자리나 큰 나무 그릇의 찬물(하루 2~3회 새 물로 교체)에 담가 붉고 떫은 탄닌 물이 맑아질 때까지 2~4일간 조물조물 주물러 우려냅니다(뜨거운 물 사용 시 전분이 익어 뭉치고 떫은맛이 갇히므로 **반드시 찬물** 사용, 마무리는 맛을 조금 보아 떫지 않을 때까지 확인).
4. **Step 4 (`pr36-step-04.svg` + `id-settled-acorn-starch-cake-drying.jpg`)**:
   - **앙금 가라앉혀 햇볕 건조 장기 보존 & 돌솥 끓여 묵 만들기**: 탄닌이 빠진 도토리 즙을 큰 그릇에 가만히 3~4시간 두어 바닥에 묵직하게 가라앉은 하얀 전분(앙금)만 남기고 윗물을 버립니다. 가루 채로 햇볕에 바짝 말리면 1년 이상 썩지 않는 비상 식량 가루가 되며, 물 1 : 전분 5~6 비율로 풀어서 [불 피우기](/protocol-04) 화덕에 나무 주걱으로 계속 저어 끓인 뒤 식히면 탄력 있는 도토리묵이 완성됩니다.
5. **Outcome (`pr36-outcome.svg`)**:
   - 4단계 통합 흐름도 (물 가라앉힘 선별 ➔ 돌판 곱게 갈기 ➔ 면 천 찬물 2~4일 탄닌 제거 ➔ 앙금 침전·건조 장기 보존식/도토리묵 완성).

---

## ⚠️ 필수 체크리스트 (PR-36 작성 시 준수 사항)

1. `FORBIDDEN_MODERN_ARTIFACTS` 엄수: 원시·자연 회차이므로 SVG `<text>` 및 `svgLabels`에 `플라스틱`, `비닐`, `페트병`, `냄비`, `유리`, `철` 등 금지 인공물 어휘 절대 금지 (`나무 통`, `넓은 면 천`, `돌그릇`, `화강암 평석` 등 원시 자재만 사용).
2. `materials[].name` 내부에는 마크다운 링크(`[...]`) 절대 금지 (`Checklist.ts` raw 출력 규칙). 관련 링크(`/protocol-04`, `/protocol-01`, `/protocol-23`, `/protocol-24` 등)는 `summary`, `materials[].desc`, `steps[].description`, `fatalMistake.description`에만 `.html` 없이 배치.
3. Fatal Mistake 필수 경고: **찬물 우려내기(Cold Leaching) 생략하고 생도토리나 덜 우린 도토리를 그대로 먹는 치명적 실수** (고농도 탄닌이 위벽과 신장에 극심한 손상·구토·장폐색 유발).
4. 발행 후 6개국어 번역본(`locales/*.json`) 0개 한글 잔존 확인 ➔ `tests/10_svg_audit_loop.test.ts` 등록 ➔ `Footer.ts`, `knowledge-tree.json`, `README.md`, `PROJECT_SPEC.md`, `AGENTS.md`, `NEXT_TOPIC_PROMPT.md`(-> PR-37 도시·재난) 동기화 ➔ `npm run sync:timestamps && npm run build && npm run typecheck && npm test && npm run gdrive:sync` ➔ `git push origin main` 직행.
