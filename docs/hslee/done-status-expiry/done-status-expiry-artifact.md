# done-status-expiry — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`meta.status`가 정본이 됐다. 세 변경:

1. **reopen 전이** (`src/commands/task.mjs` 재활성화 분기) — `status`가 `done`이면
   `open`으로 만료시키고 `closedAt`을 풀며 `reopenedAt`에 시각을 남긴다. 출력은 `reopened:`
   (text·`--json` 양쪽). 열린 task 사이의 평범한 재활성화는 meta를 건드리지 않는다.
   meta가 없는 구 task는 `inferLegacyMeta` 추론값을 굳혀 만료시킨다.
2. **판정 창** — 후보(`reopenedAt` → `firstActivatedAt`) 중 **처음 유효한 값**을 창으로 쓴다.
   유효한 후보가 하나도 없을 때만 시각 비교를 포기한다.
3. **재개 후보 판정** (`src/commands/session-context.mjs`) — `status`가 `done`이면 제외.
   meta가 없으면 제외하지 않는다(하위 호환).

문서: AGENTS.md·`templates/AGENTS.md.hbs`(만료 규약) · README(창 정의) ·
`commands/harness-task.md`(다이어그램 옵트인의 `reopened:` 분기) · CHANGELOG `[Unreleased]`.

**검증** — `npm test` 619/618 pass/0 fail/1 skip + perf 1 (착수 시 606). `doctor` 통과.
실제 CLI 경로로도 전이를 확인했다(임시 디렉터리에서 create→done→reactivate:
`firstActivatedAt` 보존, `status` open, `closedAt` null, `reopenedAt` 기록, 출력 `reopened:`).

**범위 밖으로 둔 것** — TCC(`<name>-context.md`) 만료(권고 ⑦의 "TCC 중복 검토 선행"과 묶임) ·
시간 기반 TTL/아카이브(사용자가 상태 전이형을 선택) · `list`의 status 표시 · doctor 검사 추가 ·
`fsx.writeText`의 비원자적 쓰기(이 변경 이전부터 `done`에도 해당하는 기존 성질).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-06 — Codex read-only review (`codex exec --sandbox read-only -m gpt-5.6-sol`)

엔진: codex(명시 지정, 폴백 없음). scope: `origin/main...HEAD` diff — 워킹트리가 dirty였으나
잔여 변경이 post-commit 훅 자신의 handoff 기록뿐이라(커밋할 때마다 재생성되어 구조상 clean이 될 수
없다) diff를 대상으로 삼았다. 모델은 CLI 0.147.0이 기본 모델을 거부해 `-m gpt-5.6-sol`로 실행.

판정 **Changes requested** — P1 0건, P2 3건, P3 1건. **4건 전부 코드에서 재현해 진짜 결함으로
판별하고 반영했다**(오탐 0).

| # | 발견 | 판별 | 조치 |
|---|---|---|---|
| P2-1 | `active.json`을 meta보다 먼저 써서 부분 실패 시 "활성인데 원장은 done"이 남는다 | 진짜 — 순서 확인 | 만료를 먼저 굳히고 활성 포인터를 옮기도록 순서 교체 |
| P2-2 | meta 없는 레거시 완료 task는 reopen되지 않아 원장이 계속 done | 진짜 — 임시 저장소로 실측 재현(`collectTasks`가 활성 task를 `done`으로 렌더) | `inferLegacyMeta` 추론값을 굳혀 만료. `created`는 원장 복원값 보존, `firstActivatedAt`은 지어내지 않음 |
| P2-3 | 깨진 `reopenedAt`을 "창 모름"으로 처리하면 시각 가드가 전부 꺼져 fail-open | 진짜 — `windowStart === null`이 리뷰 마커 신선도·커밋·테스트 가드를 모두 건너뜀 | 깨진 값은 `firstActivatedAt` 창으로 **하강**. 유효 후보가 없을 때만 degrade |
| P3 | artifact.md EOF 빈 줄로 `git diff --check` exit 2 | 진짜 | 제거 (현재 exit 0) |

반영하지 않은 것: `fsx.writeText`의 비원자적 쓰기(리뷰가 P2-1에 함께 언급). 이 변경 이전부터
`done`·`task` 양쪽에 해당하는 기존 성질이라 이 task의 범위 밖으로 두고 여기 남긴다.

리뷰 실행 환경 한계: codex 샌드박스가 read-only라 fixture 기반 테스트가 임시 디렉터리 생성에서
`EPERM`으로 중단됐다(리뷰어는 순수 테스트 46개와 syntax check만 수행). 전체 스위트는 이 세션이 돌렸다.

<!-- harness:review kind=codex scope=diff tip=ef91475dc50490db82326482c42da183a655371b at=2026-09-06T10:16:42Z -->

## Learnings

- **권고 한 줄은 요구사항이 아니다.** "완료 task 만료 없음"은 상태 전이형·시간 기반 TTL 두 갈래로
  읽혔고, 실측 결함은 전이 쪽에서만 나왔다. 코드를 먼저 읽어 갈래별 근거를 확인한 뒤 사용자에게
  고르게 한 것이 범위를 지켰다 — TTL을 골랐다면 근거 없는 투기적 기능이 됐을 것이다.
- **"쓰이지만 읽히지 않는 필드"가 결함의 형태다.** `meta.status`는 `done`이 쓰고 원장만 읽었다.
  소비처가 하나뿐인 상태값을 발견하면 그 상태가 거짓이 되는 경로를 의심할 것.
- **가드에서 "모르면 포기"는 fail-open이다.** 창 시작점이 깨졌을 때 창을 버리면 시각 가드가 전부
  꺼진다. 더 넓지만 유효한 값이 남아 있으면 그쪽으로 **내려가는** 것이 옳다. 처음엔 인접 규칙
  (`firstActivatedAt` 깨짐 → degrade)과의 일관성을 이유로 포기 쪽을 골랐는데, 그 규칙은 "유효한
  값이 하나도 없을 때"의 규칙이지 "덜 좋은 값이 남아 있을 때"의 규칙이 아니었다.
- **하위 호환은 "안 건드림"이 아니라 "같은 계약을 다른 증거로"다.** 레거시 task를 그냥 건너뛰었더니
  레거시 설치에서는 기능이 통째로 없는 것과 같았다. 추론 경로(`inferLegacyMeta`)를 굳히되
  모르는 값(`firstActivatedAt`)은 지어내지 않는 선이 맞았다.
- **동사를 늘리면 그 동사로 분기하는 문서를 찾아야 한다.** `reopened:`를 추가하면서
  `commands/harness-task.md`의 다이어그램 옵트인 규칙이 `created:`/`activated:` 둘로만 갈리는 것을
  놓칠 뻔했다. 기존 테스트가 그 문장을 리터럴로 고정하고 있어, 문장을 고치지 않고 덧붙이는 형태로 해결했다.
