# codex-l5-sim-plan — Plan

## 목표
Codex plugin/headless 지원을 `codex exec` 기반 L5 시뮬레이션으로 검증할 수 있도록 runner, skill, 리포트 계약을 추가한다.

## 단계
- [x] Phase 0: 현재 Claude L5 runner와 공유 가능한 유틸 범위 식별
- [x] Phase 1: `tests/sim/codex-agentloop.mjs probe` 최소 구현
- [x] Phase 2: Codex preflight 구현
- [x] Phase 3: throwaway sandbox 생성/정리 구현
- [x] Phase 4: `codex exec --json` spawn 및 JSONL parser 구현
- [x] Phase 5: SC0 probe 시나리오 구현
- [x] Phase 6: SC1 explicit skill trigger 시나리오 구현
- [x] Phase 7: SC2 natural-language trigger 시나리오 구현
- [x] Phase 8: SC3 task workflow 시나리오 구현
- [x] Phase 9: SC4 installed post-commit hook compatibility 시나리오 구현
- [x] Phase 10: SC5 packaging/availability 시나리오 구현
- [x] Phase 11: SC6 cleanup/contamination check 구현
- [x] Phase 12: report/snapshot writer 구현
- [x] Phase 13: failure isolation 절차 구현
- [x] Phase 14: `skills/harness-codex-sim/SKILL.md` 추가
- [x] Phase 15: README 또는 sim guide에 Claude L5 vs Codex L5 운용법 문서화
- [x] Phase 16: unit/e2e smoke 검증 추가 및 `npm test` 통과 확인

## 상세 계획

### Phase 0: 기존 구조 점검

- `tests/sim/agentloop.mjs`에서 재사용 가능한 요소를 확인한다.
  - `isoStamp`
  - low-level process runner
  - sandbox 생성 패턴
  - stack matrix 정의
  - hash/non-destructive 검증
  - report writer 구조
- 처음부터 큰 abstraction을 만들지 않는다.
- Codex runner가 안정화된 뒤 중복이 의미 있게 남으면 `tests/sim/lib/*.mjs`로 분리한다.

### Phase 1: probe 최소 구현

명령:

```bash
node tests/sim/codex-agentloop.mjs probe
```

probe가 확인할 신호:

- `command -v codex`
- `codex doctor` 또는 `codex exec` smoke로 auth 가능성 확인
- `codex exec --json --ephemeral` 실행 가능
- JSONL 이벤트 파싱 가능
- `thread.started`, `turn.started`, `turn.completed` 또는 `turn.failed` 관찰 가능
- final agent message를 diagnostic으로만 저장

예상 headless 형태:

```bash
codex exec \
  --json \
  --ephemeral \
  --sandbox workspace-write \
  -c 'approval_policy="never"' \
  --skip-git-repo-check \
  -C "$SANDBOX_DIR" \
  "Reply exactly: CODEX_SMOKE_OK"
```

Full `run` 시나리오는 `.git/hooks/post-commit` 설치를 검증해야 하므로 throwaway `.sim-tmp`에서만 `--sandbox danger-full-access`를 사용한다.

### Phase 2: preflight

확인 항목:

- `../harness-playground` 존재
- `command -v codex`
- `command -v harness-team`
- `codex doctor` 또는 smoke exec로 auth 상태 확인
- `.codex-plugin/plugin.json` 존재 및 `skills` 경로 확인
- local plugin install/cache 상태는 직접 목록보다 functional probe를 우선한다.
- CI에서는 `CODEX_API_KEY`가 runner 전체 환경에 노출되지 않고 `codex exec` 호출에만 주입되는지 확인한다.

중단 조건:

- playground 없음: dev 전용 도구 부재로 graceful stop
- codex CLI 없음: Codex L5 불가
- auth 실패: `codex login` 또는 단일 호출 `CODEX_API_KEY=... codex exec` 준비 요청
- plugin skill 미사용: 설치/enable/restart 필요 또는 packaging 결함 후보

### Phase 3: sandbox

- 기존 Claude runner처럼 `../harness-playground/.sim-tmp/<TS>/<scenario>` 아래에 throwaway project를 만든다.
- `git init`, user config, `commit.gpgsign=false`를 설정한다.
- `.bin/harness-team` shim을 만들어 installed hook이 local source `bin/harness-team.mjs`를 부르도록 한다.
- `package.json` stack signature로 node/next/react-native matrix를 만든다.

### Phase 4: Codex JSONL parser

수집 항목:

- exit code
- stdout JSONL raw
- stderr progress/debug raw
- `thread_id`
- turn status
- command execution items
- file change items
- error events
- final agent message
- usage when present

판정:

- JSON parse 실패: runner/sim artifact 후보
- `turn.failed` 또는 `error`: Codex execution FAIL
- final message만 성공처럼 보여도 파일/git 증거 없으면 PASS 금지

### Phase 5: SC0 probe

- 빈 sandbox에서 smoke prompt 실행
- `CODEX_SMOKE_OK` final message는 auth/envelope diagnostic으로만 사용
- JSONL event stream과 process exit code를 PASS 증거로 사용

### Phase 6: SC1 explicit skill trigger

Prompt 예시:

```text
$harness-aijient-team:harness-team
Apply the team harness to this project. Use the existing harness-team CLI. Do not create a commit.
```

증거:

- `AGENTS.md` 생성 및 harness section marker
- `CLAUDE.md`와 `GEMINI.md` thin import
- `.harness/config.json`
- `.claude/settings.json` 및 rules
- `node <plugin>/bin/harness-team.mjs doctor --json` green

### Phase 7: SC2 natural-language trigger

Prompt 예시:

```text
Apply the team harness to this project using the installed Harness AIjient Team Codex plugin. Do not create a commit.
```

증거:

- SC1과 동일
- explicit skill mention 없이도 pass-rate `N=2`로 기록
- 실패 시 plugin description/skill description 개선 후보로 분류

### Phase 8: SC3 task workflow

Prompt 예시:

```text
$harness-aijient-team:harness-team
Create or activate a harness task named codex-sim-task. Keep changes limited to harness task docs.
```

증거:

- `docs/<user>/codex-sim-task/` 4 SSOT 생성
- `.harness/active.json`이 task를 가리킴
- spec에 Ambiguity 자가진단과 Ontology 존재
- plan에 체크리스트 존재

### Phase 9: SC4 installed post-commit hook compatibility

- Codex로 apply/task까지 수행한 sandbox에서 parent runner가 직접 파일 하나를 변경하고 git commit을 만든다.
- installed hook이 `harness-team handoff`를 호출하는지 확인한다.

증거:

- commit 전후 handoff mtime advanced
- handoff 내용에 latest commit 또는 갱신 marker 존재
- hook stderr/stdout 캡처

주의:

- 이 항목은 Codex가 hook을 실행했다는 뜻이 아니라, Codex가 설치한 harness hook이 정상 동작한다는 compatibility 신호다.

### Phase 10: SC5 packaging/availability

증거 우선순위:

- 기능 증거: headless Codex가 skill 지침을 따라 harness output 생성
- manifest 증거: `.codex-plugin/plugin.json`의 `skills` 경로와 shipped skill 파일 존재
- CLI plugin 목록은 보조 진단으로만 사용한다.

실패 분류:

- plugin unavailable: 설치/enable/restart 문제
- skill invocation ambiguity: prompt/description 문제
- CLI defect: 직접 `harness-team` 실행도 실패

### Phase 11: SC6 cleanup/contamination

- `.sim-tmp/<TS>` 제거 확인
- `../harness-playground/rn-app`, `next-app`, `bare-node` git status clean 확인
- source repo dirty 파일 중 runner가 의도한 파일만 변경됐는지 확인

### Phase 12: report/snapshot

리포트 템플릿:

```md
# codex-agentloop 리포트 — <TS>

| 항목 | 값 |
|---|---|
| 실행일시 | <TS> |
| plugin 버전 | <version> |
| plugin git SHA | <sha> |
| 측정 레이어 | Codex L5 agent-in-the-loop |
| 실행 엔진 | codex exec |
| 신호 집계 | PASS n · FAIL n · MANUAL n · N/A n |

## SC0 — probe
## SC1 — explicit skill trigger
## SC2 — natural-language trigger
## SC3 — task workflow
## SC4 — installed hook compatibility
## SC5 — packaging/availability
## SC6 — cleanup
```

### Phase 13: failure isolation

분리 규칙:

- Codex 실패 + direct CLI 성공: Codex prompt/permission/plugin/sandbox 문제
- Codex 실패 + direct CLI 실패: harness CLI/template 실제 결함 후보
- JSONL parse 실패: runner artifact 후보
- auth/permission 실패: 환경 준비 문제
- natural-language만 실패: skill/plugin description 문제

CLI 격리 예시:

```bash
node bin/harness-team.mjs apply --yes
node bin/harness-team.mjs doctor --json
node bin/harness-team.mjs task codex-sim-task
```

### Phase 14: Codex sim skill

새 skill:

```text
skills/harness-codex-sim/SKILL.md
```

역할:

- `codex-agentloop.mjs probe/run` 운용 절차
- Codex auth/preflight
- PASS/FAIL/MANUAL/N/A 해석 규칙
- failure isolation 지침
- Claude L5와의 경계 명시

### Phase 15: 운용 문서

개발 루프:

```bash
npm test
node tests/sim/codex-agentloop.mjs probe
```

릴리스 후보:

```bash
npm test
node tests/sim/agentloop.mjs probe
node tests/sim/codex-agentloop.mjs probe
node tests/sim/agentloop.mjs run
node tests/sim/codex-agentloop.mjs run
```

CI/nightly:

```bash
CODEX_API_KEY=... node tests/sim/codex-agentloop.mjs probe
```

API key는 job-wide env로 두지 않고 Codex invocation에만 주입한다.

### Phase 16: 검증

- `npm test`
- `node tests/sim/codex-agentloop.mjs probe`
- 가능 시 `node tests/sim/codex-agentloop.mjs run`
- 기존 `node tests/sim/agentloop.mjs probe` 회귀 확인

## 판정 기준

- PASS: 파일/git/JSONL/hook output 증거가 모두 충족됨
- FAIL: 관찰 가능한 계약 위반이며 CLI 격리 후에도 실제 결함으로 남음
- MANUAL: headless 환경에서 안정적으로 관찰할 수 없음
- N/A: Claude-only 또는 Codex-only 차이로 해당 레이어의 측정 대상이 아님

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-07-08: Codex L5, JSONL evidence, skill trigger, functional availability, sim artifact 정의 추가.

## 참고
- Codex manual: Non-interactive mode, Agent Skills, Plugins
- `codex exec --help`
- `tests/sim/agentloop.mjs`
- `.codex-plugin/plugin.json`
