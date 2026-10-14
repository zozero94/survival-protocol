# 📌 차기 생존 프로토콜 기획서: PR-08 - 나뭇가지 3개와 바위로 짐승 잡는 법 (숫자 4 모양 돌 덫)

- **도메인**: 야생 식량 & 수렵 공학 > 무동력 중력식 낙하 덫 제작 (Tier 1)
- **위급도**: CRITICAL
- **결핍 상황**: 야생 식물 채집만으로는 필수 지방과 단백질을 채울 수 없어 급격한 근육 손실과 체력 고갈이 일어납니다. 맨몸으로 동물을 쫓는 것은 지나친 칼로리 낭비이므로, 자는 동안에도 스스로 작동하는 중력식 함정이 반드시 필요합니다.
- **과학 원리**: 지레의 원리와 아슬아슬한 마찰력의 균형을 이용합니다. 세 개의 나뭇가지를 '숫자 4' 형태로 맞물려 무거운 바위를 지탱하다가, 미끼를 건드리는 미세한 힘(수평 분력)으로 균형이 깨지면 바위의 위치 에너지가 즉시 낙하 충격으로 전환됩니다.
- **투입 자연물**:
  - 손가락 굵기의 단단한 마른 나뭇가지 3개
  - 넓적하고 무거운 돌 (10~15kg)
  - 끝을 뾰족하게 다듬을 날카로운 돌 조각

---

## 🖼️ [필수 사전 프리뷰] 16:9 초고화질 완성 결과물 도면 (Target Outcome)
- **도면 파일명**: `pr08-outcome.svg` (16:9 와이드스크린, 800×450)
- **도면 내용**: 완성되어 실전에 세팅된 4자 덫과 거치된 15kg 평평한 바위의 전체 입체 투시도. 3대 접점(트리거)에 작용하는 마찰 평형선 및 미세 터치 시의 낙하 분력 방향 화살표, 트리거 제원 패널을 모노라인/입체 셰이딩으로 표현.

---

## 📋 3단계 도면 및 실행 지침

### [Step 01] 세 가지 핵심 나뭇가지 다듬기
- **실행**: 손가락 굵기의 곧은 나뭇가지 세 개를 준비합니다. 첫 번째는 바닥에 세울 '수직 기둥(끝을 끌 모양으로 깎음)', 두 번째는 돌을 받칠 '대각선 버팀대(양 끝에 홈을 팜)', 세 번째는 미끼를 꽂을 '수평 미끼대(기둥과 맞물릴 홈을 팜)'로 돌날을 이용해 깎아냅니다.
- **도면 파일명**: `pr08-step-01.svg`
- **도면 초점**: 수직 기둥, 대각선 버팀목, 수평 미끼대의 홈 가공 단면도 및 치수 비례도

### [Step 02] 숫자 4 모양으로 홈 맞물리기
- **실행**: 수직 기둥의 윗부분에 대각선 버팀대의 윗홈을 걸칩니다. 이어 수평 미끼대를 기둥의 중간 홈에 대고, 대각선 버팀대의 아랫홈을 미끼대의 끝단 홈에 걸어 세 막대가 서로 밀어내는 힘만으로 자립하는 '숫자 4' 뼈대를 완성합니다.
- **도면 파일명**: `pr08-step-02.svg`
- **도면 초점**: 세 막대가 결합되어 '4' 형태를 이루는 마찰 결속 지점의 확대 구조도

### [Step 03] 바위 거치 및 미끼 장착
- **실행**: 미끼대 안쪽 끝에 열매나 벌레 등 먹이를 꽂은 뒤, 결합된 틀의 대각선 막대 윗부분에 10~15kg의 넓적한 바위를 조심스럽게 기대어 놓습니다. 바위 밑으로 짐승이 머리를 넣고 미끼를 살짝 당기는 즉시 뼈대가 무너지도록 민감도를 점검합니다.
- **도면 파일명**: `pr08-step-03.svg`
- **도면 초점**: 기울어진 바위 아래 4자 뼈대와 안쪽 미끼가 세팅된 전체 측면 입체 투시도

---

## ⚠️ 꼭 피해야 할 실수 (Fatal Mistake)
- **흔한 실수**: 돌이 너무 가볍거나, 막대 결합 홈을 너무 깊게 파서 뻑뻑하게 만드는 실수
- **위험한 결과**: 짐승이 미끼를 흔들어도 덫이 떨어지지 않아 밥만 빼앗기거나, 돌에 맞아도 다치기만 한 채 도망쳐 덫의 위치만 노출됨
- **핵심 주의사항**: 돌 무게는 잡으려는 동물 체중의 3~5배 이상 무거워야 하며, 결합 홈은 걸릴 듯 말 듯 날카롭고 얕게 다듬어 스치기만 해도 0.1초 만에 풀리도록 설치해야 함

---

## 🎨 스티치(Stitch) 생성용 마스터 프롬프트
```text
A precise field blueprint drawn with charcoal and graphite on aged dark slate, illustrating the Figure-4 Deadfall Trap mechanics.
- Target Outcome (16:9 Widescreen): Full perspective of the set trap under a 15kg flat rock with tension equilibrium vectors, sensitive trigger points, and quick-collapse mechanism.
- Step 1: The three wooden triggers with exact notch dimensions (vertical post, diagonal support, horizontal bait stick).
- Step 2: The exploded mechanical assembly forming the numeral '4' shape under counter-pressure.
- Step 3: Full field deployment showing the rock leaning at 45 degrees over the bait stick trigger.
Utilitarian Brutalism style, pure monochrome technical linework, zero text-graphic collision, strict physical accuracy.
```
