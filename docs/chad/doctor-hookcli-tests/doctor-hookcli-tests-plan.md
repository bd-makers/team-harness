# doctor-hookcli-tests — Plan

## 목표

0.13.0 검토에서 드러난 테스트 커버리지 갭 3건을 메운다.
신규 테스트 파일 0 — `tests/doctor.test.mjs` 확장. `checkHookCli` 로직은 건드리지 않는다.

## 단계

### 1. `hookCliInstall` 추출 + export

- [x] `runDoctor` 지역 변수(`doctor.mjs:143-144`)를 모듈 스코프 함수로 추출
      → `hookCliInstallCommand(env)` + `HOOK_CLI_MARKETPLACE_DIR` 상수 (`doctor.mjs:52-61`)
- [x] `runDoctor`가 그 함수를 호출하도록 교체 — 출력 문자열은 **바이트 동일**해야 한다
- [x] **검증**: `npm run test` 209개 무회귀 + probe의 warning detail과
      JSON `next_actions`가 변경 전 캡처와 `diff` 결과 동일

### 2. 복구 명령 회귀 테스트 (핵심)

- [x] `hookCliInstallCommand()`가 `npm i -g "<절대경로>"` 형태이고 경로가
      `marketplaces/harness-aijient-team-marketplace`로 끝남을 어써션
- [x] `CLAUDE_PLUGINS_ROOT` 주입 시 그 값을 존중 / 미설정 시 `~/.claude/plugins` 폴백
- [x] **패키지명 직접 설치 형태 금지 가드** — `/npm i -g\s+harness-aijient-team(?![-\w])/`가
      명령 결과와 `README.md` 본문 어디에도 매치되지 않음.
      (negative lookahead로 `...-marketplace` 경로는 오탐하지 않음)
- [x] README가 doctor와 같은 경로 조각(`marketplaces/harness-aijient-team-marketplace`)을 포함
- [x] **검증**: M1(명령을 패키지명 직접 설치로 되돌림) → fail 1,
      M2(README에 404 안내 추가) → fail 1

### 3. plugin-dev skip 분기 어써션

- [x] `tests/doctor.test.mjs`의 기존 plugin-dev 통합 테스트에 어써션 추가 —
      `checks[]`에 `SessionStart/post-commit hook CLI`가 `status: 'skip'`으로 존재
- [x] **검증**: M3(skip `add` 호출 주석 처리) → fail 1

### 4. 실제 `--help` 대조 테스트

- [x] 임시 디렉토리에 `node`와 `bin/harness-team.mjs`를 심링크해 PATH를 격리
      (env-shebang이 같은 PATH에서 node를 찾아야 하므로 node도 함께 링크)
- [x] 그 PATH로 `checkHookCli`가 true를 반환함을 어써션
- [x] **검증**: M4(help의 `session-context` 줄에 불릿 추가) → fail 1

### 5. 마무리

- [x] `npm run test` 전체 통과 — 209 → **212 pass / 0 fail** (+ perf 1)
- [x] 자체 코드 리뷰 6항목 → `artifact.md ## Reviews`에 기록
- [x] `artifact.md` 결과·학습 작성 후 커밋 → `harness-team done`

## Ontology 변경 로그

- 2026-08-07 — **문자열 계약(string contract)** 정의 신설: 코드가 만들어 사용자에게 노출하지만
  틀려도 테스트가 실패하지 않는 명령·경로 문자열. #16의 npm 404 안내가 그 사례.
- 2026-08-07 — **help 어써션 비대칭** 정의 신설: 같은 `--help`를 `checkSelfCli`(느슨)와
  `checkHookCli`(엄격)가 다른 기준으로 파싱하는 상태.

## 참고

- 근거·배경은 `doctor-hookcli-tests-spec.md`
- 선행: `chad/harness-activation`, `chad/release-0-13`
