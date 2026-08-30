# claude5-context-apply — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-08-30: 다이어그램 옵트인 질문 생략(비대화형 세션·사용자 배치 지시) — 미채택.
- 2026-08-30: 검토 아티팩트 페이지 발행 — https://claude.ai/code/artifact/b7464a8f-a9a1-49cb-b532-190b5971c16a

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-08-30 — codex (probe 체인 1순위, worktree scope)

- 실행: `codex exec --sandbox read-only` 2회. 1차는 codex 자체 review 스킬이 모드 선택
  질문(bugbot/security)으로 멈춰 발견 없이 종료 → 비대화형·bugbot 프레이밍을 프롬프트에
  명시해 재실행(폴백 아님 — 같은 엔진 재시도).
- 발견 및 판별 (2건 모두 코드 대조로 **확정**, 오탐 없음):
  - **P2** `src/commands/session-context.mjs` — `listIncompleteTasks`의 `stat(planPath)`가
    try/catch 밖이라 스캔 중 task 이동·삭제 시 예외 전파(훅 `|| true`로 세션은 유지되나
    주입 전체 유실). **조치**: readFile·stat을 같은 try로 묶어 해당 task만 건너뛰도록 수정.
  - **P3** 동률 tie-break가 `name`만 비교 — 사용자 간 동명 task 순서가 readdir 열거 순서
    의존. **조치**: user→name 오름차순으로 확장 + 교차 사용자 동률 테스트 추가.
- 반영 후 전체 스위트 463 pass / 1 skip(기존) / 0 fail. 최종 판정 should-fix 2건 모두 반영 완료.

<!-- harness:review kind=codex scope=worktree tip=1702207feb90fdf5bfca9ab0b6f82e76b3ff1bbf at=2026-08-30T01:25:00Z -->


## Learnings


## Learnings (2026-08-30)

- codex exec 외부 리뷰가 codex 자체 review 스킬의 모드 선택 질문으로 무발견 종료할 수 있다 — 비대화형 실행에는 '질문 금지·기본(bugbot) 프레이밍' 문구를 프롬프트에 명시할 것.
