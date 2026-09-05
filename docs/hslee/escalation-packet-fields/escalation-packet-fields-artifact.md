# escalation-packet-fields — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-05 — codex read-only 리뷰 (엔진 codex, `-m gpt-5.6-sol`, scope: diff origin/main…cadada5, 228k tokens)

요약: **Request changes** — P1 0 · P2 4 · P3 1. `buildEnvelope` pass-through 유지, 생산자 9곳 전부 헬퍼 경유,
배열 cause 호출자가 text-only `runDone` 뿐이라는 점, 훅·파서의 exact-line 의존 부재는 리뷰어도 확인했다.
I/O 테스트는 codex 샌드박스의 `mkdtemp EPERM`으로 리뷰어 쪽에서 미완주 — 작성 세션의 `npm test`
(591 / 590 pass / 0 fail / 1 skipped, perf 1/1) 출력이 증거.

5건 모두 코드에서 재현해 진짜 결함으로 판별하고 반영했다.

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P2 | `rules` artifact-write-failed의 `safe_default`가 "규칙 되돌렸고 artifact도 무변경"이라 주장하지만 `unlink().catch(()=>{})`가 실패를 삼키고 `writeText`(= 평범한 `writeFile`)는 원자적이지 않다 | 진짜 — `src/fsx.mjs:12-16`에서 비원자성 확인, `rules.mjs:276`에서 삼킴 확인 | 보장 가능한 범위로 정정: "artifact 표기는 기록되지 않았다. 규칙 파일은 되돌리기까지 실패했으면 남아 있을 수 있고 artifact도 일부만 쓰였을 수 있다 — 재실행 전에 두 파일을 확인하라". `cause`의 "되돌렸다"도 "되돌리려 시도했다"로 |
| 2 | P2 | `summary` 브랜치 가드의 `alternatives`가 `--force` + `git push origin HEAD:main`을 권해, 방금 막은 안전장치와 PR 흐름을 우회하도록 유도 | 진짜 — 이 저장소의 원장 갱신 관행이 범용 CLI 메시지로 새어 나갔다. 스캐폴드된 남의 프로젝트에서는 브랜치 정책이 다르다 | 이 명령의 escape hatch(`--force`)까지만 안내하고 반영 경로 처방은 삭제 — "반영 경로는 프로젝트의 브랜치 정책을 따를 것" |
| 3 | P2 | "배열 cause는 text 전용" pin이 오히려 배열 `root_cause`를 엔벨로프에 넣어 통과시켜, 향후 JSON 생산자가 배열을 써도 못 잡는다 | 진짜 — 그 테스트는 pass-through만 검사하는데 주석이 배열 규칙까지 막는 것처럼 과잉 주장했다 | ① pin의 주석·본문을 pass-through 검사로 좁히고 ② 실제 가드를 추가: JSON 생산자 6곳(`observation-commands` 4 + `rules` 2)에 `typeof root_cause === 'string'`. 변이(`retro` no-active의 cause를 배열로)로 새 가드가 실패를 내는 것을 확인하고 원복 |
| 4 | P2 | `docs/harness-task-guide.html:775`의 `done` 가드 출력 예시가 `alternatives:`·`default:`를 빠뜨리고 `--force`를 옛 `stop:`에 둔다 | 진짜 — 손으로 쓴 문서(생성물 아님)라 재생성으로 갱신되지 않는다 | 예시를 실제 출력 계약으로 갱신 |
| 5 | P3 | `commands/harness-release.md:44`가 여전히 `cause:`/`retry:`/`stop:` 3줄만 전달하라고 서술 | 진짜 | 5줄 계약으로 정정(빈 `alternatives:`는 나오지 않는다는 단서 포함) |

리뷰가 짚지 않았지만 같은 사유로 함께 확인한 것: 옛 3키 서술이 남은 나머지 표면은 전부
**완료된 과거 task 문서**(`docs/chad/cli-json-contract/*`, `docs/superpowers/plans/2026-05-29-*`)와
**동결 릴리스 노트**(`docs/what-changes-0.2x.html`, `harness-overview-<version>.html` 12개)다 —
그 시점의 계약을 기록한 이력이라 고치면 역사를 위조하는 것이므로 그대로 둔다.

재리뷰: 생략 — 수정이 문구 4곳 + 테스트 어서션 6줄이고, 그중 유일한 동작 변경(타입 가드)은
변이로 직접 검증했다. 문서↔diff 정합은 shipcheck에 맡긴다.

<!-- harness:review kind=codex scope=diff tip=cadada5479d6ae70ba23668a3c33a9e00443e208 at=2026-09-05T11:09:42Z -->

## Learnings

