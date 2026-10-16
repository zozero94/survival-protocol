# 📌 차기 생존 프로토콜 기획서: PR-11 - 버드나무 가지를 엮어 들어간 물고기가 빠져나오지 못하는 원시 깔때기 통발 (원시 통발 어로법)

- **도메인**: 식생 탐색 & 어로 수렵 공학 > 원시 통발 어로 및 유인 덫 공학 (Tier 1)
- **위급도**: HIGH
- **결핍 상황**: 맨손이나 돌날 작살로 물고기를 쫓는 것은 극심한 칼로리를 소모하고 실패율이 90% 이상에 달합니다. 체력이 고갈된 상태에서 강가에 원뿔형 역깔때기(One-way Funnel) 구조를 가진 나무 통발을 설치하면, 잠을 자거나 은신처를 보수하는 동안에도 끊임없이 물고기를 자율 포획하여 생존에 필수적인 고단백질과 필수 지방산을 안정적으로 공급받을 수 있습니다.
- **과학 원리**: 입구는 넓고 안쪽으로 들어갈수록 좁아지는 원뿔형 깔때기 끝에 탄성 있는 잔가지 살(Flexible Twig Tines)을 모아두면, 물고기가 머리로 밀고 쉽게 비집고 들어갈 수 있습니다. 그러나 되돌아가려 할 때는 좁아진 잔가지 끝이 물고기의 가슴지느러미와 비늘에 걸려 역방향 탈출을 기하학적으로 원천 차단하는 '일방향 쐐기 체크 밸브(Check-Valve Mechanism)' 원리를 활용합니다.
- **투입 자연물**:
  - 탄력 있고 곧은 버드나무 또는 개암나무 잔가지 40~50개 (길이 70~80cm, 굵기 5mm)
  - 원형 뼈대 림(Hoop)용 굵은 덩굴 또는 둥글게 휜 버드나무 가지 4개 (직경 25cm, 20cm, 15cm, 10cm)
  - 결속용 질긴 칡 섬유 또는 나무껍질 끈 (총 길이 15m)
  - 통발을 물속 바닥에 가라앉힐 묵직한 강돌 2개 (주먹 크기)
  - 유인용 미끼: 으깬 민물 달팽이, 강바닥 지렁이 또는 메뚜기 뭉치

---

## 🖼️ [필수 사전 프리뷰] 16:9 초고화질 완성 결과물 도면 (Target Outcome)
- **도면 파일명**: `pr11-outcome.svg` (16:9 와이드스크린, 800×450)
- **도면 내용**: 물속 여울목 바위 사이에 단단히 고정된 원뿔형 통발의 투시 단면도. 넓은 외부 원뿔 몸통과 내부 역깔때기 침입 통로, 갇힌 물고기의 탈출 불가 기하학 구조, 바닥 침강용 강돌 및 수류 방향 고정 말뚝의 역학적 배치도를 브루탈리즘 모노라인/입체 셰이딩으로 정밀 시각화.

---

## 📋 4단계 도면 및 실행 지침 (테크니컬 라이팅 & 넘버링 규격)

### [Step 01] 굵은 덩굴을 둥글게 말아 크기순 원형 뼈대 림(Hoop) 4개 엮기
- **실행**: 
  1. **림 직경 선별**: 유연하고 굵은 덩굴을 둥글게 구부려 직경 **25cm, 20cm, 15cm, 10cm** 크기의 원형 림 4개를 만듭니다.
  2. **교차부 결속**: 림의 겹치는 끝부분을 칡 섬유 끈으로 **손가락 두 마디 폭**만큼 단단히 감아 원형을 고정합니다.
  3. **직선 간격 정렬**: 네 개의 림을 큰 것부터 작은 것 순으로 **15cm 간격**으로 나란히 배치하여 원뿔형 골격을 잡습니다.
- **도면 파일명**: `pr11-step-01.svg`
- **도면 초점**: 4단계 크기순 원형 뼈대 림의 치수 표기 및 칡 섬유 교차 결속 단면도

### [Step 02] 버드나무 살 40개를 세로로 촘촘히 엮어 원뿔형 외부 몸통 완성하기
- **실행**: 
  1. **세로 살 배치**: 곧은 버드나무 잔가지 40개를 가장 큰 림부터 가장 작은 림까지 원뿔 형태로 균일하게 둘러 배치합니다.
  2. **교차 엮기 결속**: 칡 끈을 이용하여 각 원형 림과 세로 살이 만나는 지점을 **1cm 간격** 격자로 단단히 감치며 엮어 나갑니다.
  3. **꼬리 끝 밀폐**: 가장 작은 림 뒤쪽의 가지 끝단을 모아 끈으로 꽁꽁 묶되, 물고기를 꺼낼 수 있도록 **풀림 고리**를 만들어 둡니다.
- **도면 파일명**: `pr11-step-02.svg`
- **도면 초점**: 촘촘한 버드나무 살로 엮인 외부 원뿔 바구니 몸통과 꼬리 배출구 결속부 투시도
- **TECHNICAL DEEP DIVE (Stitch Spec)**:
  - **Badge**: `FIELD MECHANICS`
  - **Title**: 유선형 원뿔 격자의 수류 저항 분산
  - **Text**: 1cm 간격의 세로 살 격자는 강물의 흐름을 저항 없이 통과시켜 통발이 급류에 떠내려가는 항력(Drag)을 70% 감소시키면서도 대상 어종(몸통 직경 2cm 이상)의 탈출을 완벽히 차단합니다.

### [Step 03] 안쪽으로 좁아지는 역깔때기 입구(One-way Funnel) 제작 및 몸통 결합
- **실행**: 
  1. **깔때기 살 편성**: 길이 **30cm** 버드나무 가지 16개를 묶어 앞은 **직경 20cm**, 뒤는 **직경 5cm**로 오므라드는 작은 원뿔 깔때기를 만듭니다.
  2. **자유 탄성 끝단**: 깔때기 좁은 끝단의 나뭇가지 끝 **5cm**는 결속하지 않고 유연하게 안쪽으로 모이도록 둡니다.
  3. **몸통 전면 삽입 결합**: 완성된 깔때기를 Step 02 몸통의 가장 큰 입구 안쪽으로 밀어 넣고, 둘레를 칡 끈으로 꼼꼼히 꿰매어 일체화합니다.
- **도면 파일명**: `pr11-step-03.svg`
- **도면 초점**: 외부 몸통 내부로 삽입된 역깔때기 입구 단면 및 물고기가 밀고 들어가는 탄성 가지 끝단 확대도

### [Step 04] 내부 자갈·미끼 장전 후 여울목 바위 틈에 물길 방향으로 고정 설치하기
- **실행**: 
  1. **침강석 및 미끼 투입**: 꼬리 배출구를 통해 주먹 크기 **강돌 2개**와 잎사귀에 싼 **으깬 달팽이 미끼**를 넣고 다시 묶습니다.
  2. **설치 지점 선정**: 강물이 모여 흐르는 폭 1m 내외의 얕은 여울목 바위 틈이나 수초 가장자리를 찾습니다.
  3. **물길 고정**: 깔때기 입구가 물이 흘러오는 **상류(Upstream)**를 향하도록 놓고, 양옆을 큰 돌로 괴거나 바닥에 버팀목을 박아 고정합니다.
- **도면 파일명**: `pr11-step-04.svg`
- **도면 초점**: 물속 바닥에 강돌과 버팀목으로 고정된 통발, 물길 유입 방향 화살표 및 유인된 물고기 궤적
- **TECHNICAL DEEP DIVE (Stitch Spec)**:
  - **Badge**: `FIELD ECOLOGY`
  - **Title**: 어류의 주류성(Rheotaxis)과 먹이 냄새 확산 축
  - **Text**: 담수 어류는 산소와 먹이를 찾아 물살을 거슬러 오르는 양성 주류성을 보입니다. 통발 내부의 으깬 달팽이 체액이 하류로 확산되면 물고기가 후각을 따라 상류로 거슬러 올라와 자연스럽게 깔때기 속으로 빨려 들어갑니다.

---

## ⚠️ 꼭 피해야 할 실수 (Fatal Mistake)
- **흔한 실수**: 통발의 깔때기 입구를 물이 흘러내려가는 하류(Downstream) 방향으로 설치하는 실수
- **위험한 결과**: 물살을 거슬러 오르는 담수 어류의 본능과 정반대가 되어 물고기가 입구를 전혀 찾지 못하고, 유속에 의해 깔때기 살이 뒤집히며 통발이 무용지물이 됨
- **핵심 주의사항**: 반드시 통발의 넓은 입구가 물이 흘러 내려오는 상류(Upstream)를 정면으로 바라보도록 배치하고, 물살에 통발이 구르지 않도록 바닥 돌과 말뚝으로 3점 지지 고정해야 함

---

## 🎨 도면 및 이미지 생성용 마스터 프롬프트

### A. 스티치(Stitch) 벡터 도면용 프롬프트 (publish-protocol)
```text
A precise field blueprint drawn with charcoal and graphite on dark slate, illustrating Primitive Woven Fish Trap Basket Construction.
- Target Outcome (16:9 Widescreen): Longitudinal cutaway perspective of conical woven wicker basket submerged in clear stream, showing one-way funnel entrance with flexible twig tines, internal ballast stones, snail bait packet, trapped freshwater fish unable to reverse, and riverbed anchor stakes.
- Step 1: Four graduated vine hoops (25cm, 20cm, 15cm, 10cm diameter) aligned coaxially at 15cm intervals with cordage lashings.
- Step 2: 40 straight willow ribs woven longitudinal over hoops with 1cm gap grid, tapering to tied retrieval tail.
- Step 3: Inverted 30cm entrance funnel inserted into mouth, showing inward-pointing free flexible tines forming one-way valve.
- Step 4: Stream bed installation between current-directing rocks, ballast stones placed inside, mouth facing upstream current.
Utilitarian Brutalism style, pure monochrome technical linework, zero text collision, strict physics accuracy.
```

### B. 제미나이 3D 포토리얼리스틱 실물 이미지용 프롬프트 (publish-protocol-image)
```text
Cinematic tactical survival field photograph of primitive woven willow fish trap submerged in shallow river.
- Target Outcome (16:9 Widescreen): Eye-level macro view of a conical wicker fish basket resting between mossy river rocks under shallow crystal-clear rushing water. Inside the woven willow ribs, two ballast river stones and a small freshwater fish visible behind the inward-facing funnel tines. Hyper-realistic wet wood textures, water ripples, natural sun dappling, NO modern objects, NO text.
- Step 01: Four flexible vine hoops of decreasing diameters laid out in order on dark damp river sand with stripped bark cordage.
- Step 02: Weaving slender stripped willow twigs longitudinally across hoops to form a rigid conical basket frame.
- Step 03: Constructing the inverted entrance funnel with flexible inward-converging twig tips ready for insertion.
- Step 04: Securing the finished trap with river rocks in a rocky stream channel, mouth aimed directly into the incoming current.
```
