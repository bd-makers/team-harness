# pre-push-hook-doctor — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: pre-push 훅에 pr-check 실행 줄이 없으면 doctor가 알리고 상황별 처방을 낸다 (followups 11번).
- Current atomic step: PR #126 리뷰·머지 대기 → 머지 후 기본 브랜치에서 done.
- Stop / human-decision condition: 리뷰에서 설계 재론급 지적이 나오면 사용자에게.

## Constraints and settled decisions
- 2026-10-06 사용자 결정: 검사 + 분기 처방(기본 dir → sync, core.hooksPath → 비경고 안내, 비-셸 훅 → 직접 호출 안내).
- 다이어그램 만들지 않음(사용자 선택).
- 2026-10-06 interview: 완료 = 단위 테스트 + husky 실측(npm 다운로드) · lefthook류는 기본 dir로 취급(문구 대응).
- advisory(warning, fail 없음) · 소비자 전용(plugin-dev skip) · 도구별 설정 파싱 금지 · 설치기 동작 불변(#125).

## JIT retrieval map
- Identifiers / symbols: installGitHook, PRE_PUSH_MARKER, SH_SHEBANG, resolveHooksDir, hasCustomHooksPath, checkHookCli, isPluginDevRepo
- Narrow globs: src/git-hooks.mjs, src/commands/doctor.mjs, tests/doctor.test.mjs, tests/git-hooks.test.mjs
- Read next: src/commands/doctor.mjs hook CLI 출력부(~:1007), tests/git-hooks.test.mjs 임시 저장소 헬퍼
- Verification command: npm run test · npm run docs:check

## Failure capsules (max 3 unresolved)

## Resume checklist
- spec의 (open) 항목과 2차 장치 규칙 검토 절 먼저 읽기.
