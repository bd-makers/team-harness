# skilltest-ast-grader — Artifact

*`tests/sim/skilltest.mjs` grader를 텍스트 매칭에서 구조 파싱으로 이전. 최종 결과·구조 학습·명시 disclosure.*

## 결과

**브리프 전제와 실제 커밋 상태의 불일치를 먼저 확정했다.** 브리프는 "regex 기반
grader, 세 라운드 누수(files/tests/bodies)"를 전제하지만, `origin/main`(ad937fe,
commit #2)의 `skilltest.mjs`는 이미 **구조적 파서**로 태어나 있었다 — `scanNonCode`
토큰화 + `matchBrace` 중괄호 짝맞춤 + `testBodies` 본문 경계. 기존 50개 selftest 전부
그린. 즉 files/tests/bodies 세 누수는 커밋 시점에 이미 닫혀 있었다(단일 커밋이며 세 번
패치된 이력이 아님).

**그러나 basis는 완전히 제거되지 않았다.** 본문 *경계*는 구조적이었지만, 본문 *안*의
판정이 여전히 원시 텍스트 정규식이었다:
- `markersIn` — `body.match(/^[ \t]*(?:\/\/|...)/gm)` 으로 주석 마커를 원시 본문에서 스캔
- `regionsIn` — `body.match(/\n[ \t]*\n/g)` 으로 빈 줄을 원시 본문에서 카운트

→ 누수가 "테스트 사이"에서 **"본문 안 콘텐츠"로 이동**(브리프가 경고한 round 4).
`node`로 실측 재현(false-PASS):
- 템플릿 리터럴 안의 `// Given` / `// When` / `// Then` 줄 → 가짜 3마커 → PASS
- 템플릿 리터럴/블록 주석 안의 빈 줄 → 가짜 3구획 → PASS

**수정(basis 제거).** `markersIn`/`regionsIn` 을 `maskNonCode(body)` 위에서 돌린다.
본문 경계를 잡는 그 토큰화기가 먼저 문자열·템플릿·정규식 스팬을 **비공백 sentinel 한 글자
(`MASK='#'`)** 로 치환해(내부 개행·마커·빈 줄까지 제거) 콘텐츠가 구획을 위조할 수 없게
만든다. sentinel이 공백이 아닌 것은 의도다 — 아래 FIX-B 참고: 공백으로 치우면 마스킹된
스팬 자체가 빈 줄로 읽혀 새 오판을 만든다. `keepComments`
옵션으로 `markersIn`은 주석은 보존하고(마커 = 주석이므로), `regionsIn`은 주석까지 지워
블록 주석 내부 빈 줄도 구획이 아니게 한다.

**line comment의 개행 함정(FIX-B).** `maskNonCode`가 스팬을 무엇으로 치환하느냐가
criterion 5를 가른다. `//` line comment는 `scanNonCode`가 **종료 개행의 인덱스**를
반환하므로, 스팬을 공백 하나로 접으면 그 개행까지 먹혀 주변 빈 줄이 병합된다 →
빈 줄 구획 사이 말미 인라인 주석(`const b = f(a); // 계산`)이 있는 **정상 테스트가
false-FAIL**(2구획→1구획). 반대로 개행을 살리되 공백으로 치우면 주석 줄이 공백만 남아
**빈 줄로 위조**돼 false-PASS. 해결: (a) 마스킹 sentinel을 **비공백 문자(`MASK='#'`)** 로
두어 마스킹된 스팬이 절대 빈 줄로 읽히지 않게 하고, (b) line comment의 종료 개행은
코드로 살린다(주석 줄은 콘텐츠지 구획 구분선이 아니다). 3안(공백-개행먹기 / 공백-개행살리기
/ 비공백-개행살리기)을 배터리로 비교해 마지막만 legit·false-PASS 양쪽 0 fault임을 확인.

**오파싱 본문은 채점하지 않는다(FIX-C, 리뷰 라운드 1).** 마스킹은 스팬 판정을 신뢰한다 —
스팬이 틀리면 진짜 마커·빈 줄이 마스킹돼 **false-FAIL**이 난다. JSX 산문의 아포스트로피
두 개(`Don't` … `It's`)가 가짜 문자열 스팬으로 짝지어지는 경우가 그렇다(실측: OLD PASS →
NEW FAIL). `'…'`/`"…"` 리터럴은 개행을 담을 수 없으므로 **개행을 넘는 따옴표 스팬 = 오파싱의
증거**다. `hasMisparsedString(body)`가 이를 잡아 `testBodies`가 해당 본문을 `unparsed`로
세고, `scoreGWT`는 못 읽은 본문과 동일하게 **MANUAL**로 보낸다(추측 금지 계약과 동일한 통).
백틱은 제외 — 템플릿은 개행을 합법적으로 담는다. 토큰화기(`skipString`)는 손대지 않았다.

변경 크기: 헬퍼 2개(`maskNonCode`, `hasMisparsedString`) + 호출 지점 3개(`markerLineWords`,
`regionsIn`, `testBodies`) + 신규 selftest 11개.
토큰화기(scanNonCode/matchBrace/findBodyOpen/findDeclarations)는
정확하고 검증돼 있어 **손대지 않았다**(advisor 권고).

**검증.**
- `node tests/sim/skilltest.mjs selftest` → **61/61 그린**(기존 50 불변 + 신규 11).
- 기존 50개 중 하나도 뒤집히지 않음(criterion 5). scratchpad에 OLD-vs-NEW 배터리로
  legit 13종·forbid 6종 불변, adversarial 4종 false-PASS 교정을 사전 확인; 별도 배터리로
  line-comment 3안을 비교해 FIX-B가 유일하게 무결함을 확인.
- 회귀 테스트가 **옛(원시 텍스트) basis에서 붉어짐**을 실증: mask seam을 원시 텍스트로
  되돌린 복사본에서 round-4 3개 assert(템플릿 마커·템플릿 빈 줄·블록 주석 빈 줄)가
  ❌(측정 당시 59개 기준 56/59), mask 복원 시 그린. FIX-C 회귀 2개도 부모 커밋
  ad937fe 사본에서 OLD PASS → 현재 MANUAL 임을 실측. line-comment 2개 guard는 원시 basis에서도 그린(그들은
  raw→structural 전환이 아니라 **mask 구현 자체**를 지킨다 — 공백 sentinel 안이면 붉어진다).
- `npm run test:unit` → 128 pass / 0 fail (레포 스위트 무영향; skilltest는 `npm test`에
  포함되지 않는 수동 L5 harness라 selftest가 권위 있는 검증).

## grader 구조 (학습)

문자 → 구조로 올라가는 3계층. GWT/AAA 계약("모든 테스트가 3구획을 주석 마커 또는
빈 줄로 구분")을 이 위에서 채점한다.

1. **`findDeclarations(src)`** — `it`/`test` 선언 위치. DECL 정규식
   `/(?<![\w$.])(?:it|test)\s*(?:\.\s*\w+\s*)?[(`]/y` 를 `scanNonCode` 토큰화 위에서
   sticky 스캔한다. 그래서 (a) 문자열 안 `it(`는 선언이 아니고, (b) 끝의 `[(`]` 가
   호출 `(` 와 태그드 템플릿 백틱을 **둘 다** 열림으로 인식한다.
2. **`testBodies(src)`** — 각 선언의 본문을 **다음 선언을 상한(limit)** 으로 잘라
   `findBodyOpen`(`=>` 또는 `function(...)` 뒤의 `{`) + `matchBrace`(scanNonCode 인지
   중괄호 짝)로 경계를 확정한다. 본문 훔치기(round 3)·describe 닫는 괄호 삼키기가
   구조적으로 불가능하고, 못 읽으면 `unparsed`로 세어 MANUAL 처리(추측 금지).
   경계를 잡은 뒤 `hasMisparsedString(body)`로 **스팬 판정 자체의 신뢰성**도 검사한다 —
   개행을 넘는 `'…'`/`"…"` 스팬은 따옴표 짝이 어긋났다는 뜻이므로 그 본문도 `unparsed`.
3. **`scoreGWT(src)`** — 본문마다 `markersIn`(주석 마커가 ≥2줄에 흩어져 given·when·then
   또는 arrange·act·assert를 모두 담음) 또는 `regionsIn`(빈 줄 구획 ≥2). **이제 둘 다
   `maskNonCode(body)` 위에서 돈다** — 비코드 스팬을 비공백 sentinel(`#`)로 접어(line
   comment는 종료 개행 보존) 문자열/템플릿/주석 콘텐츠가 마커·빈 줄을 위조할 수 없게 한다.
   `markersIn`은 `keepComments`로 진짜 주석은 보존한다(마커 = 주석이므로).

`scanNonCode`가 문자열/템플릿/`//`·`/* */` 주석/정규식 리터럴을 판별하고
(`startsRegex`가 나눗셈 vs 정규식, JSX `/>`·`</`를 구분), 미완결 스팬은 -1을 반환해
호출자가 추측하지 않게 한다.

## 세 blind spot 상태 (브리프 요구: 특례면 명시)

- **`it.each` 태그드 템플릿** — DECL의 `[(`]` 백틱 대안으로 선언 인식. 이는 호출/태그
  경계를 구조적으로 인식하는 것이라 **특례 아님**(구조적 귀결). selftest 그린.
- **`.then(` 오인** — 마커를 **주석 줄로 한정**해서 코드의 `.then(`이 GWT `then`으로
  읽히지 않는다. 이건 **유지된 규칙(특례)** 이다: 구조 파싱은 주석의 *의미*를 알려주지
  않으므로 "마커는 주석"이라는 의미 규칙이 별도로 필요하다. → 명시함.
- **2섹션 예외 테스트(`// When & Then`)** — `MARKER_SEGMENT`(`&`·`/`·`+`·`,`·`and`)로
  한 주석 줄을 분절해 두 구획으로 센다. 이건 **유지된 특례**로, 구조 파싱의 자연 귀결이
  아니라 toThrow 단일 assert 관용구를 위한 의미 규칙이다. → 명시함.

## 잔여 텍스트-basis (범위 밖 — 별도 태스크로 콜아웃, 조용히 확장 안 함)

GWT 3구획 판정만 de-base 했다(브리프가 지목한 재발 클래스). 나머지 presence 신호는
여전히 **원시 whole-source `.test()`** 이다: `hasExpect`, `hasSnapshot`, `hasTestId`,
`hasUserFacingQuery`, `hasUserEvent`, `hasFireEvent`, `hasReactTestRenderer`.

- 방향성(같은 뿌리): `hasExpect`는 문자열 `"expect("`이 약한 false-PASS를 유발할 수 있고,
  `hasSnapshot`은 주석 `// toMatchSnapshot 금지` 같은 문구가 **false-FAIL**(계약 허용을
  금지로 오판)을 유발할 수 있다.
- 판단: advisor가 변경 범위를 `markersIn`/`regionsIn`으로 한정 권고했고, 브리프가
  "silently widen 금지"를 지시했다. 재발 클래스(3구획 false-PASS) 밖이라 **이 태스크에서
  손대지 않고 콜아웃**한다. 캡틴이 원하면 동일한 `maskNonCode`로 확장 가능하며 legit
  테스트를 깨지 않는다(masking 후에도 코드상의 실제 호출은 그대로 잡힘).

## 오파싱 잔여 (범위 밖 — 콜아웃)

`hasMisparsedString`은 **본문 범위**의 사후 탐지다. 근본 수정은 `skipString`이 백틱이
아닌 따옴표에서 개행을 만나면 멈추게 하는 한 줄이지만, 토큰화기는 이 태스크에서
**의도적으로 불가침**(브리프·advisor·캡틴 3중 지시)이라 택하지 않았다. 그 결과 남는 것:

- **본문 밖 오파싱** — 가짜 따옴표 스팬이 `it(` 선언 자체를 삼키면 본문 검사에 닿지 않는다.
  다만 그 경우 짝이 남지 않아 `skipString`이 -1을 반환하고, `findDeclarations`가
  `truncated`로, `matchBrace`가 `end === -1`로 각각 MANUAL 경로에 태운다 —
  즉 조용한 PASS/FAIL이 아니라 이미 수기 확인으로 빠진다. 각주지 구멍은 아니다.
- **정상 테스트의 MANUAL 승격(감수한 비용)** — 짝수 개의 맨 아포스트로피가 든 JSX 산문은
  실제로 옳게 채점되던 경우에도 MANUAL로 간다. "못 읽으면 추측 금지" 계약상
  false-PASS/false-FAIL보다 나은 실패 방향이라 좁히지 않았다.

## sibling harness 점검 (브리프 요구)

`tests/sim/`의 `agentloop.mjs`·`codex-agentloop.mjs`에는 GWT/본문 grading 프리미티브가
**0개**(grep 확인). `agentloop.mjs`는 설치된 scaffold(SC1–SC6: 파일 존재·훅 발화·plan
체크박스)를 채점하고, `codex-agentloop.mjs`는 JSONL(`parseCodexJsonl`) 파서다. 테스트
소스의 구조를 채점하지 않으므로 **동일 defect 없음**. 범위 확장 불필요.

## criterion 매핑

1. 세 누수(files/tests/bodies)는 **모두 커밋 시점의 구조적 파서가 이미 닫아 두었다**
   (across-tests/bodies는 기존 selftest에 존재). 새로 추가한 across-files 3개는 gap을
   메운 게 아니라 **round-1 basis(whole-blob 단어 스캔) 회귀를 못박는** 가드다(원시
   텍스트 basis에서도 그린 — 본문 경계가 구조적이라 concat도 세탁 안 됨). 이번 태스크가
   실제로 닫은 것은 **round 4(본문 안 콘텐츠)** 이며, 그 신규 3개는 원시 basis에서 붉어짐을
   실증했다. ✓
2. `it.each` 태그드 템플릿 채점됨(skip 안 함). ✓
3. `.then(`이 GWT `then`으로 등록 안 됨. ✓
4. 문자열·템플릿·주석·정규식 안 중괄호/마커/빈 줄이 경계·구획을 오염 안 함. ✓
5. 옛 grader가 옳던 곳은 결과 불변(50개 selftest 그린 유지). ✓
6. 신규 런타임 의존성 0(stdlib만). ✓

## Reviews

*리뷰 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

- **2026-07-29 · advisor 사전 리뷰(착수 전)** — 진단 확인 + 3개 보강 지시.
  발견/조치: (1) **BLOCKING**: `maskNonCode`가 멀티라인 문자열을 공백 하나로 접으면,
  구획 경계가 문자열 *안*에만 있던 테스트는 OLD-PASS→NEW-FAIL로 뒤집힌다(criterion 5
  경계). → OLD-vs-NEW 배터리로 legit 13종 불변 확인, reverse-shape는 "문자열 안에만
  있던 구획은 애초에 가짜였다"는 **의도된 교정**으로 판정·기록. (2) `keepComments` 경로에서
  멀티라인 문자열 뒤 주석 마커가 여전히 3줄로 잡히는지 실측 → PASS. (3) across-files
  회귀 테스트 누락(criterion 1) → 신규 3개 추가. 모두 반영 후 57/57 그린.
- **2026-07-29 · advisor 완료 전 리뷰** — 2개 발견, 1개 BLOCKING.
  발견/조치: (1) **BLOCKING**: `maskNonCode`가 line comment의 종료 개행까지 먹어(공백
  치환) **빈 줄 구획 사이 말미 인라인 주석이 있는 정상 테스트를 false-FAIL** 시킴
  (advisor 지시대로 실측: 2구획→1구획). advisor의 문자 그대로 fix(개행 살리되 공백)는
  반대로 주석 줄을 빈 줄로 위조(false-PASS)함을 배터리로 확인 → **비공백 sentinel(`#`) +
  개행 보존(FIX-B)** 로 양방향 무결 해결. line-comment guard 2개 추가(59/59). (2) criterion
  1 매핑 문구가 across-files gap을 "메웠다"로 오독될 수 있음 → 세 누수는 이미 닫혀 있었고
  신규 asserts는 round-1 basis 회귀 가드임을 명확히 재서술. (3) `hasSnapshot` false-FAIL
  콜아웃은 캡틴용으로 유효 — 콜아웃 유지가 옳다는 확인.
- **2026-07-30 · 파이프라인 코드 리뷰 라운드 1** — 3개 발견, 전부 조치.
  발견/조치: (1) **warning · criterion 5 위반**: `skipString`이 개행에서 멈추지 않아 JSX
  산문의 아포스트로피 두 개(`Don't` … `It's`)가 가짜 문자열 스팬으로 짝지어지고,
  그 사이의 `// When`이 `maskNonCode`에 먹혀 정상 테스트가 OLD PASS → NEW FAIL로
  뒤집힘. 실측 확인: 베이스 커밋 사본 `scoreGWT` = PASS, HEAD = FAIL(`1/1 테스트에 3구획
  없음`). → 토큰화기 불가침을 지키는 경로로 수정 — `hasMisparsedString`(개행을 넘는
  `'…'`/`"…"` 스팬 = 오파싱)을 `testBodies`에 걸어 해당 본문을 `unparsed` → **MANUAL**로
  보낸다(FIX-C). 회귀 selftest 2개 추가(주석 마커 삼킴 · 빈 줄 구획 삼킴, 둘 다 옛 basis
  에서는 PASS). 백틱은 제외 확인(기존 멀티라인 템플릿 assert 그린 유지). 근본 한 줄
  (`skipString` 개행 정지)은 3중 불가침 지시라 택하지 않고 "오파싱 잔여" 섹션에 콜아웃.
  (2) **info**: 본 파일 "수정(basis 제거)" 문단이 sentinel을 "공백 하나"로 서술해 10줄
  아래 FIX-B(비공백 `MASK='#'`)와 모순 → 비공백 sentinel로 재서술. line 130의 Reviews
  항목은 *기각된* 첫 구현을 서술하므로 사료로서 정확 — 그대로 둠. (3) **info**: task
  SSOT 4파일 중 spec·plan·handoff 누락 + 두 레지스트리 미등록 → 형제 24개 태스크 형태에
  맞춰 생성·등록(`docs/chad/` 범위 한정, AGENTS.md/CLAUDE.md 무수정).

## Learnings

- **basis를 지우는 것 ≠ 경계 하나를 패치하는 것.** 본문 *경계*를 구조적으로 만든 뒤에도
  본문 *안*의 판정이 원시 텍스트면 누수는 콘텐츠로 이동한다. 같은 토큰화기를 판정 지점까지
  끝까지 밀어야(`maskNonCode`) 클래스가 "구조적으로 불가능"해진다.
- **회귀 테스트는 옛 basis에서 붉어져야 진짜다.** mask seam을 되돌린 복사본에서 3개
  assert가 ❌ 나는 것을 확인해야 "옛 것에 대한 회귀"임이 증명된다. 그냥 그린은 증거가 아니다.
- **criterion 5는 "옳던 곳"만 보호한다.** 옛 grader의 PASS가 애초에 가짜(문자열 안 구획)면
  NEW-FAIL은 위반이 아니라 교정 — 단, 놀람으로 튀어나오지 않게 문서화한다.
- **마스킹은 스팬 판정을 신뢰한다 — 그래서 오파싱을 감지해야 한다.** 원시 텍스트 basis는
  틀린 스팬에 둔감했지만, 마스킹은 틀린 스팬을 곧바로 false-FAIL로 증폭한다. 토큰화기를
  못 고치는 상황이라면 최소한 **불가능한 모양**(개행을 넘는 `'…'` 스팬)을 탐지해 채점을
  거부해야 한다 — 채점 거부(MANUAL)는 오답보다 언제나 낫다.
- **범위 규율.** presence 체크와 sibling harness는 같은 뿌리를 공유할 수 있으나, 재발
  클래스 밖이면 조용히 넓히지 말고 콜아웃한다(브리프·advisor 공통 지시).
- **마스킹은 무엇으로 치우느냐가 정답을 가른다.** 비코드 스팬을 공백으로 치우면 그 자체가
  빈 줄/개행 병합을 유발해 새 오판을 만든다. sentinel은 **비공백**이어야 하고, line comment의
  종료 개행은 코드로 살려야 한다(스팬 종료 인덱스가 개행을 가리키는 유일 케이스). 후보를
  배터리로 비교하기 전엔 "고쳤다"고 하지 말 것 — 첫 구현(공백 치환)이 실제로 criterion 5를
  깼고 selftest에 그 케이스가 없어 놓칠 뻔했다.
