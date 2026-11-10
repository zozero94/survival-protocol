<!-- ~/review-kit/build.py가 만든 파일. 여기를 고치지 말고 ~/review-kit/packs/web.md를 고친다. -->

# 플랫폼 팩: Web / TypeScript / PWA / Firebase

각 절은 해당 관점의 에이전트가 점검한다. "이것도 봐라" 목록이지 지적 할당량이 아니다.

## 시나리오

- 한글 IME 조합 중(`isComposing`) 엔터·단축키, 유니코드 정규화(NFC/NFD)
- 다국어 전환 직후 동적 UI·상태 동기화, 템플릿 리터럴 안 정규식 백슬래시·특수문자 이스케이프
- 오프라인, 네트워크 타임아웃, 외부 SDK·DB 차단(광고 차단기·방화벽), 스토리지 용량 초과
- 스크립트·데이터 로딩 지연 중 사용자 조기 입력, 빠른 연타, 비동기 응답 순서 역전
- 분류 체계: 새로 추가된 항목의 카테고리·태그가 UI 필터 탭·검색 패싯에 빠짐없이 매핑되는가 (필터에서 영영 안 보이는 항목)
- 화면 가장자리(뷰포트 경계) 조건

## 아키텍처

- 계층별 역할: UI(`components/`·`pages/`·`views/`)는 그리기만 한다 — 비즈니스 로직·DB·API 직접 호출·복잡한 가공은 State(`state/`·`hooks/`·`store/`)나 Service(`services/`·`domain/`)로 넘긴다. Service는 프레임워크·DOM에 묶이지 않는다. Data(`content/`·`utils/`·`types/`)는 순수 데이터·타입·무상태 유틸만 두고 위 계층을 참조하지 않는다
- 하위 계층이 상위 계층을 참조하거나 순환 import가 생기지 않는가
- 타입: `any`와 무분별한 타입 단언(`as`) 대신 도메인 타입·인터페이스를 쓰는가
- 서버 빌드 타임 렌더러와 클라이언트 런타임 스크립트에 같은 로직이 중복돼 한쪽만 고쳐질 위험 (단일 진실 공급원 위반)
- 템플릿 문자열로 만든 인라인 스크립트는 구문 검증 없이 배포돼 런타임 `SyntaxError`가 날 수 있다
- 역방향 사고 예: 인라인 주입 vs 외부 정적 파일 분리, 실시간 DB 조회 vs 빌드 타임 미리 계산

## 성능

- 레이아웃 스래싱: DOM 쓰기 직후 `offsetWidth`·`getBoundingClientRect()`를 반복문에서 계속 읽음, `innerHTML` 반복 교체
- 레이아웃 밀림(CLS): `<img>`·컨테이너에 `aspect-ratio`나 `width`/`height` 누락
- 고빈도 이벤트(`mouseover`·`scroll`·`input`)에 디바운스·가드 없이 무거운 작업
- 무거운 인스턴스(검색 엔진·`new RegExp`·파서)를 이벤트마다 새로 생성
- 인라인 데이터·JS 번들·PWA 프리캐시 목록이 콘텐츠 증가에 따라 계속 커지는가
- 정적 인덱스·로컬 캐시로 대신할 수 있는 Firestore·API 호출 (상한 없는 조회·리스너 증폭은 보안 절)
- `setTimeout`·`setInterval` 정리
- 큰 이미지: WebP + `<picture>`·`srcset`으로 해상도별 제공, 첫 화면 이미지는 `fetchpriority="high"`, 나머지는 `loading="lazy"`
- 자동재생 영상을 초기 로드에 넣지 않는다 — `preload="none"` + 뷰포트 진입 때 `src` 할당
- 서드파티 SDK `<script>` 태그는 실행을 늦춰도 HTML 파싱을 막는다 → 필요한 시점에 동적으로 삽입

## 사이드이펙트

- 서버 렌더러와 클라이언트 런타임이 주고받는 HTML 속성·구조의 암묵 계약
- 다국어 전환 때 다시 그려지는 DOM 속성과 정규식 이스케이프
- 스타일 변경이 인쇄 모드(`@media print`)와 모바일 뷰포트에 주는 영향
- `tsconfig.json`·빌드 파이프라인 변경 → 컴파일·테스트·서버리스 배포

## 데이터 호환

- `localStorage`·IndexedDB: `JSON.parse`를 try-catch와 형식 확인으로 감싸는가, 시크릿 모드·용량 부족 예외(`QuotaExceededError`·`SecurityError`)에서 멈추지 않는가
- Firestore 등 문서 DB: 옛 문서에 새 필드가 없을 때 `??` 기본값, 문서 자체가 없을 때, 원자적 upsert(`merge: true`·`increment`)
- 공유 타입·JSON 스키마 변경 → 저장된 데이터·정적 검색 인덱스와의 호환
- Service Worker 캐시 버전 변경 → 기존 방문자의 오래된 캐시 고착, 옛 캐시와 새 코드가 섞여 도는 경우

## 보안

- Firestore 등 쿼리에 `.limit()`·페이지 상한이 있는가, 넓은 범위 `onSnapshot` 리스너가 접속자 × 변경 수로 불어나지 않는가, 언마운트 때 해제되는가
- `useEffect`·`onSnapshot`·트리거 함수 안에서 다시 쓰기·호출을 일으키는 무한 루프
- 조회수·좋아요·댓글·유료 외부 API 호출의 연타 방어(디바운스·쿨다운)와 서버·보안 규칙 쪽 rate limit
- 보안 규칙(`firestore.rules`·`storage.rules`·RLS): create와 update 분리, 보호 필드(`role`·`ownerId`·`createdAt`·카운터) 변경 차단, `auth.uid` 소유권 확인, 허용 키 화이트리스트(`hasOnly`)·문자열 길이·배열 크기·업로드 용량·MIME 상한
- App Check·CAPTCHA·CORS로 비공식 클라이언트·봇을 막는가
- XSS: `innerHTML`·`dangerouslySetInnerHTML`에 외부 값, `href`·`src`의 `javascript:`·`data:` 주입, 템플릿 리터럴로 만든 스크립트의 이스케이프 탈출
- 서버 전용 키(AI API 키·Admin SDK 서비스 계정·봇 토큰)가 번들·git에 들어가지 않는가, 웹훅 서명 검증

## UI·디자인

- 모달·팝오버·드롭다운이 뷰포트 밖으로 잘리지 않는가, 고정 헤더·하단 바가 본문을 가리지 않는가
- 마우스 호버 전용 인터랙션이 터치(`hover: none`)에서 오작동하지 않는가
- 터치 영역 44×44px 이상, 모바일 입력창 글자 16px 이상(iOS 자동 확대 방지)
- 키보드 조작(`Tab`·`Enter`·`Escape`·화살표)과 `:focus-visible`, `role`·`aria-label`·`aria-hidden`
- 명도 대비, 다크모드·인쇄 모드
- `display: none`에서 보이게 바꾸면 `opacity` 전환 애니메이션이 안 돈다 → `visibility: hidden` + `opacity: 0` + `pointer-events: none` 조합
