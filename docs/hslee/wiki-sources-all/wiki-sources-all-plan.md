# wiki-sources-all — Plan

## 목표
`wiki sources --all` 로 task 마다 컴파일 가능 / 이미 컴파일됨 / 막힘 을 보이는 후보 목록을 낸다(followups 24, 방향 B). 인수 없는 계약은 그대로, 그 오류 패킷은 대상 지정 + `--all` 대안으로.

## 단계
- [x] 회귀 테스트 추가(tests/wiki.test.mjs: `--all` 섞인 목록 · 대상 0건·조합 거부 · 인수 없는 분기 오류 패킷) → 구현 전 ✖ 확인, artifact 기록
- [x] `wiki.mjs`: `--all` 분기(라벨순 행·state·summary·텍스트), 공유 스캔(shallow·마커 색인·rules 1회), 인수 없는 오류 패킷 retry·alternatives → 테스트 ✔
- [x] `cli-args.mjs` wiki 항목에 `all` 플래그·args 도움말
- [x] 문서: `commands/harness-wiki.md` "언제" 절 + `tests/wiki-command.test.mjs`, README `/harness-wiki` 예시, CHANGELOG `[Unreleased]`, `docs/followups.md` 24번 삭제 + 괄호 기록 + "남은 것" 갱신
- [x] `npm test`·`npm run docs:check` 통과
- [x] PR 생성(#148) — 리뷰 덱 미실행(스킬 없음)
- [x] 머지 (사람)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-11 "컴파일 후보 목록"·행 `state` 신설, 인수 없는 오류 패킷의 retry 를 대상 지정만으로(spec 설계 4)

## 참고
- 정본 서술: `docs/followups.md` 24번(origin/main 93d72eb, 이 PR 에서 삭제)
