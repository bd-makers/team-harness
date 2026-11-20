# pr-check-fork-main — Plan

## 목표
fork 등 base 원격이 아닌 원격의 기본 브랜치로 가는 push에서도 pre-push `pr-check`(문서 검사·done 가드)가 돌게 한다. 정본 원격 기본 브랜치 push는 종전대로 건너뛴다.


## 단계
- [x] [사람] spec 검토 승인 — chad (2026-11-20: 후보1 환경변수 · U1 정확일치 교체)
- [x] pr-check: push 원격 판정(`HARNESS_PUSH_REMOTE`) + 테스트
- [x] git-hooks: 새 훅 블록 · 옛 블록 정확일치 교체 · doctor 경고 + 테스트
- [x] 문서: README · harness-ship · harness-task · decisions D11 · CHANGELOG (harness-cycle: 해당 서술 없음)
- [x] 검증: `npm run test` · `npm run docs:check` — 1442 pass · 0 fail · 1 skip(기존 CI 전용), perf 1 pass, docs:check 최신
- [ ] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-20: "기본 브랜치 push"를 base 원격으로 가는 것(건너뜀)과 다른 원격으로 가는 것(검사)으로 나눴다 — spec Ontology `base 원격`·`push 원격`.

## 참고
-
