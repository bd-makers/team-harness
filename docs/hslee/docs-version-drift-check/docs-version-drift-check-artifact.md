# docs-version-drift-check — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-27T13:51:44.900Z — codex (harness-team review)

- engine: codex · scope: diff · tip: f607e7e09e043e1feffeffea0db1135d1e20b0d4 · exit 0 · 1446 B

```text
전하, **P2 발견 3건입니다.** `origin/main` 대비 diff를 읽기 전용으로 검토했고, `docs:check`의 기존 CI 연결 위치는 적절하며 현재 실행도 통과했습니다.

- **P2** [scripts/docs-version-drift.mjs:46](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-8/scripts/docs-version-drift.mjs:46) — `<span class="tag tag-purple" aria-label="version">`처럼 속성이 하나 추가되면 버전 표지를 인식하지 못해 새 현행 문서가 `unversioned`로 빠집니다.
- **P2** [scripts/docs-version-drift.mjs:50](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-8/scripts/docs-version-drift.mjs:50) — footer의 임의 버전도 표지로 취급해 `Requires React 19.0.0`인 무버전 문서를 `current`로 오분류합니다.
- **P2** [scripts/docs-version-drift.mjs:62](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-8/scripts/docs-version-drift.mjs:62) — 첫 정규식 매치만 검사하므로 주석의 현행 hero 표지나 앞선 빠른 링크가 실제 낡은 표지를 가려도 통과합니다.

**판정: should-fix.** 위 세 경우는 메모리 내 입력으로 재현했습니다. `npm run docs:check`와 쓰기가 필요 없는 신규 테스트 5개는 통과했으며, 전체 테스트는 실행하지 않았습니다. 파일은 변경하지 않았습니다.
```

<!-- harness:review kind=codex scope=diff tip=f607e7e09e043e1feffeffea0db1135d1e20b0d4 at=2026-09-27T13:51:44.900Z -->

판별·조치 (작성 세션):
- P2-1 속성이 더 붙은 hero 태그 미인식 → **진짜 결함**(현행 문서가 unversioned로 조용히 빠짐 = 미탐). 태그 정규식을 속성 순서·추가 속성에 무관하게 고쳤고 분류 테스트에 케이스 추가.
- P2-2 footer 속 타 제품 버전을 current로 오분류 → **오탐이지만 의도로 유지.** 실패가 시끄러운 방향이라 사람이 등록·제외·"기준" 라벨을 고르게 된다. 표지 형식이 문서마다 달라(`v0.44.2`·`Plugin 0.23.0`·`plugin · 0.20.0`) 좁히면 미탐이 생긴다. 머리 주석에 명시.
- P2-3 첫 매치만 검사 → **부분 수용.** HTML 주석이 표지를 가리는 경우는 분류·판정 전에 주석을 지워 고쳤다(테스트 추가). 첫 매치 규칙 자체는 유지 — 🆕 배너는 옛 배너가 뒤에 오는 게 정상이고, index 목록도 첫 항목이 최신이라는 게 계약이다.

## Learnings
