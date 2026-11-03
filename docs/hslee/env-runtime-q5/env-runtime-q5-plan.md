# env-runtime-q5 — Plan

## 목표
D12 Q5의 런타임 축(선언 대 실제)을 만들지 go/no-go로 판단한다 — 결론 no-go(spec D-5).

## 단계
- [x] task 생성·근거 문서 읽기(D11·D12 정정, env-state-q5 D-1·D-2, env-blank-q1q4 Q1, presets·stack·doctor)
- [x] D-1 반대 근거 셋에 정면으로 답하기 — spec D-1–D-3
- [x] 파일 읽기만으로 실제 런타임이 나오는 경우 실측(npm·pnpm·yarn classic·bun·uv·stdlib venv) — spec D-4
- [x] 판단과 반증 조건을 spec·artifact에 기록 — spec D-5·`## 설계 / 접근`
- [x] 검증(`npm test`·`npm run docs:check`)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-03: "실제 런타임"·"파일 관측 가능" 정의 추가(spec Ontology).

## 참고
- 종결(`done`)은 main에서 한다. 이 브랜치는 커밋까지만.
