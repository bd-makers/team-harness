# ledger-only-pr-check — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `src/commands/pr-check.mjs`: `isLedgerPath`(POSIX 비교, `docs/task_summary.md` 또는 `docs/<u>/<u>-task.md` 에서 이름의 user 가 디렉터리와 같을 때만)
  — diff 가 전부 원장이면 `collectPrCheck` 가 `{ ledgerOnly: true, tasks: [] }` 를 돌려준다. `passed`·`docsFailed` 가 통과로 보고,
  렌더링은 `✓ pr-check <ref>: 생성물 원장만 변경 — task 문서 검사 대상 아님` + note, JSON `checks[].ledgerOnly`.
- `tests/pr-check.test.mjs` +4: 원장 전용 통과(직접·`--json`·`--pre-push`), 원장+코드 무 task 실패 / 원장+정상 task 통과(원장 note 없음),
  닮은 경로 4종(`docs/u/x-task.md`·`docs/u/u/u-task.md`·`docs/task_summary.md.bak`·`task_summary.md`) 실패, 원장 ref + 가드 실패 ref 동시 push 시 요약에 문서 누락 없음.
- 문서: D11·D5 정정(D5 는 `templates/docs/decisions.md` 와 같은 문장 — seed 라 sha 등록 대상 아님), `commands/harness-task.md` 원장 절, CHANGELOG Unreleased/Fixed.

### 검증 (명령과 출력)
- red 먼저: `node scripts/test-isolated.mjs --test tests/pr-check.test.mjs`(새 테스트 추가, 구현 전) → `pass 34 / fail 1` (`r.ledgerOnly` undefined).
- 구현 후 `node scripts/test-isolated.mjs --test tests/pr-check.test.mjs` → `pass 36 / fail 0`.
- 변이: `docsFailed` 에서 `!r.result.ledgerOnly` 제거 → `pass 35 / fail 1` (동시 push 테스트가 잡음), 원복.
- `npm run test` → exit 0, `tests 1445 / pass 1444 / fail 0`.
- `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
- `node scripts/test-isolated.mjs --test tests/doctor.test.mjs tests/migrate-templates.test.mjs tests/agent-files.test.mjs` → `pass 177 / fail 0`.
  `diff <(sed -n '/^## D5/,/^## D6/p' docs/decisions.md) <(sed -n '/^## D5/,/^## D6/p' templates/docs/decisions.md)` → 출력 없음(동일).
- 실재현: `collectPrCheck({ base: 'origin/main', rev: 'c72c76a4' })`(diff = `docs/chad/chad-task.md`, `docs/task_summary.md`) → `ledgerOnly: true`, `passed= true`.

- 후속(같은 날, 전체 `npm run test` exit 0 · 1446 / pass 1445 / fail 0): `git diff --no-renames` — 다른 파일을 원장 경로로 옮긴 커밋이 새 경로만 보여 통과하던 경계. 테스트 추가, 플래그를 빼면 `pass 36 / fail 1`.
  README·`docs/harness-cycle.md` §4-6 에 원장 예외 한 줄(pr-check 판정을 서술하는 다른 자리 전수 검색 결과).
- P2-3 병합 시험: `git merge-tree --write-tree HEAD fb45f6ad` → `src/commands/pr-check.mjs`·`tests/pr-check.test.mjs` 자동 병합,
  충돌은 `CHANGELOG.md`·`docs/decisions.md`(둘 다 같은 자리에 항목 추가 — 양쪽 유지로 해소). P2-3 테스트는 `checks[]` 객체를 통째 비교하지 않는다.
- rebase(ship 전): P2-3(#195)이 `origin/main` c12fe630 에 머지된 뒤 `git fetch origin && git rebase origin/main`.
  `src/commands/pr-check.mjs`·`tests/pr-check.test.mjs` 는 자동 병합(원장 판정 `collectPrCheck`·`passed`·`renderResult`·`docsFailed` 와
  P2-3 의 `HARNESS_PUSH_REMOTE`·`baseRemoteBranch`·`pushGoesElsewhere` 가 함께 남음, pr-check 테스트 39개). 충돌은 `CHANGELOG.md`
  `### Fixed`·`docs/decisions.md` D11 정정 문단 — 둘 다 추가뿐이라 양쪽 유지. D5 두 사본 `diff` 동일.
  rebase 뒤 `npm run test` → exit 0, `tests 1449 / pass 1448 / fail 0`; `npm run docs:check` → 최신.

### 검증하지 못한 것
- Codex 리뷰는 이 네트워크에서 불가라 돌리지 않았다. ship 정합 검증은 claude 엔진 shipcheck 로 대신한다(아래 Reviews).
- 다이어그램: 옵트인하지 않음(task 생성 때 사용자 선택 "없음", ship `--no-diagram`) — pr-check 권장 안내만 남는다.
- 실제 pre-push 훅 경유 push 는 네트워크 차단으로 하지 않았다(훅과 같은 `--pre-push` 경로는 테스트로 확인).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-20T06:55:33.531Z — claude-shipcheck (harness-team review)

- engine: claude · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: c12fe63086c6859513e64aea2e761f5af1f69af4 · tip: 6a9e70b8f19f58ec5a6a008008611a1821d9fa0a · exit 0 · 4763 B

````text
전하, 판정 결과 fail은 없습니다. S1·S2·S3·S5는 pass이고, S4는 아직 기록할 리뷰가 없어 na입니다. 이 검증 결과를 artifact `## Reviews`에 추가하면 S4도 pass가 됩니다. 저는 read-only라 파일은 고치지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항마다 대응 구현이 있음 | BLOCKER | **pass** | spec 설계의 `isLedgerPath`, `ledgerOnly`, `passed`, `docsFailed`, 렌더링, JSON 필드가 모두 `src/commands/pr-check.mjs`에 들어 있습니다. 예: `if (paths.every(isLedgerPath)) return { empty: false, ledgerOnly: true, tasks: [] };`, `ledgerOnly: !!r.result.ledgerOnly`. spec In 범위의 파일(D11·D5 정정, template 미러, `harness-task.md`, CHANGELOG)도 diff에 있습니다. Out으로 둔 "위키 경계를 적는다"는 `harness-task.md`의 "위키 컴파일 결과처럼 다른 파일이 섞이면 종전대로 task 문서를 요구한다"로 반영됐습니다. spec 참고에 적힌 4개 테스트도 `tests/pr-check.test.mjs`에 있습니다. |
| S2 | plan의 `- [x]` 항목마다 변경·커밋이 실재함 | MAJOR | **pass** | 2~4단계는 `2ce137f0`에 있습니다(pr-check.mjs, 테스트 +90줄, decisions 두 사본, harness-task.md, CHANGELOG). 5단계는 artifact의 `docs:check` 기록과 커밋 3개로 확인됩니다. 테스트 수는 main 34개에서 HEAD 39개로, artifact의 "pr-check 테스트 39개"와 맞습니다. 다만 1단계의 red 확인은 별도 커밋 없이 artifact 산문으로만 남아 있습니다(MINOR). `ship 완료`는 `- [ ]`로 정확히 미체크 상태입니다. |
| S3 | 스코프 밖 변경이 없음(있으면 사유 기록) | MAJOR | **pass** | `README.md`, `docs/harness-cycle.md`, `--no-renames`는 spec In·설계에 없습니다. 하지만 artifact 후속에 사유가 적혀 있습니다: "다른 파일을 원장 경로로 옮긴 커밋이 새 경로만 보여 통과하던 경계", "pr-check 판정을 서술하는 다른 자리 전수 검색 결과". 단, spec 본문의 In 목록과 설계는 갱신되지 않았습니다(MINOR, 아래 참고). |
| S4 | 실행된 리뷰가 전부 `## Reviews`에 마커와 함께 기록됨 | MAJOR | **na** | `## Reviews` 절이 비어 있고 meta.json도 `"reviews": []`입니다. 커밋 메시지, `.harness`, git notes에서도 이미 실행된 리뷰의 흔적은 찾지 못했습니다. 그런데 artifact에는 "claude 엔진 shipcheck 로 대신한다(아래 Reviews)"라는 문장이 있어, 가리키는 기록이 아직 없는 상태입니다. |
| S5 | "검증 결과"가 실제 명령·출력 인용임 | BLOCKER | **pass** | 주요 항목은 명령과 출력이 함께 적혀 있습니다. 예: `node scripts/test-isolated.mjs --test tests/pr-check.test.mjs` → `pass 36 / fail 0`, `npm run test` → `exit 0, tests 1449 / pass 1448 / fail 0`, `npm run docs:check` → "최신". 직접 대조한 결과도 일치합니다: D5 두 사본을 `diff`로 비교하니 동일했고, `c72c76a4`가 바꾼 파일은 `docs/chad/chad-task.md`와 `docs/task_summary.md`로 artifact 서술과 같습니다. 다만 일부는 정확한 명령이 빠져 있습니다(MINOR, 아래 참고). |

**MINOR 지적 (판정에는 영향 없음)**
- spec이 SSOT 역할을 하려면 `## 범위` In에 `README.md`와 `docs/harness-cycle.md`를, `## 설계`에 `--no-renames`를 한 줄씩 추가하는 편이 좋습니다.
- S5 중 다음 세 항목은 정확한 명령이 없습니다: "red 먼저: 새 테스트를 현 코드에서 실행", "doctor·migrate-templates·agent-files 테스트", "D5 두 사본 `diff` 동일". 명령을 적어 두면 좋습니다.
- spec `## Done evidence`의 `"review": "required"`가 HTML 주석 안에 있어서, done 가드가 리뷰를 강제하지 않습니다. 의도한 것인지 확인이 필요합니다.

**확인하지 못한 것:** 테스트는 다시 돌리지 않았습니다(read-only 제약). artifact에 적힌 테스트 수치가 실제로 나오는지는 확인하지 않았습니다.

### Verdict
fail 0건입니다. S4(na)는 아래 블록을 작성 세션이 `## Reviews`에 붙이면 pass가 됩니다.

```markdown
### 2026-11-20 — claude shipcheck (D6, read-only)
<!-- harness:review kind=claude-shipcheck scope=diff tip=6a9e70b8 at=2026-11-20T00:00:00Z -->
- 범위: origin/main...6a9e70b8 (커밋 3, 13 파일)
- S1 pass · S2 pass · S3 pass · S4 na→본 기록으로 해소 · S5 pass — fail 0
- MINOR: spec In/설계에 README·harness-cycle·`--no-renames` 미반영, 검증 3항목 명령 불명시, Done evidence `review: required` 주석 처리
- 조치: (작성 세션 기입)
```

`at=`은 자리표시 값이라, 붙일 때 실제 시각으로 바꿔야 합니다.
````

<!-- harness:review kind=claude-shipcheck scope=diff tip=6a9e70b8f19f58ec5a6a008008611a1821d9fa0a at=2026-11-20T06:55:33.531Z -->

**판별·조치 (작성 세션, 2026-11-20)**: fail 0. S4 na 는 이 CLI 기록(마커 포함)으로 해소 — 검증자가 제안한 수기 블록은 붙이지 않는다(마커를 손으로 쓰지 않는다).
- MINOR 1 진짜 — spec In 에 README·`docs/harness-cycle.md`, 설계에 `--no-renames` 한 줄 추가.
- MINOR 2 진짜 — 검증 3항목에 실제 명령을 적었다.
- MINOR 3 의도 — Done evidence 미선언은 기본값(optional)을 따르는 선택이다. spec 에 그 사실을 한 줄로 남겼다.

## Learnings
- 종결 절차를 바꾸면(done-derive) 그 절차가 우연히 만족시키던 검사가 드러난다 — 종결 커밋이 meta 를 함께 바꿔 pr-check 를 통과하던 것이 그 예다.
  절차 변경 때 "그 커밋이 지나가던 게이트"를 전수 확인한다.
- 위키 컴파일 결과 + 원장을 한 커밋에 담는 흐름(`harness-wiki.md`)은 여전히 pr-check 에 막힌다 — 의도한 경계(Out)이며 처리는 별도 판단.
