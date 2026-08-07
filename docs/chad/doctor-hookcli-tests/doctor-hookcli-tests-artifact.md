# doctor-hookcli-tests — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

0.13.0 검토에서 드러난 테스트 커버리지 갭 3건을 고정했다. 프로덕션 동작은 바뀌지 않는다 —
`hookCliInstall` 추출은 출력 문자열이 바이트 동일함을 확인했다.

**`src/commands/doctor.mjs`** (+14/-2)
- `runDoctor` 지역 변수였던 복구 명령 생성을 `hookCliInstallCommand(env)`로 추출하고
  `HOOK_CLI_MARKETPLACE_DIR` 상수를 분리 — doctor 경고 detail · JSON `next_actions` · README가
  같은 소스를 가리키게 했다.
- `env` 파라미터화로 테스트가 `CLAUDE_PLUGINS_ROOT`를 주입할 수 있다(기본값 `process.env`라 동작 동일).

**`tests/doctor.test.mjs`** (+48/-3) — 신규 3개 + 기존 통합 테스트 1개 확장
1. `hookCliInstallCommand`: 경로 형태, `CLAUDE_PLUGINS_ROOT` 존중, 미설정 시 `~/.claude/plugins` 폴백,
   그리고 **패키지명 직접 설치 형태 금지**. negative lookahead `(?![-\w])`로
   `...-marketplace` 경로는 오탐하지 않는다.
2. README가 doctor와 같은 마켓플레이스 경로 조각을 안내하고, 404가 되는 형태를 담지 않음.
3. `checkHookCli`를 **실제 bin**으로 검증 — 임시 디렉토리에 `node`와 `bin/harness-team.mjs`를
   심링크해 PATH를 격리한다(env-shebang이 같은 PATH에서 node를 찾아야 하므로 node도 링크).
4. plugin-dev 통합 테스트에 `SessionStart/post-commit hook CLI` = `status: 'skip'` 어써션 추가.

**검증: 209 → 212 pass / 0 fail** (+ perf 1). 통과만이 아니라 **각 테스트를 의도적으로 깨뜨려
실패를 확인**했다:

| Mutation | 결과 |
|---|---|
| M1 — 복구 명령을 `npm i -g harness-aijient-team`으로 되돌림 | fail 1 ✅ |
| M2 — README에 404 안내 줄 추가 | fail 1 ✅ |
| M3 — `runDoctor`의 plugin-dev skip `add` 호출 주석 처리 | fail 1 ✅ |
| M4 — help의 `session-context` 줄에 불릿 추가 | fail 1 ✅ |

probe 재확인: 격리 PATH에서 warning detail이 변경 전 캡처와 `diff` 동일,
plugin-dev에서 `- SessionStart/post-commit hook CLI  (plugin-dev repo — n/a)`.

## Reviews

- **2026-08-07 — 자체 코드 리뷰 (AGENTS.md 6항목)**
  - **정확성**: 추출 전후 출력 바이트 동일(`diff` 확인). 각 테스트의 실효성은 mutation 4건으로 확인.
  - **엣지 케이스**: `CLAUDE_PLUGINS_ROOT` 설정/미설정 양쪽 어써션. 금지 정규식의 lookahead가
    `-marketplace` 경로 오탐을 막는다. env-shebang의 node 해석 문제를 PATH에 node를 링크해 해결.
  - **회귀**: 212 pass / 0 fail. `hookCliInstallCommand()`의 기본값 `process.env`가 기존
    `process.env.CLAUDE_PLUGINS_ROOT` 직접 읽기와 동등.
  - **보안**: 외부 입력 없음. `homedir()` 기반 경로 문자열을 **생성만** 하고 실행하지 않는다.
  - **단순성**: 지역 변수 → 함수 1 + 상수 1. 추상화 추가 없음, 신규 테스트 파일 0.
  - **테스트**: 갭 3건이 모두 어써션으로 고정됨. 남은 미검증 지점은 아래 Learnings 참조.
  - 발견된 결함 없음 → 조치 없음.
- **2026-08-07 — Codex 리뷰 (`codex exec --sandbox read-only`, 커밋 `e32f7b1` 대상)**
  - **발견 (P2, 테스트 공백)**: 금지 정규식 `/npm i -g\s+harness-aijient-team(?![-\w])/`가
    **`npm i` 축약형·비인용 형태만** 차단한다. `npm install -g harness-aijient-team`,
    `npm i -g "harness-aijient-team"`, `npm i --global ...`은 통과하므로,
    README에 올바른 경로 안내와 404 안내가 **함께** 있으면 회귀를 놓친다.
  - **검증**: 6개 케이스로 대조해 지적이 사실임을 확인(변형 3건 미검출).
  - **조치**: 공통 상수 `FORBIDDEN_NPM_INSTALL`로 추출하고
    `/npm\s+(?:i|install)\s+(?:-g|--global)\s+["']?harness-aijient-team(?![-\w])/`로 확대.
    정규식 자체를 검증하는 테스트를 추가해(4개 금지 변형 + 2개 정상 경로) 가드가
    오탐 없이 넓어졌음을 고정했다. 212 → **213 pass**, mutation(README에
    `npm install -g` 형태 추가) → fail 1 확인.
- Gemini 리뷰는 미실행 — 이 머신에 `gemini` CLI가 없다(doctor 확인).

## Learnings

- **"확인했다"는 읽은 것인지 실행한 것인지 구분해서 적어야 한다.** `harness-activation`의 probe는
  README 절차를 *읽고* "확인했다"고 기록했고, 그 절차의 `npm i -g harness-aijient-team`이
  404라는 사실은 PR #17에서야 드러났다. artifact에 검증을 기록할 때는 **실행 여부**를 명시한다.
- **통과하는 테스트는 절반의 증거다.** 새 테스트는 "의도적으로 깨뜨렸을 때 실패하는가"까지
  확인해야 회귀 가드로 성립한다. 이번 4건 중 M3는 첫 시도에서 치환이 문법을 깨뜨려
  테스트가 로드조차 되지 않았고, `pass/fail` 라인 부재로 그것을 알아챘다 —
  mutation 결과는 "fail 개수"가 아니라 "테스트가 실제로 돌았는가"부터 봐야 한다.
- **같은 출력을 파싱하는 검사기가 둘이면 어써션 엄격도를 맞춰야 한다.** `checkSelfCli`(느슨한
  substring)와 `checkHookCli`(줄 앵커 정규식)는 같은 `--help`를 다른 기준으로 읽는다.
  0.13.0이 실제로 그 help 텍스트를 편집했고(`3 manifests` → `4 manifests`) 마침 다른 줄이었다.
  이제 후자도 실제 bin으로 고정된다.
- **사용자에게 노출되는 명령·경로 문자열은 "문자열 계약"으로 다뤄야 한다.** 로직은 테스트되는데
  로직이 만들어내는 안내 문자열은 테스트되지 않는 사각지대가 #16 결함을 통과시켰다.
