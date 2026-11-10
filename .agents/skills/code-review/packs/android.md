<!-- ~/review-kit/build.py가 만든 파일. 여기를 고치지 말고 ~/review-kit/packs/android.md를 고친다. -->

# 플랫폼 팩: Android / Kotlin

각 절은 해당 관점의 에이전트가 점검한다. "이것도 봐라" 목록이지 지적 할당량이 아니다.

## 시나리오

- 구성 변경(회전·다크모드 전환)과 프로세스 재시작 뒤 상태 복원
- 코루틴·Flow 취소와 재진입: 화면 이탈 중 수집, `repeatOnLifecycle` 재시작 때 같은 처리 중복 실행
- WorkManager 재시도·중복 실행, 워커가 중간에 죽었다 다시 뜰 때
- 백그라운드 제한, 권한 회수, 저장 공간 부족
- RxJava(레거시)와 코루틴이 섞인 경로의 스레드·취소 전파
- `NonCancellable` 사용: 꼭 끝나야 하는 정리 작업만 감쌌는가, 취소돼야 할 작업까지 붙잡고 있지 않은가

## 아키텍처·DI

- Dagger scope(Activity·Fragment·ViewModel·Singleton)가 일관적인가. Singleton이 Activity Context를 잡고 있지 않은가
- Module·Component 의존 방향, 테스트에서 Fake로 바꿀 수 있는가
- `@Inject`를 못 쓰는 지점(companion object·object·Worker 초기화 이전)에 남은 서비스 로케이터는 과도기 패턴이다 — 왜 주입이 안 되는 시점인지까지 짚는다
- ViewModel 비대화, UI에서 Repository 직접 호출, Domain 계층의 Android 프레임워크 의존
- 상태 노출: `MutableStateFlow`·`MutableLiveData`를 외부에 그대로 노출하지 않는가. 일회성 이벤트는 State와 분리했는가
- `map + distinctUntilChanged`로 특정 전이만 구독하는 건 흔한 정당한 분리다 — 구독이 여러 개라는 이유만으로 combine 통합을 권하지 않는다
- 화면이 다른 화면의 내부(adapter 등)에 직접 접근하는 과도한 친밀도, `onViewCreated`에서 상태를 쓰고 바로 읽는 초기화 경합
- Compose와 XML View 선택이 화면 성격에 맞는가

## 성능

- Compose: 불안정한 파라미터, 매번 새로 만드는 람다, state 읽기 범위, `derivedStateOf` 기회, `LazyColumn`의 `key`·`contentType`, composition 안의 `Modifier` 할당
- RecyclerView: `DiffUtil`과 payload 부분 갱신, `setHasStableIds`와 `getItemId` 일관성, `onBindViewHolder` 안 inflate 금지, 중첩 리스트의 `RecycledViewPool`
- Room: 반복문 안 쿼리(N+1), 필요 없는 `SELECT *`, LIMIT·페이징 누락, 관계를 돌려주는 쿼리의 `@Transaction` 누락, 트랜잭션 범위가 너무 넓거나 좁음
- 디스패처: I/O는 `Dispatchers.IO`, CPU 작업은 `Default`. 메인 스레드 I/O·JSON 파싱
- 누수: Context, Fragment ViewBinding을 `onDestroyView`에서 해제, `GlobalScope`, 리스너·BroadcastReceiver·ContentObserver·Disposable 해제
- Bitmap 샘플링과 이미지 크기 지정

## 사이드이펙트

- 공유 모델의 필드·인자를 지우거나 바꾸면 `git status` 목록만 믿지 말고 `src/debug`·`src/release`·`test`·`androidTest` 소스셋까지 검색한다 (debug 화면이 production 모델을 직접 읽어 debug 변형만 컴파일이 깨진 적이 있다)
- `withContext {}` 뒤에 붙인 정리 코드는 취소·throw 때 건너뛴다 → `try/finally`. 블록 안에서 scope를 cancel하면 catch가 값을 돌려줘도 결과가 유실된다
- 바깥 `finally`에서 `lateinit`을 건드리면 주입 실패 예외가 원인 예외를 덮는다
- Dagger 멤버 주입은 필요한 바인딩만, scoped는 첫 요청 때 만든다 — "다른 소비자가 이 리소스를 만들어 새는가"는 그 타입의 주입 지점을 역방향 전수 검색으로 증명한다
- 분기·catch를 재구성한 diff는 `git show HEAD:<file>`로 원본과 대조한다 — 호출을 `else` 밖으로 꺼내면 특정 분기의 동작이 조용히 바뀐다

## 데이터 호환

- Room: `@Database` 버전을 올렸는데 Migration이 없거나 경로가 끊김, 같은 버전 번호 재사용(identity hash 크래시), `fallbackToDestructiveMigration`으로 데이터가 지워지는지
- 암호화 DB(SQLCipher): 복호화 실패·손상 때의 동작. Room 기본 onCorruption은 DB 파일을 통째로 지운다
- FK·CASCADE·UNIQUE를 새로 걸면 기존 행이 제약을 어겨 마이그레이션이 실패하거나 행이 같이 지워진다
- SQLite UNIQUE 인덱스는 NULL을 서로 다른 값으로 본다 → 컬럼에 NULL이 있으면 `INSERT OR IGNORE` 중복 방지가 안 된다
- 직렬화(kotlinx.serialization·Gson): 새 필드 기본값, 모르는 키 무시 설정, 필드·enum 이름 변경이 옛 데이터를 못 읽게 하는지
- Parcelable·Serializable이 SavedState·Intent·WorkManager 입력에 실려 있으면 프로세스 재시작·업데이트 뒤 옛 형식으로 돌아온다
- DataStore·SharedPreferences: 키 이름·값 타입 변경, 옛 키 정리
- Room(KSP) 타입 바인딩이 의심되면 생성된 `*Dao_Impl.kt`로 확인한다 (빌드 산출물이라 최신이 아닐 수 있음을 밝힌다)

## 보안

- 로그·크래시 리포트 커스텀 키·분석 이벤트에 사용자 식별 정보·메시지 본문·토큰이 실리는가 (release에서 남는 로그인지는 프로젝트 사실 확인)
- exported Activity·Service·Receiver·Provider: 꼭 열어야 하는가, 권한으로 막았는가. 받은 Intent를 그대로 다시 실행하는 리다이렉트, `PendingIntent`의 `FLAG_IMMUTABLE`
- 딥링크·앱 링크·푸시 페이로드 파라미터를 검증한 뒤 쓰는가
- WebView: `addJavascriptInterface`로 노출하는 메서드 범위, 신뢰하지 않는 URL 로드, 파일 접근 허용, `onReceivedSslError`에서 `proceed()`
- FileProvider 경로 범위(`root-path` 금지), 외부에서 온 파일 이름으로 경로를 만들 때 `../` 조작
- 토큰·키 저장: 평문 SharedPreferences·로그 금지, Keystore·암호화 저장소 사용
- 네트워크: 평문 HTTP 허용(`cleartextTrafficPermitted`), `TrustManager`·`HostnameVerifier`로 인증서 검증을 끄는 코드

## UI·디자인

- Edge-to-Edge: `enableEdgeToEdge()`, `WindowInsets`(statusBars·navigationBars·ime) 처리, `windowInsetsPadding`·`ViewCompat.setOnApplyWindowInsetsListener`, 인셋 중복 소비·누락, 리스트 `contentPadding`에 시스템 바 인셋 포함
- Compose Scaffold가 인셋을 자동 소비하지 않게 `contentWindowInsets = WindowInsets(0, 0, 0, 0)` + 수동 패딩
- 깨지기 쉬운 상황: 키보드 표시·숨김, 멀티윈도우, 회전, 제스처 내비 vs 3버튼 내비
- 스크롤 보호 그라디언트: 스크롤 가능할 때만, 아래 콘텐츠 터치 통과, 테마 색 사용
- 접근성: 터치 영역 48dp 이상, TalkBack `contentDescription`·`semantics`·Role·상태 알림, 장식 요소 제외, 다크모드·큰 글꼴·고대비
