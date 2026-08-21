# diagram-companion-pin — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: diagram-design을 sha 핀 동반 플러그인으로 등재 + release 가드 일반화 + /harness-diagram 어댑터
- Current atomic step: PR #28 open, CI green(18/20), Codex 리뷰 1라운드 조치 완료 — 사용자 결정 대기
- Stop / human-decision condition: PR 머지는 하지 않는다. 핀 sha를 5538b35로 올릴지는 사용자 결정.

## Constraints and settled decisions
- `harness-team release` 실행 금지, 어떤 서브커맨드에도 `--help` 금지 (과거 사고)
- 버전 범프 금지 / main 직접 push 금지 / 머지 금지 / diagram-design 파일 복사 금지
- 동반 항목에 `version` 필드 금지 — surgicalVersionReplace가 1회 출현을 가정
- 핀 = 0ab077f (검증된 커밋). main 5538b35는 commands/ 추가 + major 2개 점프라 미채택
- AGENTS.md 미변경 — ship-command.test.mjs가 도구 이름·Claude 전용 호출을 금지
- doctor 체크 미추가 — known_marketplaces.json은 공개 계약이 아님

## JIT retrieval map
- Identifiers / symbols: `selfEntry`, `selfEntries`, `surgicalVersionReplace`, `ERROR_ADVICE.schema`
- Narrow globs: `src/commands/release.mjs`, `.claude-plugin/marketplace.json`, `commands/harness-*.md`
- Read next: 리뷰 지적이 오면 `tests/release.test.mjs` 하단 companion 4건부터
- Verification command: `npm run test` / `npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- `git log --oneline -3` 로 두 커밋(A: 핀+가드, B: 어댑터+문서) 확인
- PR 번호는 artifact.md 상단에 기록됨
- 후속: harness-ship.md의 Probe/Degrade/Record 문구는 ship-command.test.mjs가 고정 — 포인터로 축약 불가
- 후속: handoff 생성 코드의 EOF 공백(git diff --check)은 별도 task 대상
