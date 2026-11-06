# handoff-no-sweep — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

post-commit 훅은 이제 gitignore된 `<user>-handoff.md`만 쓴다. 그 파일이 추적 중이거나 무시 줄이 없는 구 저장소에서는 그것도 쓰지 않는다. 그래서 커밋 직후 트리가 비고 handoff만 담을 커밋이 생기지 않는다.
`done`은 마커를 쓰지 않고 `meta.json`만 쓴다. `pr-check` 필수 문서는 spec·plan·artifact이고 D11에 정정 이력을 남겼다. sweep 판정과 amend 교정 코드는 지웠다.

### 검증

같은 픽스처를 옛 코드(`d675c76`)와 새 코드로 돌렸다. `harness-team`은 PATH shim으로 각 소스에 이었고 실제 `init`·`git commit`·post-commit 훅을 탔다.

| 항목 | 옛 코드 | 새 코드 |
|---|---|---|
| 커밋 직후 `git status --porcelain` | ` M docs/tester/demo/demo-handoff.md` | 비어 있음 |
| user handoff Last Commit | 새 커밋 | 새 커밋(훅이 돌았다는 양성 대조) |
| 커밋 1개짜리 브랜치의 `pr-check` | exit 1, handoff 템플릿 그대로 | exit 0 |

- `summary`: 이 저장소의 실제 task 전체를 변경 전후로 렌더해 비교했다. 차이는 새 task 행 1줄뿐이다.
- 변이 9개를 버리는 클론에서 돌렸고 모두 테스트가 잡았다: 훅 append 복원, 훅 무동작, 추적 user handoff 쓰기, 무시 줄 없는 저장소에 쓰기, `done` 마커 복원, `pr-check` handoff 요건 복원, `done` 가드의 task handoff 제외, `review`의 task handoff 제외, 옛 마커 읽기 삭제.
- `npm test`: 1,284개 중 1,283개 통과, 실패 0, 건너뜀 1. perf 1개 통과. `npm run docs:check`와 `node bin/harness-team.mjs doctor` 통과. doctor 경고 1건은 이 변경과 무관한 Codex 훅 신뢰 안내다.

### 검증하지 못한 것

- L5 시뮬레이션 중 SC6만 돌렸다(인증 불필요). 이 변경의 신호는 통과하고, `init installs harness (doctor green)` 1건은 실패한다. 같은 실패가 옛 코드(`d675c76`)에도 있어 이 변경과 무관하다. 원인은 조사하지 않았다. 나머지 시나리오와 `codex-agentloop`은 실제 에이전트 세션이 필요해 돌리지 않았다.
- 소비자 저장소 실제 업그레이드는 돌리지 않았다. 구 저장소 동작은 픽스처로만 확인했다.

### 결정

- task handoff는 `done`·scope 판정에서 계속 뺀다. 옛 훅과 버전이 갈리면 handoff 단독 커밋을 강요하기 때문이다. 직접 쓴 메모가 미커밋이어도 막지 않는 것이 대가다.
- `<name>-handoff.md`는 폐지하지 않고 선택 메모로 남겼다. 177개 중 10개에 직접 쓴 내용이 있고, 폐지는 task 문서 구조 전체를 바꾼다.
- 구 저장소(user handoff 추적 중)에서는 활성화와 `done`이 쓴 변경이 트리에 남는다. `done`을 막으면 진입점이 종결된 task를 가리킨 채 얼어붙어서 막지 않았다. 옛 동작과 같고 `doctor`가 추적 해제를 안내한다.
- 자동 병합에는 post-commit이 돌지 않아 user handoff가 병합 전 커밋을 가리킨다. 세션 진입점의 표시만 한 커밋 늦고 트리는 깨끗하다.
- 훅 유실을 감지하는 doctor 검사는 더하지 않았다. 잃는 것이 로컬 표시뿐이다(`docs/followups.md` 정정).
- `templates/docs/README.md`는 sha 등록 대상이 아니다. 설치된 사본은 자동 갱신되지 않아 CHANGELOG 소비자 조치에 적었다.
- stock 스킬의 "post-commit hook이 handoff 자동 갱신" 문장은 user handoff에 대해 여전히 참이라 stock 변경을 피했다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-06 — read-only 검증자 (별도 컨텍스트, `d675c76..c698485`, D6)

외부 엔진 리뷰가 아니므로 `harness:review` 마커는 남기지 않는다. 발견 7건을 재현·판별했다.

| 발견 | 판정 | 조치 |
|---|---|---|
| SC6가 지운 완료 마커를 단언 | 진짜. `node tests/sim/agentloop.mjs sc6`로 재현 | meta `status`·`closedAt` 단언으로 교체 |
| 구 저장소에서 활성화·`done`이 추적 파일을 더럽힘 | 진짜·수용 | 코드 변경 없음. 옛 동작과 같고 `done`을 막으면 진입점이 얼어붙는다. spec·문서에 범위를 적음 |
| 무시 줄 없는 저장소에서 훅이 `??`를 남김 | 진짜 | 훅이 쓰지 않게 하고 테스트 추가 |
| `docs/followups.md:40`이 거짓이 됨 | 진짜 | 문장 정정. 훅 유실 감지 검사는 더하지 않음 |
| 병합 테스트가 병합을 시험하지 않음 | 진짜 | 충돌을 풀어 훅이 도는 병합으로 교체 |
| 업그레이드 과도기 버전 불일치 | 부분 인정. 재현하지 않음 | CHANGELOG 소비자 조치에 PATH CLI 갱신 추가 |
| 이 task handoff의 옛 문구 | 진짜 | 새 문구로 교체. `migrate.mjs:99`는 동결된 0.6 경로라 둠 |


### 2026-11-06 — `/code-review` high (로컬, `main...HEAD`)

발견 10건을 버리는 픽스처로 판정했다. 외부 엔진 리뷰가 아니므로 `harness:review` 마커는 남기지 않는다.

| 발견 | 판정 | 조치 |
|---|---|---|
| 옛 훅 + 새 `done`·`scope` 버전 불일치 | 진짜 | `handoffRelPaths` 복원. task handoff 제외는 옛 훅이 사라질 때까지 두는 임시 조치 |
| 사용자 문서의 옛 훅 설명 | 진짜 | 온보딩·치트시트·킥오프·플레이그라운드·가이드·다이어그램·시뮬레이션 수정 |
| CHANGELOG `BREAKING` 누락 | 진짜 | 첫 줄에 추가 |
| "네 파일이 SSOT" 모순 | 진짜 | spec·plan·artifact를 SSOT로 정정 |
| 완료 마커 주석 시제 | 진짜 | 옛 동작으로 정정 |
| 활성화·훅 쓰기 조건 불일치 | 진짜·미반영 | 옛 동작과 같고 doctor가 경고 |
| 구 저장소 진입점 낡음 | 진짜·미반영 | 잃는 것이 로컬 표시뿐 |
| stock 스킬 문구 | 미반영 | user handoff에 대해 참 |
| handoff 파일 생성 유지 | 미반영 | D11 정정에서 별도 결정으로 뺌 |
| meta 유실 시 open 오판 | 미반영 | `done`과 `summary --write`가 한 커밋이라 정상 흐름에서 구간이 없음. 재현하지 않음 |

재현: 옛 CLI `handoff`가 task handoff를 더럽힌 픽스처에서 수정 전 새 `done`은 "커밋되지 않은 변경이 있음"으로 막혔고 `scope`는 worktree였다. 수정 뒤 같은 절차에서 그 원인이 사라졌고 `scope`도 worktree로 판정하지 않았다.

## Learnings
