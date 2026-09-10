# review-evidence-cli-owned — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 리뷰 엔진 실행·증거 기록을 `harness-team review`가 소유, `verify: required`는 `meta.reviews[]`를 읽는다.
- Current atomic step: plan 11단계 — retro 후 `done` (가드가 meta.reviews의 adversarial 항목으로 verify를 통과하는지가 최종 E2E).
- Stop / human-decision condition: 위협 모델(망각·실수)을 넓혀 "위조 방지"로 가고 싶어지면 멈춘다 —
  HMAC은 기각했고 근거는 spec에 있다. runner 표의 호출 형태를 바꾸고 싶어져도 멈춘다.

## Constraints and settled decisions
- 성공(exit 0)한 실행만 증거. 실패는 meta·artifact 어느 것도 쓰지 않는다.
- CLI는 meta에 `reviews` 키가 **이미 있을 때만** 쓴다 — 구 task에 키를 만들면 손 마커가 무효화된다(리뷰 P1).
- custom `{prompt}`는 독립 토큰만 허용 — 따옴표 안이면 실행 전 거부(리뷰 P1).
- `reviews` 키 없는 구 meta → 종전 판정(artifact 마커). 소급 금지 — `--force` 훈련기가 된다.
- `verify: required`(신규 meta) = meta.reviews만. `review: required` = meta ∪ artifact 마커.
- `--framing` suffix는 `VERIFY_KIND_SUFFIXES` 안에서만. 열거 밖은 error 패킷.
- 프레이밍 프롬프트는 문서에 남긴다(`--prompt-file`). src 이관은 범위 밖.
- codex는 stdin 닫아서 실행(`< /dev/null` 계약). custom `{prompt}`는 POSIX 단일 인용 리터럴 치환.
- 이 task 자신의 리뷰는 새 CLI로 dogfood (spec Done evidence: review·verify·tests 모두 required).

## JIT retrieval map
- Identifiers / symbols: `parseReviewMarkers`, `VERIFY_KIND_SUFFIXES`, `VERIFY_KIND_RE`, `collectDoneIssues`,
  `runRetro`, `taskMetaTemplate`, `COMMANDS`(cli-args), `buildErrorPacket`
- Narrow globs: `src/commands/{task,summary,cli-args}.mjs`, `src/commands/review.mjs`(신설),
  `commands/harness-{review,adversarial-review,task}.md`, `tests/{done-guard,cli-drift,manifest-sync}.test.mjs`
- Read next: `src/commands/task.mjs:495-520`(파서), `:584-593`(verify 판정), `:719`(retro append 선례),
  `commands/harness-review.md` 98-145(runner 표 — 코드로 옮길 정본)
- Verification command: `npm run test` · 부분은 `node --test tests/done-guard.test.mjs tests/review-command.test.mjs`

## Failure capsules (max 3 unresolved)
### F-001
- Signal:
- Tried:
- Compact finding / current hypothesis:
- Next discriminator:
- Source (safe path or command):

## Resume checklist
- plan `## 단계` 첫 미완 `- [ ]`가 현재 단계.
- 가드를 건드렸다면 구 meta 회귀 테스트(g)가 여전히 통과하는지 먼저 본다 — "여전히 막는가"가 판정 기준.
- 문서 3종(harness-review·프레이밍 5종·harness-task)과 skills 미러가 같이 갔는지 manifest-sync로 확인.
