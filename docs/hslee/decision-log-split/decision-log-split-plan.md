# decision-log-split — Plan

## 목표
결정 로그를 팀 운영 결정(배포)과 플러그인 결정(저장소 전용)으로 나누고, D11과 사이클 문서를 기록한다.

## 단계
- [x] 템플릿 결정 로그에서 D7–D10 제거, 두 로그 머리말 정리
- [x] D11 기록
- [x] `doctor` `DECISION_HEADINGS` → D2·D4·D5·D6
- [x] 테스트: 분리·동일성 계약, fence 계약 감시자 D6으로 이동
- [x] 소비자 쪽 D7·D8 참조 정리(AGENTS 템플릿·루트, migrate·review 명령)
- [x] `docs/harness-cycle.md` 정식화 + 구현 순서
- [x] 검증: `npm run test` · `npm run docs:check`
- [x] 외부 리뷰(R3) 기록 — codex PASS, P3 1건 반영
- [x] 커밋 · PR (#121)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-05 "팀 운영 결정"·"플러그인 결정" 구분 추가(spec Ontology, D11).

## 참고
- 머지 후 종결(`done`·`summary --write`)은 기본 브랜치 몫이다.
