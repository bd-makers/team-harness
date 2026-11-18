# task-brief — Plan

## 목표
`harness-team brief [--stage spec]`이 활성 task spec의 정해진 절·열린 항목·scenarios를 그대로 렌더한 검토용 슬라이드 `<name>-brief.html`을 쓴다.
렌더 결과의 텍스트는 모두 spec 원문의 부분 문자열이다(새 사실 0). `--stage ship`은 뺀다.

## 단계
- [x] 1. Obsidian 열람 실측 가능성 확인 — 네이티브 미지원(문서 근거)·플러그인 미검증으로 spec R1·참고에 기록
- [x] 2. 설계 A3 항목·결정 A3-1을 spec에 옮겨 쓰고 R1 결정(판정 방식·제외 글자·열린 항목 문법·ship 제외·A5 순서·없는 절)·Ambiguity 게이트 통과
- [x] 3. `src/commands/brief.mjs`(절 선택·부분집합 렌더러·쓰기)와 CLI 표면(router·COMMANDS·`VALUE_FLAGS`·`FLAG_CHOICES.stage`·`--json` 목록)
- [x] 4. 형제 경로 — `clean` `TASK_FILE` kind `brief`, `task-paths` kind 주석
- [x] 5. 테스트 — brief-command(새 사실 0·외부 참조 0·escape·제외 글자·열린 항목·scenarios·결정론·오류)·cli-args·clean
- [x] 6. 문서 — harness-task 검토용 슬라이드 절·templates/docs/README·README 명령어·SKILL, CHANGELOG
- [x] 7. 로컬 브라우저 scroll-snap 실측(내장 브라우저, 이 task spec으로 생성)
- [ ] 8. 검증 — `npm test`·`npm run docs:check`·doctor·`pr-check --base origin/main`, Codex 리뷰 1회 판별, 로컬 커밋

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18: 브리프·새 사실 0·열린 항목·출처 표지 정의 추가

## 참고
- A5(`human-review-gate`)와 병렬 — 게이트 연결은 A5 머지 뒤 rebase 때(spec R1).
