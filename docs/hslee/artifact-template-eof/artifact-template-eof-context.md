# artifact-template-eof — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: artifact 템플릿 EOF 빈 줄 제거
- Current atomic step: Codex 리뷰 → artifact 판별 → commit/PR
- Stop / human-decision condition: merge·release·브랜치 삭제는 사용자 승인

## Constraints and settled decisions
- 기존 artifact 파일은 고치지 않는다 · done 가드는 trim 비교라 하위호환
- golden 스냅샷은 의도된 변경으로 재생성(빈 줄 2줄 삭제만)

## JIT retrieval map
- Identifiers / symbols: taskArtifactTemplate, runRetro, insertBeforeHeading
- Narrow globs: src/commands/task.mjs, tests/task-templates.test.mjs
- Read next: tests/fixtures/task-paths-golden/expected.txt
- Verification command: node --test tests/task-templates.test.mjs tests/e2e/task-paths-golden.test.mjs

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan.md 미완 단계 확인
