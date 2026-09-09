# observe-surfacing — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: observe 트립와이어 판정을 doctor 경고 1건 + SessionStart 1줄로 표면화 (판정 함수 1개 공유, 임계값·훅·템플릿 불변)
- Current atomic step: plan 4 — 문서 표면: commands/harness-observe.md(표면화 단락) · commands/harness-doctor.md·README doctor 절(경고 항목) · CHANGELOG [Unreleased] Added · npm run docs:generate → docs:check. plan 1~3 완료(2026-09-09), plan 3 미커밋.
- Stop / human-decision condition: 임계값·창·nudge 문구를 바꿔야 할 것 같으면 멈춘다(범위 밖, 보정은 실사용 로그 필요). doctor를 fail로 올리자는 판단도 멈춤.

## Constraints and settled decisions
- read-only · 템플릿·훅 변경 없음(SessionStart는 이미 session-context를 부른다) · doctor는 warn(exit 영향 없음) · SessionStart는 최대 1줄, 예외 시 생략
- 기각: SessionStart 훅에 observe 추가 / doctor fail / task 자동 생성 (spec 설계 절)
- 플러그인 저장소는 dogfood 안 함(D7) → 여기서 not-installed 침묵이 정상, 증명은 fixture + scratch 소비자 디렉터리

## JIT retrieval map
- Identifiers / symbols: summarizeObservability · readObservabilityRecords · observeLoopbackNudge · runObserve · runDoctor · buildSessionContext · checkDecisionLog(warn 패턴)
- Narrow globs: src/commands/{observe,doctor,session-context}.mjs · tests/{observe,doctor,session-context}.test.mjs · commands/harness-{observe,doctor}.md
- Read next: commands/harness-doctor.md(경고 목록 절) · README의 doctor·observe 절(grep 'harness-team doctor' / 'observe') · tests/manifest-sync·documentation-inventory-pointers가 고정하는 문서 표면 · CHANGELOG [Unreleased] 형식
- Verification command: node --test tests/observe.test.mjs tests/doctor.test.mjs → npm test → npm run docs:check

## Failure capsules (max 3 unresolved)
### F-001
- Signal:
- Tried:
- Compact finding / current hypothesis:
- Next discriminator:
- Source (safe path or command):

## Resume checklist
- plan.md 체크박스로 현재 단계 확인 → spec 제약 절 재확인 → 위 verification command 먼저 실행
