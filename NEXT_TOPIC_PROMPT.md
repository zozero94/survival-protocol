# NEXT PROTOCOL SPECIFICATION — PR-38

다음 `/publish-protocol` 파이프라인 실행 시 아래 기획 명세를 최우선으로 반영하여 신규 생존 교범을 작성·검수·번역·배포합니다.

---

## 🎯 PR-38 기획 명세 (2:1 순환 — 도시·재난 2회차 / 한파·정전 시 실내 열손실 차단 자재 공학)

- **Protocol ID**: `PR-38`
- **Category (SSOT 5대 분과 강제)**: `MATERIALS` (`[04 MATERIALS] 소재·천연화학`)
- **배분 사이클 위치**: 도시·재난 1회차(PR-37) 이후 **도시·재난 2회차 (Urban/Disaster Turn #2)**
- **Title (초등학생 직관 어휘 적용, 65자 이하 준수)**: `"한파·난방 중단 시 물 분무 뽁뽁이·신문지 창틈 막이와 은박 단열막으로 실내 열 손실을 막는 무전력 방한 공법"` (60자)
- **Threat Level**: `HIGH`
- **Ready-Made Alternative 최우선 안내**:
  - 가정 내 전기 온풍기·보일러 예비전원이나 시판용 단열 시트·외풍 차단 실리콘 틈새 테이프가 이미 설치되어 있다면 완제품 난방·단열 장비를 최우선으로 가동·점검할 것을 첫 문장에서 안내하고, 정전과 가스 중단이 동시에 겹친 혹한기 아파트·주택에서 물과 포장용 공기 방울 비닐(에어캡/뽁뽁이), 신문지·헌 천, 은박 돗자리만으로 창문과 문틈 냉기 유입을 물리 차단해 실내 온도를 지키는 무전력 방한 자재 공학을 다룹니다.

---

## 🔬 4단계 공정 설계 (초등학생 수준 직관 명칭 & 무전력 물리 공학)

1. **Step 1 (`pr38-step-01.svg` + `id-cold-draft-window-paper-seal.jpg`)**:
   - **창문·현관 문틈 찬바람 구멍 찾고 마른 신문지·헌 천 밀어 넣어 외풍 막기**: 촛불이나 젖은 손등을 창틀과 현관 문틀 가장자리에 대어 찬바람이 들이치는 틈새를 찾은 뒤, 돌돌 만 신문지나 길게 접은 헌 옷감을 틈새 깊숙이 빈틈없이 끼워 대류 열 손실을 1차 차단합니다.
2. **Step 2 (`pr38-step-02.svg` + `id-water-sprayed-bubble-sheet-window.jpg`)**:
   - **창문 유리에 물만 뿌려 공기 방울 단열 비닐을 틈 없이 붙이기 (접착제 불필요)**: 창유리를 마른 천으로 닦아낸 뒤 깨끗한 물을 고르게 뿌려 적시고, 올록볼록한 면이 유리 쪽을 향하게 공기 방울 단열 비닐을 위에서 아래로 꾹 눌러 붙여 유리면 결로·열 전도 손실을 막습니다.
3. **Step 3 (`pr38-step-03.svg` + `id-foil-curtain-radiant-heat-barrier.jpg`)**:
   - **창틀 아래·바닥에 은박 단열 막과 [방한 캡슐](/protocol-22) 결합해 복사열 가두기**: 창문 아래 1뼘 길이로 신문지 롤을 눕혀 내려오는 찬 공기 흐름(콜드 드래프트)을 막고, 거실 한가운데 난방 구역 바깥창 쪽에 은박 돗자리·담요 막을 매달아 실내 온기 복사를 안쪽으로 되돌립니다.
4. **Step 4 (`pr38-step-04.svg` + `id-morning-ventilation-condensation-check.jpg`)**:
   - **창가 습기·결로 닦기 및 하루 2회 한낮 짧은 환기로 일산화탄소·곰팡이 막기**: 해가 가장 높은 낮 시간대에 5분간 맞바람을 쐬어 환기하고 유리 밑 젖은 물기를 닦아내어 습한 냉기와 호흡기 곰팡이 위험을 없애며 [참치캔 난로](/protocol-21) 사용 시 안전을 유지합니다.
5. **Outcome (`pr38-outcome.svg`)**:
   - 4단계 통합 흐름도 (문틈 신문지·천 외풍 차단 ➔ 물 분무 유리 공기층 부착 ➔ 은박 막 + 하단 냉기 댐 설치 ➔ 한낮 짧은 환기 및 물기 관리).

---

## ⚠️ 필수 체크리스트 (PR-38 작성 시 준수 사항)

1. 제목 길이 **10~65자 이내 엄수** (`PostingReviewService` SEO 검증 감점 방지).
2. `PlainKoreanEditorService` 금지어 미포함 및 각 스텝 인과 설명 단어(`위해`, `막기`, `방지`, `유지`, `예방`)와 단일 번호 줄 240자 이하 엄수.
3. `materials[].name` 내부 마크다운 링크 금지 (`Checklist.ts` raw 출력 규칙). 관련 링크(`/protocol-21`, `/protocol-22`, `/protocol-28`, `/protocol-31`, `/protocol-34`)는 설명 본문에만 `.html` 없이 배치.
4. **핵심 SVG 금지어 주의 (`FORBIDDEN_MODERN_ARTIFACTS`)**: `SVG <text>` 및 `svgLabels`에는 `비닐`, `테이프`, `플라스틱`, `페트병` 등 금지어를 피하고 **`"공기 방울 단열 막"`**, **`"물 분무 밀착 층"`**, **`"은박 복사열 가림막"`**, **`"신문지 외풍 마개"`** 등 안전 어휘만 사용.
5. Fatal Mistake 필수 경고: **실내 모든 창·문을 꽉 막고 환기 0분 상태로 [참치캔 난로](/protocol-21)나 숯불·부탄가스를 켜는 일산화탄소 중독 사고** 및 **결로 물기 방치로 젖은 이불에서 발생하는 저체온증**.
6. 발행 후 `tests/10_svg_audit_loop.test.ts`, `Footer.ts`, `knowledge-tree.json`, `README.md`, `PROJECT_SPEC.md`, `AGENTS.md`, `NEXT_TOPIC_PROMPT.md`(-> **PR-39 2:1 야생·원시 회차**) 동기화 ➔ `npm run sync:timestamps && npm run build && npm run typecheck && npm test && npm run gdrive:sync` ➔ `git push origin main` 직행.
