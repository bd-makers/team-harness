# eager-tier-slimming — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


## 2026-09-07 — 이전 결과

### 전후 바이트

| 파일 · 절 | before | after | 차이 |
|---|---:|---:|---:|
| `AGENTS.md` **합계** | 13,215 | **11,453** | −1,762 |
| ├ `### task 단위 관리` | 2,433 | 1,792 | −641 |
| ├ `### task 워크플로우` | 2,106 | 1,655 | −451 |
| ├ `## AI 팀 역할 분담` | 2,042 | 1,697 | −345 |
| └ `### Task Context Card (TCC)` | 1,105 | 780 | −325 |
| `CLAUDE.md` **합계** | 6,112 | **5,784** | −328 |
| └ `### 5-A. 복잡도 게이트` | 1,909 | 1,581 | −328 |
| **프로젝트 eager 소계** | **19,327** | **17,237** | **−2,090** |

상한 17,500 B 대비 여유 **263 B**. doctor 의 24 KiB 합계 기준으로는 이 머신에서
22,211 B 로 여유 **2,365 B** — 작업 전 275 B 에서 8.6배 늘었다.

### 정보 소실 0 대조표

| 옮긴 내용 | 출발 | 도착 | 확인 |
|---|---|---|---|
| meta.json 필드·판정 창 계산 | `### task 단위 관리` | `commands/harness-task.md` `## meta.json과 판정 창` | `grep -c "reopenedAt \|\| firstActivatedAt"` → 1 |
| `firstActivatedAt` 1회 불변식 | 〃 | 〃 | `grep -c "생성 시 1회만"` → 1 |
| 열린 task 재활성화가 meta 미변경 | 〃 | 〃 | `grep -c "열린 task 사이의 평범한 재활성화"` → 1 |
| SessionStart 재개 후보 정본 | 〃 | 〃 (요약은 eager 유지) | `grep -c "SessionStart 재개 후보"` → 1 |
| D5 SSOT 격리 부연 | `## AI 팀 역할 분담` | `docs/decisions.md` D5 | `grep -c "^## D5 "` → 1 |
| D6 루브릭 항목 나열 | 〃 | `docs/decisions.md` D6 | `grep -c "^## D6 "` → 1 |
| D7 제외 대상 목록 | 〃 | `docs/decisions.md` D7 | `grep -c "^## D7 "` → 1 |
| escalation/error 패킷 항목 차이 | `CLAUDE.md` §5-A Why | `src/observation.mjs` `buildErrorPacket` 주석 | 주석 3줄 신규 |

`docs/decisions.md`는 `templates/docs/decisions.md`로 스캐폴드되므로 소비자 프로젝트도 전문을 갖는다 —
Cursor 도달성 제약을 만족한다.

### 학습

- **테스트만 부분 실행하면 계약을 깬다.** T3에서 `agent-files.test.mjs` 하나만 돌리고 커밋했는데,
  같은 파일 안의 다른 세 테스트가 AGENTS.md의 특정 문장을 요구하고 있었다(`node --test <파일>`이
  아니라 `npm test`를 돌렸다면 즉시 잡혔다). 문서 축약은 코드 변경처럼 보이지 않아 검증을 줄이기
  쉬운데, 이 저장소에서는 **문서가 제품**이라 테스트가 문장을 고정한다.
- **"도착지에 있으니 빼도 된다"는 판단은 도달성까지 따져야 참이 된다.** 다이어그램 종결 규칙은
  `commands/harness-task.md`에 분명히 있었지만, Cursor는 그 파일을 읽지 못하면서 plan.md는 편집한다.
  테스트 주석이 그 이유를 이미 적어 두고 있었다 — 지우기 전에 테스트를 읽었어야 했다.
- **정보 소실 0은 도착지를 확인해야 지켜진다.** §5-A에서 뺀 "두 패킷의 항목 차이" 설명은 도착지가
  없어 삭제될 뻔했다. 옮겼다고 기억하는 것과 도착지가 존재하는 것은 다르다.
- **Codex는 `commands/`에 도달한다.** 미러(`skills/*/SKILL.md`)가 `../../commands/<name>.md`를 읽으라고
  지시한다. 이전 상한을 정하는 것은 Codex가 아니라 **Cursor**의 도달 범위다(spec 제약을 T2에서 정정).
