# observe-surfacing — Plan

## 목표
observe 판정(트립와이어)을 doctor 경고 1건과 SessionStart 한 줄로 표면화한다 — 판정 함수는 하나, 임계값·훅·템플릿은 불변.

## 단계
- [x] 1. `evaluateObserveVerdict` 추출 (`src/commands/observe.mjs`) — `runObserve`가 이를 쓰도록 바꾸고 기존 `tests/observe.test.mjs` 무변경 통과 확인. 세 호출자 동일 판정 테스트 1건 추가(같은 fixture → 같은 status).
- [x] 2. doctor `checkObserveTripWires` — TDD: RED(tripped fixture → 경고 문자열에 wire id·nudge) → 구현 → not-installed/no-data/ok → null, 읽기 예외 → null(throw 금지). `runDoctor`에 warn으로 add.
- [x] 3. session-context 한 줄 — TDD: 활성 task 분기·무활성 분기 각각 tripped → 정확히 1줄 추가, 미발화 → 기존 출력과 바이트 동일, 판정 예외 → 동일. session-context 테스트 있으면 확장·없으면 신설.
- [x] 4. 문서 표면 — `commands/harness-observe.md`(표면화 단락) · doctor 명령 문서/README doctor 절(경고 항목) · CHANGELOG `[Unreleased]` Added · `npm run docs:generate` → `docs:check` 최신.
- [ ] 5. 검증 — `npm test` 전체, 실제 CLI: scratch 소비자 디렉터리에 tripped fixture 심고 `harness-team doctor`·`session-context` 출력 확인(플러그인 저장소 자체는 not-installed라 침묵이 정상).
- [ ] 6. 리뷰 — `/harness-review`(codex, read-only) → artifact Reviews 절 기록 → 반영/기각 판별.
- [ ] 7. `/harness-retro` → `harness-team done`.

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-09 **표면화(surfacing)** 신설 — "판정을 명령 없이 보게 되는 경로". 판정(verdict)·로거(logger)와 분리.

## 참고
- spec `## 설계 / 접근`의 기각 대안 3건(SessionStart 훅 추가·doctor fail·task 자동 생성)은 재논의하지 않는다.
- Boundary contracts 미선언 → `boundary check`는 not-configured 통과.
- plan 초안은 직접 작성(7단계 규모, `superpowers:writing-plans` 미사용).
