# sim-lifecycle-sc6 — Plan

## 목표
agentloop.mjs에 sc6Lifecycle 추가 — task 풀 라이프사이클(체크박스→커밋→done-guard 차단→
done 완료→active 해제→handoff 마커)을 파일/git 이진 증거로 검증.

## 단계
- [x] 스크래치 샌드박스에서 SC6 결정 로직 손검증 (auth 독립, apply→task→편집→done)
- [x] sc6Lifecycle 함수 구현 (전용 applied 샌드박스, 4단계 + cause assert)
- [x] runFull에 SC6 wire-in (마지막 배치, renderSignals + 신호 집계)
- [x] MANUAL 신호 추가 (AskUserQuestion 휴먼 게이트 ⚠️manual)
- [x] 무오염 확인 (.sim-tmp 삭제 + playground 3개 clean) — standalone sc6 자체 정리
- [x] 리포트 작성 (SC6 섹션, 증거 기반 PASS) — 사용자 선택으로 auth'd 풀런 생략, SC6 standalone 결과로 리포트
- [x] auth'd full run — SKIP (사용자 선택: SC6 standalone 검증으로 충분, 토큰 미소모)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-
