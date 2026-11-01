# stack-inprocess-docker — Plan

## 목표
`stack`의 `next_actions`가 인프로세스 DB만 쓰는 프로젝트에 `docker info`를 권하지 않게 해 0.51.1 `/harness-inttest` 문서와 맞춘다.

## 단계
- [x] 실패 테스트 작성 — `better-sqlite3`만 / `pg`만 / 혼합 / ORM만 네 경우의 `stack --json` `next_actions`
- [x] `nextActions` 분기 수정 — 드라이버가 전부 인프로세스면 인프로세스 안내
- [x] 전체 테스트·관련 문서 점검(`docker info` 안내를 서술한 문서)
- [x] artifact 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 인프로세스 DB 드라이버·서버형 DB 신호 정의 추가(spec Ontology)

## 참고
- spec Done evidence
