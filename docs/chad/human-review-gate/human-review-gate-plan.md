# human-review-gate — Plan

## 목표
신규 task plan `## 단계` 맨 위에 `- [ ] [사람] spec 검토 승인 — <user>`를 기본으로 넣고(`--no-review-gate`로 뺌), loop·규범·pr-check가
그 단계를 존중하게 한다(A5, PR ①). A3 `brief`는 범위 밖.

## 단계
- [x] 1. spec — 설계 절 옮겨 쓰기, R1·Ambiguity 게이트 통과
- [x] 2. `task.mjs` — `reviewGateStep`·`taskPlanTemplate({ reviewGateUser })`·생성 경로 삽입·`--no-review-gate`(기존 task 거부)·생성 출력 한 줄
- [x] 3. `cli-args.mjs` — task 의 boolean 플래그 `no-review-gate`, args·summary
- [x] 4. `pr-check.mjs` — 게이트 줄을 뺀 뒤 템플릿 그대로 판정
- [x] 5. 문서 — `commands/harness-task.md`(게이트 절·통합 질문·인자), `commands/harness-loop.md`(진입·Dev·승인 필요), `docs/harness-cycle.md` §2, `CHANGELOG.md`
- [x] 6. 테스트 — task-templates·pr-check·cli-args·loop-command·agent-files
- [x] 7. 검증 — `npm test`·`npm run docs:check`·doctor·`pr-check --base origin/main`
- [x] 8. Codex 리뷰 1회 — 발견 판별·반영, artifact Reviews 기록
- [ ] 9. 로컬 커밋 (push·PR은 사용자)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18: "사람 검토 단계(검토 게이트)"·"`[사람]` 단계" 신설 — spec Ontology.

## 참고
- 설계 정본: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A5 + A3" 절
