# claude5-context-apply — Plan

## 목표

Claude 5 컨텍스트 엔지니어링 블로그 권고 4건(auto-memory 경계·CLAUDE.md 감량·doctor
eager 크기 경고·session-context 캡)을 구현하고 테스트·외부 리뷰로 검증한다.

## 단계
- [x] ① auto-memory↔artifact.md 경계 1줄 — `templates/CLAUDE.md.hbs` §3 + 루트 `CLAUDE.md` 동기화
- [x] ② CLAUDE.md.hbs §4·§5·§6 판단 기반 압축(레버·예외 유지) + 루트 동기화 + drift 테스트 통과 (73→69줄)
- [x] ③ doctor eager 계층 크기 경고(합산 >24 KiB) + 동작 테스트 + MAINTAINING.md 한 단락 (`EAGER_TIER_MAX_BYTES`)
- [x] ④ session-context 미완 task 목록 캡(최근 8 + "외 N개") + 동작 테스트 (`SESSION_CONTEXT_MAX_TASKS`)
- [x] 전체 테스트 `npm run test` 통과 — 462 pass / 1 skip(기존) / 0 fail, 2026-08-30
- [x] 외부 리뷰 `/harness-review` 실행 → artifact.md ## Reviews 기록 → 발견 반영 (codex, P2·P3 확정·반영)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-30: **eager 크기 예산**(24 KiB, doctor 경고) 신설 — spec Ontology에 정의.

## 참고
- 다이어그램 옵트인: 비대화형 세션이라 질문 생략, 미채택(artifact.md에 기록).
- 쓰기는 D4에 따라 순차 위임 — 병렬 작성 에이전트 없음.
