# done-on-main-nudge — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** 2026-09-10, 09-07 시점 클론에서 `done-force-audit-trail`을 구현했는데 main에는 09-08에
같은 task가 이미 구현·종결·릴리스(0.34.0)돼 있었다. 6커밋을 폐기했고 두 구현은 설계까지 갈렸다(sticky vs per-close).
하네스는 이것을 **구조적으로 못 잡는다**:

- `.harness/active.json`은 gitignore라 클론은 "이 task가 main에서 `done`"인지 알 수 없다.
- SessionStart task-gate(`src/commands/session-context.mjs` `buildTaskGateContext`)는 **로컬 meta만** 본다.
- `harness-team task <name>`은 로컬 디렉터리 유무로 `created:`/`activated:`를 가르고, 원격은 보지 않는다.
- D5 격리 병렬 모델(`docs/decisions.md`)이 전제하는 "task는 브랜치당 하나"가 **같은 task를 두 클론이 각자 활성으로
  가진 경우**를 다루지 않는다.

**영향받는 대상.** 두 머신·두 클론에서 같은 사용자(`chad`)가 번갈아 작업하는 이 저장소의 실제 운영 형태.
main에서 종결된 task를 다른 클론이 모르고 이어가면 작업이 통째로 버려진다.

**기대 결과.** 활성(또는 활성화하려는) task의 meta를 `origin/<default>`에서 한 번 읽어 `status === 'done'`이면
"이 task는 main에서 <closedAt>에 종결됨 — 재개할 것인지 확인" nudge를 낸다. 세 지점:

| 지점 | 동작 |
|---|---|
| `session-context` (SessionStart) | 활성 task가 원격 done이면 breadcrumb **대신** nudge 한 덩어리를 낸다. TCC 주입은 그 뒤에 이어 붙이지 않는다 — 재개 여부가 먼저다 |
| `doctor` | 같은 판정을 `warning` 한 줄로. `checkActiveSpecGate`와 같은 자리(활성 task 검사 절) |
| `task <name>` | `created:`/`activated:` 직전에 같은 판정 — 원격 done이면 `task`를 **막지 않고** 출력 첫 줄에 nudge를 낸다(사고의 시작점이 creation이었다) |

**제약.**

- **fetch하지 않는다**(네트워크·시간). 로컬 `refs/remotes/origin/<default>` 기준이며, ref가 없거나 git 저장소가 아니거나
  그 경로에 meta가 없으면 **조용히 건너뛴다**. SessionStart 출력은 어떤 예외에도 깨지지 않는다(observe 표면화와 같은 계약).
- default 브랜치는 `git symbolic-ref -q refs/remotes/origin/HEAD` → 없으면 `origin/main` → 없으면 건너뜀.
- **로컬 meta가 이미 `done`이면 nudge 없음**(재개 후보 판정이 이미 처리). 로컬 meta의 `reopenedAt`이 원격 `closedAt`보다
  **나중**이면 고의 재개로 보고 nudge 없음 — 매 세션 반복되는 소음을 막는다.
- 판정 창·`done` 가드·meta 스키마는 바꾸지 않는다. 원격 meta는 읽기만 한다.
- git 호출은 `execFile`(`doctor.mjs`·`release.mjs`와 같은 방식). 테스트는 판정 로직을 주입 가능한 `readRemoteMeta`로 fake하고,
  실 git 통합 테스트 1개(임시 저장소 + bare origin)로 명령 자체를 검증한다.

## 설계 / 접근

### 새 모듈 `src/commands/remote-task.mjs` (판정 한 곳)

```js
// origin/<default> 의 meta 를 읽는다. 없으면 null — 실패도 null (조용히 건너뜀).
export async function readRemoteTaskMeta(targetDir, user, task, { git } = {})
// 원격 done && 로컬 미종결 && (reopenedAt 없음 || reopenedAt <= remote.closedAt) → { closedAt, ref } ; 아니면 null
export function doneOnMainVerdict({ localMeta, remoteMeta, ref })
export function renderDoneOnMainNudge({ user, task, closedAt, ref })
```

세 소비자(`session-context`·`doctor`·`task`)는 `readRemoteTaskMeta` + `doneOnMainVerdict`를 부르고 각자 형식으로 낸다.
문구 한 곳: `[harness] ⚠ task <user>/<task> 는 <ref> 에서 <closedAt> 에 종결됨 — 재개할 것인지 확인 (harness-team list / git log <ref> -- docs/<user>/<task>)`.

### git 명령

```
git -C <targetDir> symbolic-ref -q refs/remotes/origin/HEAD     # → refs/remotes/origin/main
git -C <targetDir> rev-parse --verify --quiet origin/main       # fallback
git -C <targetDir> show <ref>:docs/<user>/<task>/<task>-meta.json
```

`show`가 exit 128(경로 없음)이면 null. 2026-09-11 이 저장소에서 실측: `origin/HEAD` 존재, `show` 정상, 없는 경로 exit 128.

## Ontology

- **원격 done**: `refs/remotes/origin/<default>`에 커밋된 `<name>-meta.json`의 `status === 'done'`. fetch 없이 로컬 ref 기준이므로
  "마지막 fetch 시점의 main"이다 — 그보다 새 사실은 모른다(제약으로 명시).
- **고의 재개**: 로컬 `reopenedAt > 원격 closedAt`. `task <name>`이 done meta를 다시 열 때만 생기는 값이라 사용자의 의사 표시다.
- **nudge**: block이 아니다. task-gate의 기존 nudge와 같은 지위 — 판단은 Claude/사용자 몫.
- 게이트 통과 근거: 목표는 위 표 세 지점, 제약은 fetch 없음·조용한 건너뜀·스키마 불변, 성공 기준은 테스트와 실측 재현.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 세 지점에서 원격 done task를 nudge한다.
- [x] **Constraint 명확도** (30%) — fetch 없음, 조용한 건너뜀, meta 읽기 전용, 스키마 불변.
- [x] **Success 기준** (30%) — 단위 테스트(판정 표) + 실 git 통합 테스트 + 이 저장소에서 실측(`review-codex-live-check`는 main에서 done).
- [x] **Context 명확도** (brownfield 한정) — `session-context.mjs` `buildTaskGateContext`, `doctor.mjs` `checkActiveSpecGate` 자리, `task.mjs` `runTask`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- `docs/followups.md` 5번(이 task로 올렸으므로 제거)
- `docs/decisions.md` D5 · `AGENTS.md` task-gate 절
- `tests/session-context.test.mjs`(fake 주입 방식) · `tests/doctor.test.mjs`(`checkActiveSpecGate` 4케이스가 본보기)
- 사고 기록: `docs/chad/done-force-audit-trail/` (main 구현) — 폐기된 클론 구현은 커밋 없음
