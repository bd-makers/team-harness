# agents-md-native — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- PR bd-makers/team-harness#100 merge(`54a0a42`). `docs/decisions.md`·`templates/docs/decisions.md` 에 D10(CLAUDE.md 유지),
  doctor `DECISION_HEADINGS` 에 `## D10`(D9 선례 — 레포↔템플릿 pin·드리프트 가드), eager tier 주석을 2.1.277 기준으로 정정하고
  프로젝트 소계를 실측값(17,476 B, 여유 7,100 B)으로 갱신. 계산 로직 불변.
- 소비자 영향: D10 없는 `docs/decisions.md` 에 doctor warn 1건 → `migrate` 로 해소. 다음 릴리스 노트에 안내한다.
- 착수 경위: "CLAUDE.md 제거 검토" 세션의 인계(사용자 요청). 문서 작성은 격리 worktree 서브에이전트, 검토·반영은 메인 세션.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 2026-09-25 — 외부(codex) 리뷰 생략: 문서·주석과 검사 목록 한 줄. 메인 세션이 서브에이전트 산출물을 대조했다
  (doctor·agent-files 테스트 133/133 재실행, D9 커밋 `86d14a0` 과 변경 형태 비교).

## Learnings
