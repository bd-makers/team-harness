# eager-budget-headroom — Plan

## 목표
`AGENTS.md` protocol 절의 A·B·C를 압축해 프로젝트 eager 여유 ≥ 1 KB 확보 (규범 의미 불변).

## 단계
- [x] A·B·C 압축 — 루트 `AGENTS.md`와 `templates/AGENTS.md.hbs` 동일 반영
- [x] 검증 — `wc -c AGENTS.md CLAUDE.md`, `npm test`, `npm run docs:check`
- [x] `MAINTAINING.md`·`src/commands/doctor.mjs` 주석 eager 실측 수치 현행화
- [x] 리뷰(codex 401로 claude 폴백 ×2) → artifact Reviews 기록
- [ ] 커밋·PR (머지 후 체크)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 다이어그램: 옵트인 질문에 "넣지 않음"(2026-09-26)
