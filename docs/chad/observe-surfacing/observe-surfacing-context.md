# observe-surfacing — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: observe 트립와이어 판정을 doctor 경고 1건 + SessionStart 1줄로 표면화 (판정 함수 1개 공유, 임계값·훅·템플릿 불변)
- Current atomic step: plan 1 — `evaluateObserveVerdict` 추출, `runObserve` 전환, 기존 observe 테스트 무변경 통과
- Stop / human-decision condition: 임계값·창·nudge 문구를 바꿔야 할 것 같으면 멈춘다(범위 밖, 보정은 실사용 로그 필요). doctor를 fail로 올리자는 판단도 멈춤.

## Constraints and settled decisions
- read-only · 템플릿·훅 변경 없음(SessionStart는 이미 session-context를 부른다) · doctor는 warn(exit 영향 없음) · SessionStart는 최대 1줄, 예외 시 생략
- 기각: SessionStart 훅에 observe 추가 / doctor fail / task 자동 생성 (spec 설계 절)
- 플러그인 저장소는 dogfood 안 함(D7) → 여기서 not-installed 침묵이 정상, 증명은 fixture + scratch 소비자 디렉터리

## JIT retrieval map
- Identifiers / symbols: summarizeObservability · readObservabilityRecords · observeLoopbackNudge · runObserve · runDoctor · buildSessionContext · checkDecisionLog(warn 패턴)
- Narrow globs: src/commands/{observe,doctor,session-context}.mjs · tests/{observe,doctor,session-context}.test.mjs · commands/harness-{observe,doctor}.md
- Read next: tests/observe.test.mjs fixture 작성부(레코드 형식·.key) → tests/doctor.test.mjs makeDecisionLogFixture 스타일
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
