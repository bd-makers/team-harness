---
tags:
  - project
  - ai
  - obsidian
created: 2026-04-14
modified: 2026-06-10
---

# docs/ — 팀원·task별 작업 문서

모든 작업 문서는 `docs/<user>/<name>/` 구조로 관리됩니다.
task별 디렉토리 하나에 SSOT 4개 파일과 비-SSOT Context Card 1개가 들어가며,
파일명은 `<name>-` 접두를 붙입니다.

```
docs/
├── task_summary.md                   # 전체 task 요약 표 (모든 사용자)
└── <user>/                           # git config user.name 또는 $USER
    ├── <user>-handoff.md             # 세션 시작 진입점 (현재 active task)
    ├── <user>-task.md                # 이 사용자의 task 인덱스 (Active / Completed)
    └── <name>/                       # task 디렉토리
        ├── <name>-spec.md            # 요구사항 / 설계 (사람이 먼저 작성)
        ├── <name>-plan.md            # 단계별 체크리스트
        ├── <name>-handoff.md         # 세션 인수인계 (post-commit hook 자동 갱신)
        ├── <name>-artifact.md        # 실행 결과 / 학습 (task done·retro 시 append)
        └── <name>-context.md         # Context Card — 현재 working set (비-SSOT)
```

## 사용법

```bash
harness-team task <name>      # task 생성 + active 전환 (이미 있으면 활성화만)
harness-team list             # 전체 task 목록
harness-team done             # 활성 task 완료 처리 (artifact.md에 git log/diff 수집)
harness-team retro "<메모>"    # 활성 task artifact.md에 학습/교정 내용 append
harness-team context init     # 활성 task의 Context Card 생성 (없을 때만)
harness-team context check    # 활성 task의 Context Card 검사 (수정하지 않음)
```

활성 task의 정보는 `.harness/active.json`에 저장됩니다.

## 규약

- **`<name>-spec.md`**: 왜/무엇을. 사람이 먼저 작성 후 AI가 참고.
  Ambiguity 자가진단(4항목)과 Ontology 섹션을 포함 — 진입 게이트의 입력이 된다.
- **`<name>-plan.md`**: 어떻게. 세션 시작/종료마다 체크리스트(`- [ ]` → `- [x]`)를 갱신.
- **`<name>-handoff.md`**: 세션 간 인수인계 메모. commit 시 post-commit hook이 자동 갱신.
- **`<name>-artifact.md`**: 완료 후 남는 증거. `task done` 시 git diff/log/test 결과가,
  `retro` 시 학습/교정 내용이 append 된다.
- **`<name>-context.md`**: 위 네 파일에서 파생된 현재 working set. **SSOT 아님** — 여기에만 있는
  요구사항·결정·학습은 없어야 한다. 예산·유지 규칙·failure capsule 규약은 `AGENTS.md`의
  **Task Context Card (TCC)** 섹션이 정본이다.
