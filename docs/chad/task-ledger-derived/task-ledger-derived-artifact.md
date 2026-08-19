# task-ledger-derived — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`task`/`done`의 공유 원장 쓰기를 제거하고 원장을 **task 디렉터리에서 렌더링하는 생성물**로 전환.

### 변경 파일

| 파일 | 변경 |
| --- | --- |
| `src/commands/summary.mjs` | **신설** — meta 읽기/쓰기, legacy 추론, 렌더러, `runSummary` |
| `src/commands/task.mjs` | `runTask`/`runDone`이 `<name>-meta.json`만 쓰도록 변경. 죽은 원장 헬퍼 7개 + `escapeRegex` 제거 |
| `src/commands/migrate.mjs` | `backfillTaskMeta` 추가 — 원장 → meta.json 복원 |
| `src/cli-args.mjs`, `bin/harness-team.mjs` | `summary` 명령 등록 (`--write` / `--check` / `--force`) |
| `templates/docs/README.md`, `templates/AGENTS.md.hbs`, `AGENTS.md` | 원장 = 생성물, meta.json 성격 문서화 |
| `tests/summary.test.mjs` | **신설** 8개 |
| `tests/task-templates.test.mjs`, `tests/observation-commands.test.mjs` | 폐기된 원장 단언 3개를 새 계약으로 재조준 |

### 설계

- **정본**: `docs/<user>/<name>/<name>-meta.json` (`created` / `status` / `closedAt`). 기계 소유이며 SSOT 4파일이 아니다.
  spec.md는 에이전트가 통째로 덮어쓰고 handoff.md는 post-commit hook이 다시 쓰므로 둘 다 기계 상태를 둘 수 없다.
- **생성물**: `docs/task_summary.md`, `docs/<user>/<user>-task.md`. `harness-team summary`가 렌더링한다.
- **가드**: `--write`는 기본 브랜치에서만. 없으면 누군가 feature 브랜치에서 돌려 방금 없앤 충돌을 되살린다.
- **형식 호환**: 표·리스트 구조를 그대로 유지했다. 소비 프로젝트의 `docs/site/build.mjs`가 `docs/**/*.md`를
  파싱하므로 형식이 바뀌면 대시보드가 깨진다. `meta.json`은 `.md`가 아니라 파싱 대상 밖이다.

### 검증

**재현 테스트 — 원래 사고 시나리오를 그대로 재연**

```
main에서 task alpha → branch-b에서 task beta → branch-c에서 task gamma
branch-b를 branch-c에 머지
→ 충돌 파일: 없음   (이전 구현에서는 원장 2개 파일이 충돌)
```

부수 발견: 첫 시도에서 `.harness/active.json`이 충돌했다. 실제 설치본은 `.harness/`를 gitignore하므로
(kc-admin-web `.gitignore:11`, 하네스 repo도 untracked) 현실 문제는 아니었고, 테스트 fixture에
`.gitignore`를 넣어 조건을 맞췄다. **이 사실 자체가 테스트에 주석으로 남아 있다.**

**마이그레이션 — kc-admin-web 실측 형태로 재현**

원장 done 4 / handoff 마커 2인 fixture에서 `collectTasks`가 4개를 모두 done으로 복원하고
created도 원장에서 살려냈다. 마커만 믿었다면 2개가 open으로 오표시된다.

**하네스 저장소 자체 백필**: 42개 task 전부 meta.json 생성. 렌더 결과와 기존 원장의 행 집합이 완전히 동일
(42행, `diff` 결과 없음). 차이는 정렬 순서뿐 — created 동률일 때 이름순으로 재정렬된다.

**전체 테스트**: `npm test` → **287 pass / 0 fail** (기존 279 + summary 10 + release 회귀 1, 재조준 3 포함).

**릴리스**: 0.15.2 → **0.16.0**. 매니페스트 4개, cache, marketplace, `installed_plugins.json` 모두 0.16.0.
`harness-team --version` = 0.16.0 = 설치본 → 드리프트 없음. 태그 `v0.16.0`.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-19 — Codex 외부 리뷰: **미완료**

두 번 실행했으나 둘 다 출력 없이 반환하지 못했다(1회차 프로세스 소멸, 2회차 10분 이상 무출력).
같은 시각 다른 세션이 codex 리뷰를 점유 중이었다. **리뷰 없이 릴리스했다는 사실을 여기 남긴다.**

대신 리뷰에서 물어보려던 4개 위험 지점을 직접 실증했고, **실제 결함 2건을 찾아 고쳤다**:

| 위험 지점 | 방법 | 결과 |
| --- | --- | --- |
| legacy 파싱 커버리지 | `🔄 active`/`✅ done`/인덱스 2형식 fixture | 통과 — 회귀 테스트로 고정 |
| `--write` 기본 브랜치 가드 | detached HEAD / origin 없는 master / git 아닌 디렉터리 | **결함 1건** — master 저장소 오거부 → 수정 |
| 원장 의존 잔존 경로 | `doctor`·`session-context`·`harness.mjs` grep | 의존 없음 (migrate만 의도적으로 씀) |
| 렌더 결정론 | 입력 순서 뒤집어 바이트 비교 | 통과 |

릴리스 실행 중 **결함 1건 추가 발견**: `release`가 개발 저장소와 marketplace clone이 같은 디렉터리일 때
`marketplace.json`을 자기 자신에게 복사하려다 `EINVAL`로 중단, 매니페스트만 올라간 반쯤 적용된 트리를 남겼다.
수정 + 회귀 테스트 추가 후 재실행해 완료.

**Gemini 리뷰: 미실행** — 이 머신에 `gemini` CLI 미설치.

> 후속: codex 경합이 풀리면 `b8a0a6c..adbd6e9` 범위로 리뷰를 다시 돌리고 결과를 이 절에 append 한다.

## Learnings

- **공유 집계 파일은 병렬 브랜치의 구조적 충돌원이다.** 내용이 겹치지 않아도 *삽입 위치*가 같으면 충돌한다.
  집계는 파생으로 두고 각 브랜치는 자기 소유 파일만 만들게 하는 것이 유일한 구조적 해법이다.
  union merge 같은 완화책은 서버 머지 지원 여부에 의존하고 중복 행을 남긴다.
- **"파생 가능하다"는 검증 없이 믿으면 안 된다.** 이번에도 상태는 파생 가능해 *보였지만*
  실측하니 원장 done 6 vs 마커 4로 어긋났고, created는 `done`이 인덱스 줄을 덮어써서 원장에만 남아 있었다.
  마이그레이션 입력을 **코드 변경 전에** 추출한 것이 오표시를 막았다.
- **기계 상태를 사람·훅이 쓰는 파일에 두지 말 것.** spec.md는 에이전트가 덮어쓰고 handoff.md는 훅이 다시 쓴다.
  이번 세션에서도 spec.md를 통째로 덮어쓴 적이 있다 — frontmatter였다면 그때 유실됐다.
