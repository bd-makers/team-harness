# root-docs-0200-rubric — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 0.20.0 기준 루트 문서 정합화 + 루브릭 가이드 HTML — 작성 완료, 커밋/PR 대기
- Current atomic step: 사용자 검토 → 커밋(hs-commit 컨벤션) → PR
- Stop / human-decision condition: 커밋·푸시는 사용자 지시로만 진행

## Constraints and settled decisions
- 문서·HTML만 변경 — 소스/템플릿/에이전트 파일 3종 무변경 (managed 섹션 pin 회피)
- Done evidence: `{ "version": 1, "tests": "skip" }` (문서 task)
- 외부 리뷰 미실행 — 사소한 변경 생략 조건, artifact ## Reviews에 사유 기록됨

## JIT retrieval map
- Identifiers / symbols: VERIFY_KIND_SUFFIXES, harness:review kind=
- Narrow globs: README.md, MAINTAINING.md, docs/prerequisites.md, docs/harness-rubric-guide.html,
  docs/index.html, CHANGELOG.md
- Read next: plan.md 체크리스트(전부 [x]) → artifact.md 결과
- Verification command: node --test tests/documentation-inventory-pointers.test.mjs
  tests/prerequisites-doc.test.mjs tests/what-changes-latest-version.test.mjs
  tests/agent-files.test.mjs && npm run docs:check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- git status로 변경 파일 7개 확인 후 커밋 단위 결정 (docs task 파일 포함 여부는 사용자 판단)
- 커밋 후 post-commit 훅이 handoff 자동 갱신하는지 확인
