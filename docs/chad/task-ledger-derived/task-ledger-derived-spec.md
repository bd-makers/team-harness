# task-ledger-derived — Spec

## 목적 / 요구사항

`harness-team task` / `done`이 매 task마다 **공유 원장 2개 파일**을 수정하기 때문에,
브랜치를 병렬로 두면 반드시 머지 충돌이 난다.

| 파일 | 쓰기 방식 | 충돌 이유 |
| --- | --- | --- |
| `docs/task_summary.md` | `content.trimEnd() + row` — 파일 끝에 append | 두 브랜치가 같은 마지막 줄에 행 추가 |
| `docs/<user>/<user>-task.md` | `## Open\n` / `## Completed\n` 헤더 **바로 뒤**에 insert | 두 브랜치가 같은 앵커에 삽입 |

실제 사고: kc-admin-web에서 병렬 MR 두 건(KA-24 / KA-28)이 이 두 파일에서 충돌해
수동 rebase + force-push(훅 차단 → 사용자 직접 실행)까지 필요했다. 정작 각 MR의 실제
변경 파일은 서로 겹치지 않았다.

요구사항:

- **브랜치 작업 중 공유 파일 쓰기 0** — 이것이 충돌을 구조적으로 불가능하게 만드는 핵심 조건이다.
- 원장 2개 파일은 **tracked 유지**한다 (GitLab/GitHub UI에서 한눈에 보는 값이 있다).
  단, 갱신은 task 흐름이 아니라 별도 생성 명령으로만 한다.
- 생성은 **결정론적**이어야 한다 — 같은 입력이면 항상 같은 바이트. 아니면 재생성마다 diff가 튄다.
- 기존 설치본이 깨지지 않아야 한다. 과거 task는 상태·created를 복원할 수 있어야 한다.

## 설계 / 접근

### 1. per-task 기계 소유 메타 파일

`docs/<user>/<name>/<name>-meta.json` 을 추가한다. **task 생성 시 만들고 done 시 갱신**한다.

```json
{ "user": "chad", "task": "task-ledger-derived", "created": "2026-08-19", "status": "open", "closedAt": null }
```

- 매번 **자기 task 디렉터리 안 새 파일**만 건드리므로 브랜치 간 충돌이 날 수 없다.
- 왜 spec.md frontmatter가 아닌가: spec.md는 에이전트가 통째로 덮어쓰는 일이 잦다(이번 세션에서도 발생).
  기계 소유 데이터를 사람이 편집하는 파일에 두면 유실된다.
- 왜 handoff가 아닌가: post-commit hook이 자동 갱신하는 파일이다.
- **비-SSOT 아님 / SSOT 아님** — 4파일 계약은 그대로 두고, meta.json은 harness 내부 상태로 문서화한다.

### 2. `harness-team summary` 신설

task 디렉터리를 스캔해 원장 2개 파일을 렌더링한다.

- 인자 없음 → stdout 출력 (읽기 전용, 어디서나 안전)
- `--write` → 두 파일 기록. **기본 브랜치에서만** 허용하고 그 외에는 거부한다.
  이 가드가 없으면 누군가 feature 브랜치에서 `--write`를 돌려 방금 없앤 충돌을 되살린다.
- `--check` → 커밋된 내용과 렌더 결과가 다르면 exit 1 (CI/doctor용, mutation 없음)
- 정렬: `created` 오름차순 → `task` 이름 오름차순. 결정론 보장.

### 3. `task` / `done`에서 원장 쓰기 제거

`addToTaskSummary` · `addToUserTaskIndex` · `markDoneInTaskSummary` 호출을 task/done 경로에서 제거한다.
렌더러가 같은 정보를 만들어내므로 기능 손실은 없다.

### 4. migrate 백필 (필수)

kc-admin-web 실측 결과 **기존 task는 상태가 파생되지 않는다**:

- `docs/task_summary.md`의 `✅ done` = 6개
- handoff의 `— 완료` 마커 = 4개 (`kc-plan-progress`, `kc-boot-routing-state` 누락)
- `created` 날짜는 원장에만 존재. `done`이 user index의 `(created …)`를 `- ✅ <task>`로 갈아치우므로
  완료된 task는 원장이 유일한 출처다.

따라서 **코드 변경 전에 원장을 읽어 meta.json으로 백필**하는 migrate 경로가 있어야 한다.
백필 없이 전환하면 과거 task가 전부 open으로 잘못 표시된다.

범위 밖: 소비 프로젝트(kc-admin-web 등)의 AGENTS.md·docs/README.md 직접 수정.
둘 다 하네스 관리 구역이므로 **템플릿을 고치고 릴리스한 뒤 `harness-team apply`** 로 반영한다.

## Ontology

- **원장(ledger)**: `docs/task_summary.md` + `docs/<user>/<user>-task.md`. 여러 task가 공유하는 집계 파일.
- **파생(derived)**: task 디렉터리에서 계산 가능한 정보. 원장은 전부 파생 가능하다
  (단 `created`와 과거 `done` 상태는 백필 필요).
- **공유 파일 쓰기**: 한 브랜치의 작업이 다른 브랜치와 같은 파일·같은 위치를 건드리는 것. 충돌의 필요조건.

> Ambiguity 게이트 통과 근거: 충돌 메커니즘을 소스 라인으로 특정했고, 저장 위치·명령 인터페이스·
> 마이그레이션 입력(실측 6/4 불일치)·범위 밖 항목이 모두 확정되어 해석 분기가 없다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — task/done이 공유 원장을 쓰지 않게 하고 원장을 생성물로 전환한다.
- [x] **Constraint 명확도** (30%) — 원장 tracked 유지, `--write`는 기본 브랜치 한정, 결정론적 렌더, 기존 설치 호환.
- [x] **Success 기준** (30%) — 병렬 브랜치가 각각 task를 만들어도 충돌 0, 기존 6개 task의 상태·created 보존, `npm test` 통과.
- [x] **Context 명확도** — `src/commands/task.mjs`, `bin/harness-team.mjs`, `src/commands/migrate.mjs`, `templates/`, docs.
- [x] **Ambiguity ≤ 0.2**

## 참고
- 사고 기록: kc-admin-web MR !7 / !8 (2026-08-19)
- `src/commands/task.mjs` — `addToTaskSummary`(187행대), `runDone`(445행대)
