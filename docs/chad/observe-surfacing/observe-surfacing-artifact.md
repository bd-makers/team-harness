# observe-surfacing — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


- 2026-09-09 plan 5 실측(scratch 소비자 디렉터리에 실제 훅 `observeToolEvent`로 같은 도구 3회 실패를 심음):
  `observe --target` → `✗ repeat-failure-3x: fired` + `next:` nudge · `doctor --target` → `⚠️ observe 트립와이어 발화:
  repeat-failure-3x(session … shell ×3 …) — harness-team observe로 상세 확인; <nudge>` 1줄(warn) ·
  `session-context`(cwd=scratch) → 무활성 nudge 뒤 `[harness] ⚠ observe 트립와이어 발화: repeat-failure-3x (창
  2026-09-03→2026-09-09) — …` 정확히 1줄. 이 저장소 자체(`.harness/observability` 없음, D7)에서는 doctor·session-context
  모두 표면화 줄 0 — 처음 grep이 1을 센 것은 활성 task TCC 본문의 "observe 트립와이어" 문구였다(오탐, 접두 정확 매치로 재확인).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


### 2026-09-09 codex — scope: diff (origin/main..48b672a, 6커밋)

- 실행: `codex exec --sandbox read-only -m gpt-5.6-sol "<공용 프롬프트 + focus 5항목>" < /dev/null` 백그라운드, 182,349 tokens.
  트리는 깨끗한 상태(자기참조 handoff 잔여만 버림)라 scope=diff.
- 결과: P1 없음 · P2 2건 · P3 2건 · verdict "Request changes". 리뷰어가 확인한 것: 세 호출자가 `evaluateObserveVerdict`를
  실제로 공유, `runObserve` text/JSON·exit 처리 리팩터 전과 동등, doctor null/warn 계약·pluginDev 미게이트, 예외 시
  SessionStart 출력 보존, 임계값·창·nudge·훅·템플릿 불변, 문서 정합. `node --check`·`git diff --check`·`docs:check` exit 0.
  집중 테스트는 `mkdtemp EPERM`(read-only 샌드박스)으로 인프라 실패 → 작성 세션의 `npm test`(685 pass / 0 fail)로 대체.
- 판별(작성 세션이 재현·측정):
  - P2 `session-context.mjs` — 매 SessionStart가 7일 JSONL을 상한 없이 읽어 10초 훅 timeout 시 observe 줄뿐 아니라
    task-gate 출력까지 유실. **실패 모드는 사실이나 규모는 과장** — 실측: 35,000 레코드(17.9 MB) 0.11 s, 140,000 레코드
    (71.5 MB, 하루 2만 호출) 0.34 s, 빈 소비자 0.03 s → timeout의 1/30. 그러나 `runSessionContext`가 gate와 observe를
    합쳐 마지막에 한 번 출력하는 구조라 어떤 이유로든 판정이 늦으면 gate까지 함께 죽는다. **반영 권장(무비용)**:
    gate를 먼저 `console.log`하고 observe 줄은 그 뒤에 계산·출력 — 늦어도 잃는 것은 observe 줄뿐. 상한·시간 예산은 넣지 않는다(측정상 불필요, 기계 추가).
  - P2 `tests/doctor.test.mjs` e2e — bare fixture는 원래 필수 검사 실패로 exit 1이고 helper가 exit를 버려 "warn이 fail로
    새는" 변이를 못 잡는다. **부분 타당** — `add(label,'warning',…)`의 status 문자열 변이는 `status === 'warning'` 단언이
    잡지만, "fail 수가 늘지 않는다"는 직접 증거가 없다. **반영 권장(저비용)**: 같은 bare fixture의 tripped/빈 두 실행에서
    `checks[].status === 'fail'` 개수가 같음을 단언(healthy 프로젝트 scaffold는 비용 대비 과함).
  - P3 `tests/observe.test.mjs` 동일 호출자 계약 — 오늘 발생한 repeat-failure만 비교해 doctor/session-context가 `days: 1`로
    갈라져도 통과. **사실** → **반영 권장**: 3일 전 날짜로 심은 실패(`observeToolEvent(..., { now: 3일 전 })`)가 doctor·
    session-context에도 표면화되는지 단언 — 창 공유의 증거.
  - P3 TCC `observe-surfacing-context.md:6` "plan 5 미커밋"이 커밋 뒤에도 남음 · `chad-handoff.md` Last Commit이 HEAD보다 뒤. **사실**.
    TCC는 이 기록과 함께 갱신. handoff 지연은 post-commit 훅 자기참조 잔여를 버리는 관례의 부산물(항상 한 커밋 뒤) — 설계상 허용.
- 조치(2026-09-09, 사용자 승인 후 TDD): ① `runSessionContext`가 gate를 먼저 `console.log`하고 observe 줄을 별도 호출로 뒤에 낸다
  (RED: 합쳐서 1회 출력 → GREEN: 2회) ② doctor e2e가 tripped/빈 두 실행의 `checks[]` fail 항목 수·envelope `status`·
  `error.root_cause`(fail 카운터) 동일을 단언 ③ doctor·session-context 각각 3일 전 실패가 표면화되는지 단언(창 공유).
  뮤테이션 검출: doctor `days:1` · session-context `days:1` · observe 경로 `fail++` 모두 KILLED. `npm test` 688 pass / 0 fail.
  테스트 결함 2건을 도중에 잡음 — `^` 앵커 정규식을 여러 줄 출력에 대조(마지막 줄로 수정), `checks[]`만 세어 fail 카운터 변이를
  못 잡던 단언(envelope status·root_cause 추가).
- 함정: plan 5 커밋 `99f2a4f`가 plan 4 문서 4파일을 되돌린 채 실렸다(iCloud `.git/index` 롤백, 가산 커밋 `48b672a`로 복원).
  리뷰 scope를 잡기 전 `git diff --stat origin/main..HEAD`로 net diff에 기대 파일이 다 있는지 대조한 것이 발견 경로였다.

<!-- harness:review kind=codex scope=diff tip=48b672afb9e8c4e6a8f5898f4caa468a1f8b240a at=2026-09-09T04:31:28Z -->

## Learnings


## Learnings (2026-09-09)

- 리뷰 지적은 측정으로 등급을 다시 매기고, 단언은 투영(checks[])이 아니라 판정의 원천(fail 카운터·창)을 겨눈다

- **측정이 등급을 정한다.** codex P2 "SessionStart가 7일 JSONL을 무상한으로 읽어 10초 timeout 위험"은 실측(하루 2만 호출 ×
  7일 = 140k 레코드/71 MB → 0.34 s)으로 1/30임이 드러났다. 그래서 상한·시간 예산 같은 기계를 넣지 않고, 실패 모드
  (판정이 늦으면 task-gate 출력까지 잃는다)만 **출력 순서 변경**으로 무비용 제거했다 — 지적의 *실패 모드*와 *규모*를 분리해 판별한다.
- **단언은 투영이 아니라 원천을 겨눈다.** `checks[]`의 status만 세던 e2e 단언은 `fail++` 변이를 못 잡았다 — exit code를 정하는
  카운터는 envelope의 `status`·`error.root_cause`에만 드러난다. "무엇이 결과를 결정하는가"를 찾아 그 값을 단언한다.
- **"같은 판정 함수를 쓴다"는 계약에는 창 공유 테스트가 따로 필요하다.** 오늘 실패만 심은 fixture는 호출자가 `days:1`로 갈라져도
  통과한다 — 3일 전 실패가 표면화되는지로 고정했다(뮤테이션 `days:1` 검출).
- **`^` 앵커 정규식은 한 줄에만 대조한다.** 같은 상수를 여러 줄 출력 전체에 재사용해 거짓 실패가 났다 — 마지막 줄을 뽑아 대조하거나
  `m` 플래그를 쓴다. 문구 grep도 마찬가지: plan 5에서 "observe 트립와이어"를 세다 TCC 본문에 걸려 오탐 — 표면화 줄은 **정확한 접두**로 센다.
- **iCloud `.git/index` 롤백.** plan 4 커밋의 문서 4파일이 다음 커밋에서 조용히 되돌아갔다(`git add`는 task 문서뿐이었다).
  발견 경로는 리뷰 scope를 잡기 전 `git diff --stat origin/main..HEAD`를 기대 파일 목록과 대조한 것. 이후 커밋마다
  `git show --stat HEAD`를 대조하고, 복구는 reset·amend 없이 워킹트리 내용을 가산 커밋한다(개인 메모리 `icloud-git-index-rollback`).
- **작동 증명은 소비자 모양의 scratch에서.** 플러그인 저장소는 훅을 dogfood하지 않아(D7) 여기서는 not-installed 침묵이 정상이다 —
  실제 훅(`observeToolEvent`)으로 심은 scratch 디렉터리에서 observe·doctor·session-context 세 표면이 같은 id를 보고하는 것을 확인했다.
