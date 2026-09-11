# review-adopt-record-quality — Plan

## 목표
followup 3(구 task → CLI 소유 채택 경로)과 8(review 기록 품질 3건)을 한 diff로 끝내고 0.38.0에 싣는다.

## 단계

### B. review 기록 품질 3건 (먼저 — A의 확인 메시지가 이 파서를 쓴다)
- [x] `evidenceWindowStart(meta)`를 `task.mjs`에서 추출·export하고 `collectDoneIssues`가 그것을 쓰게 한다 (동작 동일)
- [x] B-3: `which(name, env, cwd)` 3번째 인자 추가 + `resolveEngine`이 `targetDir`을 넘긴다
- [x] B-2: 공백뿐인 stdout을 exit-code 분기 직후 error 패킷으로 거부 (artifact 템플릿 생성보다 앞)
- [x] B-1: `insertReviewBlock` 순수 함수(fence 인식) + `appendFile` → read/writeText 전환
- [x] 테스트: fence 안 `## Learnings` 미스매치, 첫 헤딩 앞 삽입, 헤딩 없음→append, 빈 출력 거부(파일 부수효과 없음), 상대경로 preflight

### A. migrate --adopt-reviews (followup 3)
- [x] `src/cli-args.mjs`에 `--adopt-reviews` 플래그 등록 (+ `cli-drift` 정합)
- [x] `adoptTaskReviews(ctx)` 구현 — 후보 수집(open + reviews 키 없음), N 계산(공유 파서·공유 창), spec의 verify 선언 반영
- [x] 플래그 없음 → advisory 한 줄 + `false` 반환 / 플래그 있음 → 비용 표 + `confirm(defaultYes:false)`
- [x] `runMigrate` 체인·요약 조건에 편입
- [x] 테스트: 후보 필터, N 계산이 가드와 일치, 플래그 없으면 파일 불변, 거부 시 불변, 채택 후 `reviews: []`

### 문서·릴리스
- [x] `commands/harness-review.md` 5단계 "구 task 호환"에 채택 경로 포인터 추가 (review 부수효과 금지는 유지)
- [x] `commands/harness-task.md` "손으로 고치지 않는다"에 확인 거친 예외 명시
- [x] `commands/harness-migrate.md`(있으면)·README 해당 절 갱신 + `docs/followups.md`에서 3·8번 삭제(번호 유지)
- [x] `what-changes-0.38.0.html` 작성 (0.37.0 소비자 절의 "손으로 넣지 말 것" 계약과의 관계를 명시)
- [x] `npm run test` 전체 통과 확인
- [x] codex 리뷰 3회 실행 (`node bin/harness-team.mjs review codex --scope worktree`) → 발견 판별·조치 → artifact 기록 (3차 APPROVE)
- [x] `harness-team release 0.38.0` (사용자 승인 후) — bump·단일 커밋(c1d1382)·push·태그 v0.38.0 완료

## Ontology 변경 로그
- 2026-09-11 **채택(adopt)**: 구 task의 meta에 빈 `reviews: []`를 넣어 CLI 소유로 넘기는 명시적 1회 조작 — 신설.
- 2026-09-11 **판정 창(evidence window)**: `collectDoneIssues` 내부 인라인 계산 → `evidenceWindowStart(meta)` 공유 함수로 승격.

## 참고
- spec.md의 설계 절이 각 단계의 근거다. 순서가 B → A인 이유: A의 확인 메시지가 B에서 정리한 공유 파서·창을 쓴다.
