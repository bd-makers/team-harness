# hook-jq-fallback-delivery — Spec

## 목적 / 요구사항

PR #29(jq 부재 fail-open 수정, merge `676bf7f`)의 독립 리뷰 6건 후속 조치.
훅 수정이 **템플릿에만 실려 기존 설치에 도달하지 않는 배달 갭**과, 그 상태에서
**doctor가 거짓 안내("차단은 유지")를 하는 정직성 갭**, 그리고 extraction-failure
경로의 **테스트 커버리지 갭**을 닫는다.

우선순위 순:

1. **P1-1 (blocking)** — 보안 수정을 기존 설치에 배달: `refreshClaudeHooks`를
   훅 4개(`block-dangerous-git.sh`, `protect-files.sh`, `pre-commit-check.sh`,
   `auto-format.sh`)로 확장. 알려진 배포본(stock)일 때만 refresh, 커스터마이즈는
   절대 덮지 않는다.
2. **P1-2 (blocking)** — doctor 정직성: jq 부재 경고 시 설치본 훅의
   `harness:jq-fallback` 마커 유무로 분기 — 마커 부재 → "무방비(fail-open),
   migrate 필요" 경고, 마커 존재 → 현행 저정밀 문구 유지.
3. **P2-3** — jq 경고에 대응하는 `warnActions` push (jq 설치 명령 + 분기 시
   migrate) — "remedy 없는 경고는 노이즈" 원칙 준수.
4. **P2-2** — extraction-failure 경로 테스트: mutation 2종(라인 49 `&&`→`;`,
   라인 53 폴백 무력화)이 반드시 fail하는 케이스 추가.
5. **P2-1** — 폴백 블록 주석의 한계 서술 일반화(모든 JSON 이스케이프 미디코드)
   + `\uXXXX` 우회를 잔여 리스크 핀 테스트로 고정. bash 이스케이프 디코딩 구현은
   범위 밖(해법은 jq 설치).
6. **P3-1 (optional)** — 폴백 추출을 `tool_input` 이후로 스코프(마커 부재 시
   전체 스캔 유지 = fail-closed).

## 설계 / 접근

- **P1-1**: 시그니처를 "마커 부재 && 구버전 문자열"보다 강하게, **알려진 stock
  버전의 sha256 목록과 바이트 정확 대조**로 구현한다. git 이력상 훅 4개의 배포된
  내용은 유한하므로(6개 pre-#29 + 4개 #29-era) 전부 열거 가능하고, 목록 밖 =
  커스터마이즈 = 절대 안 덮음이 "임의 수정 보존" 요구를 정확히 만족한다.
  기존 pnpm-hardcoded 시그니처 분기는 보존(구버전 설치가 바이트 드리프트했을
  가능성 대비). confirm/`--yes` 흐름과 반환값 계약 유지.
- **P1-2/P2-3**: `jqFallbackGaps(targetDir)` — 설치본 4개 훅 중 존재하면서 마커
  없는 것을 나열. jq 부재 && gaps>0 → missingDetail 교체 + `harness-team migrate`
  push; jq 부재이면 항상 jq 설치 명령 push. jq 경고는 여전히 warning(절대 fail++).
- **P2-2**: nojq 모드 전용 — tool_name 추출 실패 payload(키 부재)가 여전히
  차단되는지, command 추출 실패 시 payload 전체 스캔으로 차단되는지 핀.
- **P3-1**: 공유 블록에 `json_input_field()` 추가 — `${2#*\"tool_input\"}` 절단
  후 `json_field` 재사용. 마커 부재 시 `#` 치환이 원문을 그대로 반환하므로
  자연스럽게 전체 스캔 유지(fail-closed). 4개 훅의 command/file_path 추출만
  교체(tool_name은 tool_input 밖이므로 제외).

## Preservations

- 훅 exit 계약(0=허용, 2=차단), auto-format/pre-commit-check 판정 의미 불변.
- doctor jq 경고는 warning — 절대 fail++하지 않음 (exit code 계약).
- `harness:jq-fallback` 블록은 훅 4개 바이트 동일(드리프트 가드 강제).
- BSD/GNU grep 양쪽 이식성(`grep -P` 금지).
- `skipExisting` 일반 의미론 불변 — 훅 refresh는 migrate opt-in 경로로만.
- GIT_ALLOW 매트릭스·description 오탐 방지 가드 유지.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **배달 갭(delivery gap)**: 템플릿 수정이 `copyStaticAssets(skipExisting)` 때문에
  기존 설치본에 도달하지 못하는 상태. 결함의 소유는 "설치된 훅을 갱신하는 경로의
  부재"이며 skipExisting 자체가 아니다.
- **stock 훅**: 과거에 배포된 템플릿과 바이트 동일한 설치본. sha256으로 판별하며,
  stock만 refresh 대상이다. 목록 밖 = 커스터마이즈 = 안내만 하고 건드리지 않는다.
- **무방비(fail-open) 설치본**: `harness:jq-fallback` 마커가 없는 pre-#29 훅.
  jq 부재 시 판정이 빈 문자열이 되어 조용히 통과한다.
- **저정밀 모드**: 마커 있는 훅이 jq 없이 grep 폴백으로 판정하는 상태. 차단은
  유지되나 JSON 이스케이프를 디코드하지 않아 `\uXXXX` 인코딩 1글자로 매칭을
  우회할 수 있다(알려진 잔여 리스크, 해법 = jq 설치).
- 게이트 통과 근거: 사전 검증된 상세 스펙이 주어졌고(6개 항목 전부 코드·실측
  검증 완료), 수용 기준·mutation 검증 절차까지 명시되어 모호성이 없다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? (보안 수정을 기존 설치에 배달하고 doctor가 진실을 말하게 한다)
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? (Preservations 7항목 + 범위 밖 명시)
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (Acceptance: 구버전 fixture migrate→exit 2, mutation 2종 fail, npm test green)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? (migrate.mjs·doctor.mjs·훅 템플릿 4·테스트 2)
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Acceptance Criteria

- 구버전 훅 fixture에서 `migrate` → 4개 훅 refresh → jq 없는 PATH에서
  `git push --force` payload가 **exit 2**.
- 커스터마이즈된 훅은 refresh되지 않고 안내만 출력.
- 폴백 블록 없는 설치본에서 doctor jq 경고가 "차단 유지"를 주장하지 않고
  `next_actions`가 비어 있지 않다.
- mutation 검증: `block-dangerous-git.sh` 라인 49 `&&`→`;`, 라인 53
  `|| COMMAND="$INPUT"`→`|| COMMAND=""` 각각 적용 시 신규 테스트 fail(원복 확인).
- `npm run test` 전체 green (perf 테스트 `median cold boundary CLI ~100ms`는
  선재 플레이크 — 이 작업의 실패로 오인 금지).

## 참고
- PR #29 (merge `676bf7f`), merge-base `2975dc8` 시점 템플릿
- `src/harness.mjs:232` copyStaticAssets(skipExisting), `src/fsx.mjs:29`
- `tests/hooks-jq-fallback.test.mjs` 기존 32 tests, `makeBins()` 심링크 shim 패턴
