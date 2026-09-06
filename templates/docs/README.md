---
tags:
  - project
  - ai
  - obsidian
created: 2026-04-14
modified: 2026-09-06
---

# docs/ — 팀원·task별 작업 문서

모든 작업 문서는 `docs/<user>/<name>/` 구조로 관리됩니다.
task별 디렉토리 하나에 SSOT 4개 파일과 비-SSOT Context Card 1개가 들어가며,
파일명은 `<name>-` 접두를 붙입니다.

```
docs/
├── task_summary.md                   # 전체 task 요약 표 — 생성물 (harness-team summary)
└── <user>/                           # git config user.name 또는 $USER
    ├── <user>-handoff.md             # 세션 시작 진입점 (현재 active task)
    ├── <user>-task.md                # 이 사용자의 task 인덱스 — 생성물 (harness-team summary)
    └── <name>/                       # task 디렉토리
        ├── <name>-spec.md            # 요구사항 / 설계 (사람이 먼저 작성)
        ├── <name>-plan.md            # 단계별 체크리스트
        ├── <name>-handoff.md         # 세션 인수인계 (post-commit hook 자동 갱신)
        ├── <name>-artifact.md        # 실행 결과 / 학습 (task done·retro 시 append)
        ├── <name>-context.md         # Context Card — 현재 working set (비-SSOT)
        ├── <name>-diagram.html       # spec/plan 다이어그램 — 옵트인 산출물 (비-SSOT, 없을 수 있음)
        └── <name>-meta.json          # created / status — harness 내부 상태 (기계 소유)
```

## 사용법

```bash
harness-team task <name>      # task 생성 + active 전환 (이미 있으면 활성화만)
harness-team list             # 전체 task 목록
harness-team summary          # 원장을 task 디렉터리에서 렌더해 출력 (읽기 전용)
harness-team summary --write  # 원장 파일 갱신 — 기본 브랜치에서만
harness-team summary --check  # 원장이 최신인지 검사 (mutation 없음, CI용)
harness-team done             # 활성 task 완료 처리 (artifact.md에 git log/diff 수집)
harness-team retro "<메모>"    # 활성 task artifact.md에 학습/교정 내용 append
harness-team context init     # 활성 task의 Context Card 생성 (없을 때만)
harness-team context check    # 활성 task의 Context Card 검사 (수정하지 않음)
```

활성 task의 정보는 `.harness/active.json`에 저장됩니다.

## 원장은 생성물입니다

`docs/task_summary.md`와 `docs/<user>/<user>-task.md`는 **여러 task가 공유하는 집계 파일**입니다.
예전에는 `task`/`done`이 이 두 파일을 직접 고쳤는데, 새 행이 항상 같은 위치(파일 끝, 헤더 바로 아래)에
들어가므로 **브랜치를 병렬로 두면 반드시 머지 충돌**이 났습니다.

이제 `task`/`done`은 자기 task 디렉터리의 `<name>-meta.json`만 쓰고 원장은 건드리지 않습니다.
원장은 `harness-team summary`가 task 디렉터리를 스캔해 렌더링합니다.

- 브랜치에서는 원장을 갱신하지 않습니다 — `--write`는 기본 브랜치에서만 동작합니다.
- 렌더는 결정론적입니다(요약표는 created 오름차순, 사용자 인덱스는 최신순).
- CI에서 `harness-team summary --check`로 원장이 낡았는지 검사할 수 있습니다.

## 규약

- **`<name>-spec.md`**: 왜/무엇을. 사람이 먼저 작성 후 AI가 참고.
  Ambiguity 자가진단(4항목)과 Ontology 섹션을 포함 — 진입 게이트의 입력이 된다.
  목적 절은 문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
  답 없는 질문은 `## 참고` 절에 `- (open) …`으로 남기고, 게이트 통과 전에 답하거나 `(open → <대상>)`으로 이월한다.
- **`<name>-plan.md`**: 어떻게. 세션 시작/종료마다 체크리스트(`- [ ]` → `- [x]`)를 갱신.
- **`<name>-handoff.md`**: 세션 간 인수인계 메모. commit 시 post-commit hook이 자동 갱신.
- **`<name>-artifact.md`**: 완료 후 남는 증거. `task done` 시 git diff/log/test 결과가,
  `retro` 시 학습/교정 내용이 append 된다.
- **`<name>-context.md`**: 위 네 파일에서 파생된 현재 working set. **SSOT 아님** — 여기에만 있는
  요구사항·결정·학습은 없어야 한다. 예산·유지 규칙·failure capsule 규약은 `AGENTS.md`의
  **Task Context Card (TCC)** 섹션이 정본이다.
- **`<name>-diagram.html`**: spec/plan 단계 다이어그램. **옵트인이라 없는 task가 정상이다** —
  신규 task 생성 시 1회 묻고 "예"일 때만 `<name>-plan.md`에 그 단계가 생긴다(설정 키가 아니라
  plan.md가 상태다). **SSOT 아님.** 자립형 inline SVG로 쓴다 — Obsidian이 script를 제거하므로
  런타임 JS 다이어그램은 볼트에서 렌더되지 않는다.
