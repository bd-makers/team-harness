# task-spec-marker — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `runTask`의 기존-task 판정을 `<name>-spec.md` 마커로 바꿨다(`listTaskRefs`와 같은 기준). spec 없음 + 내용물 있는
  디렉터리는 exit 1 오류 패킷으로 거부하고 아무것도 쓰지 않는다. 빈 디렉터리는 생성, spec 있는 task는 불변.
- 재현(0.41.0): `task hslee --member web-next` → `activated:`(list는 `(no tasks)`), `--area` 채택이 비-task dir에 meta 기록.
  수정 후 같은 명령은 `✗ task: 기존 디렉터리가 task 가 아님`, `.harness/` 미생성.
- 검증: `tests/task-spec-marker.test.mjs` 원 코드에서 red(2/2 fail) → 수정 후 green. `npm test` 985 중 fail 0
  (skip 1은 CI 전용 jq 매트릭스), golden e2e 무수정 통과, `doctor` exit 0.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-24T14:20:20.689Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: d321e6f0f949dbbc52e9d36f533cf7d943bafc57 · exit 0 · 1354 B

```text
전하, P2 1건입니다.

- P2 — [tests/task-spec-marker.test.mjs:44](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/quirky-goodall-d82628/tests/task-spec-marker.test.mjs:44): 새 거부 경로는 text 출력만 검증하고 `--json` error envelope/5필드 패킷을 검증하지 않아, R1의 “오류 패킷” 계약 회귀를 잡지 못합니다.

- P3 — [task-spec-marker-artifact.md:14](/Users/hsonpro/Library/Mobile%20Documents/icloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/quirky-goodall-d82628/docs/hslee/task-spec-marker/task-spec-marker-artifact.md:14): 추가 빈 줄 때문에 `git diff --cached --check`가 whitespace 경고를 냅니다.

판정: 구현 자체는 `listTaskRefs`와 동일한 spec-marker predicate를 사용하며, 비-task 비어 있지 않은 디렉터리에서 쓰기 전에 거부하고 빈 디렉터리는 생성하는 흐름이 맞습니다. 다만 JSON 오류 패킷 테스트를 보강한 뒤 승인 권장입니다.

검증: `node --check`는 통과했습니다. 지정 테스트는 read-only sandbox가 임시 디렉터리 생성(`mkdtemp`)을 막아 3건 모두 EPERM으로 실행 불가였으며, 코드 실패는 확인되지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=d321e6f0f949dbbc52e9d36f533cf7d943bafc57 at=2026-09-24T14:20:20.689Z -->

**판별 (2026-09-24, 작성 세션)**
- P2 `--json` 거부 경로 미검증 — **진짜(테스트 공백)**. 구현은 공유 `emitTaskError`라 결함은 아니지만 이 분기의 패킷
  계약은 무보증이었다. 조치: 거부 루프의 세 사례 모두 `--json`으로 재실행해 단일 error 엔벨로프·5필드·root_cause의
  spec 경로·무쓰기를 단언. green.
- P3 artifact EOF 빈 줄(`git diff --check`) — **진짜(사소)**. 원인은 `taskArtifactTemplate`이 `## Learnings\n\n`으로
  끝나는 것 — 새 task마다 생긴다. 조치: 이 artifact는 Learnings를 채워 해소. 템플릿 자체는 범위 밖(후속 후보).
- Codex는 read-only sandbox에서 `mkdtemp` EPERM으로 테스트를 못 돌렸다 — 실행 검증은 작성 세션의 로컬 결과가 근거.

## Learnings
- "기존 X" 판정은 스캐너 하나(`listTaskRefs`)의 predicate를 따른다 — 명령마다 `exists(dir)` 같은 약식 판정을 두면
  목록과 동작이 갈라지고, 이후 추가된 쓰기 분기(`--area` 채택)가 그 틈으로 비-task에 쓴다.
