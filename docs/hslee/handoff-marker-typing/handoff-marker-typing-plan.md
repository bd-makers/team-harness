# handoff-marker-typing — Plan

## 목표

완료 마커의 생성·판독을 `src/handoff-marker.mjs` 한 선언으로 모으고, 생산자 단독 변경이
반드시 테스트를 깨게 만든다. append 바이트와 정규식의 느슨함은 그대로 유지한다.

## 단계

- [x] 실패하는 테스트부터 쓴다 (TDD red) — `tests/handoff-marker.test.mjs`
      ① 왕복: `hasDoneMarker(renderDoneMarker(ts))` 참
      ② 동결 fixture: ISO 형태 · 날짜만 형태 둘 다 파싱됨 (렌더러에서 생성하지 않은 리터럴)
      ③ 바이트 모양: `renderDoneMarker` 의 오늘 출력을 못박음
- [x] `src/handoff-marker.mjs` 구현 → red 해소 (green)
- [x] 생산자 교체: `src/commands/task.mjs` `runDone` → `renderDoneMarker(ts)`
- [x] 소비자 교체: `src/commands/summary.mjs` `inferLegacyMeta` → `hasDoneMarker(handoff)`
- [x] 뮤테이션 검증: `renderDoneMarker` 의 `—` 를 `-` 로 바꾸면 테스트가 **실패**하는지 확인 후 복원
      (착수 전 probe 에서 609개 전부 통과했던 바로 그 변경)
- [x] 전체 스위트 `npm run test` 통과 + `node bin/harness-team.mjs doctor` 통과
- [x] `/harness-review codex` 실행 → 결과를 artifact.md `## Reviews` 에 마커와 함께 기록
- [x] 리뷰 발견 반영 (있으면) 후 재검증
- [x] artifact.md `## 결과`·`## Learnings` 작성 → `harness-team done`

## Ontology 변경 로그

- 2026-09-06: **타입화(typing)** 를 이 저장소 맥락에서 정의 — 정적 타입이 아니라 "형식을 한 곳에
  선언하고 생성·판독이 그 선언에서 나오게 하는 것". 판정 기준은 손복사 리터럴 0개 + 생산자
  단독 변경 시 테스트 실패.
- 2026-09-06: **과거 형태(historical shape)** 를 명시 — 렌더러가 더는 만들지 않아도 소비자는
  계속 받아들여야 하는, 이미 디스크에 쓰인 마커.

## 참고

- spec 의 실측 근거(뮤테이션 probe)가 완료 기준을 정의한다 — 5번째 단계가 그 재확인이다.
- 범위 밖: post-commit 커밋 항목(`## <ISO> — <sha>` + diffstat) — 소비자 없음.
