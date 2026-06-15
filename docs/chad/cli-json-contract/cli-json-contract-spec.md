# cli-json-contract — Spec

> **0.8.0 P2** — CLI observation / error 계약 (multi-agent drive 정합).
> 백로그 출처: [docs/superpowers/plans/2026-05-29-0.8.0-improvements.md](../../superpowers/plans/2026-05-29-0.8.0-improvements.md) **P2** (보조 참조 — 요구사항 본문은 이 파일이 SSOT).

## 목적 / 요구사항

drive 결정(D2)으로 OpenCode 등 보조 드라이버가 `harness-team` CLI를 Bash로 호출한다 → **CLI stdout이 곧 에이전트의 observation**이다. 현재 출력은 전부 사람용 산문이라 에이전트가 다음 행동을 파싱·결정하기 어렵다. drive 대상 4개 커맨드(`task`/`retro`/`release`/`doctor`)에 **opt-in `--json` 구조화 엔벨로프**를 추가한다. 사람용 출력은 기본값으로 **무수정 유지**.

**요구사항 (수용 기준):**
1. `harness-team <cmd> --json` 이 통합 envelope 스키마로 출력 — `task`/`retro`/`release`/`doctor`.
2. 모든 에러 경로가 `root_cause` + `safe_retry` + `stop_condition` 포함 (현재 계약이 없는 `task` 포함).
3. `doctor --json` 이 per-check machine-readable 출력 → 에이전트가 "어느 도구/파일이 빠졌는지" 프로그램적으로 판단 가능.
4. `--json` 모드는 stdout에 **단일 JSON 객체 1개만** 출력(성공·에러 공통), `process.exitCode`로도 결과 신호.
5. 기존 사람용 출력·테스트 회귀 0.

## 설계 / 접근

### 엔벨로프 스키마 (확정 — 통합, error nullable)
```jsonc
{
  "schema": "harness/observation/v1",
  "command": "release",
  "status": "success | warning | error",
  "summary": "<한 줄 요약>",
  "next_actions": ["<다음 행동>", ...],
  "artifacts": ["<생성/변경 산출물 경로>", ...],
  "error": null | {
    "root_cause": "<근본 원인>",
    "safe_retry": "<안전 재시도 지침>",
    "stop_condition": "<멈춤 조건>"
  }
}
```
- **doctor만** `checks: [{ "label", "status": "pass|fail|missing|optional", "detail"? }]` 추가 필드.
- **status 규칙:** `fail>0 → error` / `warning만 → warning` / `그 외 → success`. release dry-run = success.

### 아키텍처 — 공유 헬퍼 + opt-in 스레딩
- 신규 모듈 `src/observation.mjs` (기존 `merge.mjs`/`render.mjs`/`prompt.mjs` 단일목적 모듈 패턴 답습):
  - `SCHEMA = "harness/observation/v1"` 상수
  - `buildEnvelope({ command, status, summary, nextActions, artifacts, error, extra })` → plain object. `error` 기본 `null`, `nextActions`/`artifacts` 기본 `[]`, `extra`(예: doctor `checks`) 병합. status가 명시되지 않으면 error 유무로 추론하지 않고 **호출부가 항상 명시**.
  - `emitObservation(env)` → `console.log(JSON.stringify(env, null, 2))`.
- `--json` 은 이미 `bin/harness-team.mjs` 파서에서 `ctx.flags.json`(boolean true)로 통과 — 파서 수정 불필요.
- 각 커맨드는 출력 분기점에서 `ctx.flags.json` 이면 envelope 1회 emit + exitCode, 아니면 **기존 human path 그대로**.

### 커맨드별 매핑
| 커맨드 | 현재 상태 | --json 작업 |
|---|---|---|
| **release** | 이미 cause/retry/stop + 결과객체 반환, err.kind 분기 | 결과객체·advice → envelope 직매핑 |
| **retro** | 이미 ✓/✗ + cause/retry/stop, exitCode 1 | 동일 패턴 → envelope |
| **doctor** | ✓/✗/-/⚠️ 루프, machine 없음, exitCode 1 | 루프에서 `checks` 누적 → envelope(+checks) |
| **task** | 평문 created:/activated:, **에러계약·exitCode 없음** | envelope + **human 에러경로에도 cause/retry/stop·exitCode 추가**(retro/release와 정합) |

### 범위 / 비범위
- **범위:** drive 4커맨드만. 헬퍼는 제네릭이라 나머지 8커맨드는 후속 opt-in 가능(YAGNI — 지금 안 함).
- **비범위:** 출력 포맷 변경(human path), 파서 리팩토링, 다른 커맨드 `--json`.
- `bin/harness-team.mjs` HELP Options에 `--json` 1줄 추가.

### 영향 파일
- 신규: `src/observation.mjs`, `test/observation.test.mjs`, 커맨드별 `--json` 테스트.
- 수정: `src/commands/task.mjs`(`runTask`+`runRetro` 동일 파일), `src/commands/release.mjs`, `src/commands/doctor.mjs`, `bin/harness-team.mjs`(HELP).

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **observation envelope**: 에이전트가 파싱하는 단일 JSON 객체. CLI stdout = 에이전트 입력이라는 등식의 구체화. `{schema, command, status, summary, next_actions, artifacts, error}`.
- **error contract**: `{root_cause, safe_retry, stop_condition}`. harness-construction 업계 원칙(근본원인·안전재시도·멈춤조건)의 코드화. 성공 시 `null`.
- **drive command**: 보조 드라이버(OpenCode 등)가 Bash로 호출하는 4커맨드(task/retro/release/doctor). release는 maintainer 전용이나 출력 계약은 동일 적용.
- **status**: `success|warning|error`. warning = 완료됐으나 비차단 이슈(doctor ⚠️). exitCode와 독립적이지 않음(error → exitCode 1).

## Ambiguity 자가진단
*brainstorming(2026-06-15) 완료 → 게이트 통과.*

- [x] **Goal 명확도** (40%) — drive 4커맨드에 opt-in `--json` 통합 엔벨로프 추가, human 출력 무수정.
- [x] **Constraint 명확도** (30%) — 스키마 확정(통합/error nullable/doctor per-check), 단일 stdout 객체, 회귀 0, 범위=4커맨드.
- [x] **Success 기준** (30%) — 수용기준 1~5 + 커맨드별 `--json` 성공/에러 테스트 green + 기존 테스트 회귀 없음.
- [x] **Context 명확도** (brownfield) — Explore로 4커맨드 출력 표면·err.kind·파서·HELP 위치 file:line 매핑 완료.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

**게이트 통과 근거(Ontology 한 줄):** observation envelope = "CLI stdout은 곧 에이전트 observation"이라는 등식을 `{schema, command, status, summary, next_actions, artifacts, error}` 단일 객체로 코드화하는 것.

## 참고
- 백로그 P2: [2026-05-29-0.8.0-improvements.md](../../superpowers/plans/2026-05-29-0.8.0-improvements.md)
- harness-construction 원칙: observation(status/summary/next_actions/artifacts) · error(root cause/safe retry/stop condition)
- 0.7.0 선반영(retro/release의 비공식 cause/retry/stop): 본 P2가 이를 전 drive 커맨드 `--json`으로 승격.
