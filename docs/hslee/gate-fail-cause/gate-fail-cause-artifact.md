# gate-fail-cause — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
2026-11-04 — 커밋 게이트 명령이 실패하고 lockfile의 설치 흔적이 없으면 차단 메시지 끝에 한 줄을 붙인다:
`ℹ️ 환경 원인일 수 있습니다 — <lockfile>은 있는데 설치 흔적(<trace>)이 없습니다. 코드를 고치기 전에 \`<bootstrap>\`로 준비하세요.`
차단·exit 2는 그대로이고, 판정은 `stack`과 같은 `detectInstallTrace`다. 출처: task `subsystem-audit` 후보 C.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 아직 없음 — R3 리뷰는 PR 전에.

## Learnings
- 실패 순간에 필요한 안내는 실패 메시지에 둔다 — lazy 스킬에 있는 안내는 훅이 막는 순간 로드되지 않는다.
