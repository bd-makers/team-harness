# cursor-rules-prune — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 원본이 사라진 Cursor 미러 산출물을 제거한다(낡은 규칙이 Cursor에 계속 로드되는 것을 막는다).
- Current atomic step: plan 전 항목 완료 — 커밋 후 done 대기.
- Stop / human-decision condition: 없음.

## Constraints and settled decisions
- 하네스는 `<!-- harness:mirror -->` 스탬프가 있는 `.mdc`만 소유한다. 그 밖은 읽기 전용.
- 구버전 산출물(스탬프 없음)은 prune하지 않는다 — 보수적 실패는 "낡은 규칙이 남음"이지 "사용자 파일 삭제"가 아니다.
- 빈 디렉터리는 `rmdir` 시도 후 실패 무시로 처리한다(다른 내용이 있으면 자연히 실패).

## JIT retrieval map
- Identifiers / symbols: `pruneCursorMirrors`, `CURSOR_MIRROR_MARKER`, `mirrorCursorRules`
- Narrow globs: `src/harness.mjs`, `src/commands/sync.mjs`, `tests/cursor-rules-mirror.test.mjs`
- Read next: 없음 (작업 완료)
- Verification command: `node --test tests/cursor-rules-mirror.test.mjs` / `npm test`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 브랜치 `fm/th-cursor-rules-mirror`에 [[cursor-rules-mirror]]와 함께 쌓여 있다. 원격 push 없음.
