---
description: task 관리 (task/list/done/handoff) — docs/<user>/<name>/ 구조
phase: Workflow
argument-hint: <name> | list | done
tags:
  - project
  - ai
  - obsidian
created: 2026-05-15
modified: 2026-05-15
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" task $ARGUMENTS
```

예시:
- `harness-team task auth-redesign`   # 생성 또는 활성화
- `harness-team list`                 # 전체 task 목록
- `harness-team done`                 # 활성 task 완료 처리

## spec/plan 다이어그램 옵트인

`task` 출력이 `created:`(신규 생성)일 때만 아래를 **1회** 수행한다. `activated:`(기존 task
재활성화)면 **묻지 않는다** — 계획에 없는 단계를 다시 묻는 것은 계획을 무시하는 것이다.

1. **질문** — `AskUserQuestion`으로 한 번만 묻는다: 이 task의 spec/plan 단계에서 다이어그램을
   함께 만들까? 사용자가 건너뛰면 그대로 진행한다. 다시 묻지 않는다.

2. **"예" → plan에 단계 추가** — `<name>-plan.md`의 `## 단계`에 체크박스를 더한다:

   ```markdown
   - [ ] spec/plan 다이어그램 작성 → docs/<user>/<name>/<name>-diagram.html
   ```

   이것이 옵트인의 전부다. 전용 설정 키·상태 파일·doctor 체크를 만들지 않는다 —
   **plan.md가 곧 상태다**(AGENTS.md 세션 시작 프로토콜 2번이 반드시 읽는 파일).

3. **"아니오" → 아무것도 하지 않는다** — plan.md에 그 단계가 없다는 사실이 옵트아웃 상태다.

4. **Preflight(만들 때)** — 다이어그램 스킬(`/diagram-design:diagram-design` 등)은 이 플러그인
   소유가 아니라 별도로 설치되는 Claude 전용 도구이며 머신마다 설치 상태가 다르다. 사용 가능한지
   먼저 확인하고, 없으면 설치 명령을 단정해 안내하지 말고(`harness-codex-review` Preflight와 같은
   계약) 다이어그램 단계를 건너뛴다. **도구가 없다고 task를 실패시키지 않는다.**

5. **산출물** — `docs/<user>/<name>/<name>-diagram.html`. 자립형 **inline SVG**로 쓴다 —
   `docs/`는 Obsidian 볼트에서 열리고 Obsidian은 script를 제거하므로 mermaid 같은 런타임 JS
   다이어그램은 볼트에서 렌더되지 않는다. 이 파일은 `<name>-meta.json`과 마찬가지로 SSOT 4파일이
   아니다.

6. **기록** — 만들었으면 `<name>-artifact.md`에 산출물 경로를, 도구가 없어 건너뛰었으면
   "다이어그램 미실행 — 도구 없음"을 날짜와 함께 한 줄 남긴다. 기록하지 않으면 나중에
   "묻지 않은 것"과 "묻고 건너뛴 것"을 구분할 수 없다.
