# observe-surfacing — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: observe 트립와이어 판정을 doctor 경고 1건 + SessionStart 1줄로 표면화 (판정 함수 1개 공유, 임계값·훅·템플릿 불변)
- Current atomic step: plan 5 — 실제 CLI 검증: scratch 소비자 디렉터리에 tripped fixture(observeToolEvent ×3)를 심고 `node bin/harness-team.mjs doctor --target <dir>`·`session-context`(cwd=<dir>) 텍스트 출력을 육안 확인. 이 저장소 자체는 not-installed → 침묵이 정상. plan 1~4 완료, plan 4 미커밋.
- Stop / human-decision condition: 임계값·창·nudge 문구를 바꿔야 할 것 같으면 멈춘다(범위 밖, 보정은 실사용 로그 필요). doctor를 fail로 올리자는 판단도 멈춤.

## Constraints and settled decisions
- read-only · 템플릿·훅 변경 없음(SessionStart는 이미 session-context를 부른다) · doctor는 warn(exit 영향 없음) · SessionStart는 최대 1줄, 예외 시 생략
- 기각: SessionStart 훅에 observe 추가 / doctor fail / task 자동 생성 (spec 설계 절)
- 플러그인 저장소는 dogfood 안 함(D7) → 여기서 not-installed 침묵이 정상, 증명은 fixture + scratch 소비자 디렉터리

## JIT retrieval map
- Identifiers / symbols: summarizeObservability · readObservabilityRecords · observeLoopbackNudge · runObserve · runDoctor · buildSessionContext · checkDecisionLog(warn 패턴)
- Narrow globs: src/commands/{observe,doctor,session-context}.mjs · tests/{observe,doctor,session-context}.test.mjs · commands/harness-{observe,doctor}.md
- Read next: bin/harness-team.mjs 라우터의 session-context targetDir 결정(cwd vs --target) · scratch 디렉터리는 scratchpad 아래에 만든다(프로젝트 밖)
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
