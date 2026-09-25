# agents-md-native — Plan

## 목표
AGENTS.md 네이티브 지원(2.1.277)에도 CLAUDE.md를 유지하는 결정을 D10으로 남기고 doctor eager tier 주석을 그 기준으로 정정한다.

## 단계
- [x] `docs/decisions.md`에 D10 append (D9 형식, 영향 범위는 grep 실측) + `templates/docs/decisions.md` 동기화 + `DECISION_HEADINGS`·테스트 기대치에 `## D10` 등록 (D9 전례)
- [x] `src/commands/doctor.mjs` eager tier 주석 정정 (코드 변경 없음, D10 참조)
- [x] `npm test` + `npm run docs:check` green (1009 tests: pass 1008 · fail 0 · skip 1, perf 1/1)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 다이어그램 옵트인: 넣지 않음 — 문서 전용 task(메인 세션 판단)
- 종결 절차(체크박스 아님): PR → merge → main 에서 `task agents-md-native --member hslee` → `done` → `summary --write` → push
