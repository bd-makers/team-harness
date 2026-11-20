# sim-sc6-retired-phrases — Plan

## 목표
11-06에 남은 두 브랜치(SC6 doctor green 수정·retired-phrases 테스트)를 합치고, SC6을 0.58.0에 맞춰 `--force` 없이 녹색으로 만든다.

## 단계
- [x] `claude/jovial-blackwell-bfcd1f` 병합
- [x] `claude/ecstatic-herschel-b3c503` 병합·충돌 해소
- [x] SC6 plan 체크·종결 판정 현행화 (`tests/sim/agentloop.mjs`)
- [x] retired-phrases·sim-smoke·SC6·`npm test` 검증
- [x] 리뷰·artifact 기록
- [x] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- SC6 종결 신호: meta `status`/`closedAt` → plan 파생 `closureFromContent` (0.58.0 done-derive 반영)

## 참고
- 검토 게이트는 task 생성 질문에서 사용자가 판단을 위임해 뺐다(이미 작성된 커밋을 살리는 좁은 범위).
