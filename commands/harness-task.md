---
description: "task 관리 (task/list/done/handoff) — docs/<user>/<name>/ 구조"
phase: Workflow
argument-hint: '<name> | list | done [--force] | handoff'
tags:
  - project
  - ai
  - obsidian
created: 2026-05-15
modified: 2026-05-15
---

`$ARGUMENTS`의 **첫 토큰**으로 분기한다. `list`·`done`·`handoff`는 `task`의 인자가 아니라 **별개 하위명령**이다 —
`task done`으로 넘기면 이름 규칙(`^[\w.-]+$`)을 통과해 "done"이라는 task가 생성·활성화된다.

```bash
# 첫 토큰이 list | done | handoff → task 없이 그 하위명령을 그대로 실행
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" list
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" done [--force]
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" handoff

# 그 외 → task 생성 또는 활성화
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" task <name>
```

예시:
- `harness-team task auth-redesign`   # 생성 또는 활성화
- `harness-team list`                 # 전체 task 목록
- `harness-team done`                 # 활성 task 완료 처리 (meta 상태만 — 원장은 `summary --write`)

## spec/plan 다이어그램 옵트인

`task` 출력이 `created:`(신규 생성)일 때만 아래를 **1회** 수행한다. `activated:`(기존 task
재활성화)면 **묻지 않는다** — 계획에 없는 단계를 다시 묻는 것은 계획을 무시하는 것이다.
`reopened:`(완료가 만료된 재개 — meta의 `status`가 `done`→`open`으로 돌아간 경우)도 같다:
옵트인 상태는 plan.md에 그 단계가 있는지로 이미 남아 있고, 재개는 그 계획을 이어받는 것이지
새로 세우는 것이 아니다.

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
   소유가 아니라 별도로 설치되는 외부 플러그인이며 머신마다 설치 상태가 다르다. 사용 가능한지
   먼저 확인하고, 없으면 설치 명령을 단정해 안내하지 말고(`harness-review` 엔진 결정과 같은
   계약) 다이어그램 단계를 건너뛴다. **도구가 없다고 task를 실패시키지 않는다.**

   건너뛸 때 plan의 그 단계는 **지우지 말고** 사유를 붙여 닫는다:

   ```markdown
   - [x] spec/plan 다이어그램 — 미실행(도구 없음)
   ```

   지우면 옵트인했다는 사실 자체가 사라지고, `- [ ]`로 열어 두면 `harness-team done` 가드가
   "plan.md에 미완 체크박스가 남아 있음"으로 완료를 막는다.

5. **산출물** — `docs/<user>/<name>/<name>-diagram.html`. 자립형 **inline SVG**로 쓴다 —
   `docs/`는 Obsidian 볼트에서 열리고 Obsidian은 script를 제거하므로 mermaid 같은 런타임 JS
   다이어그램은 볼트에서 렌더되지 않는다. 이 파일은 `<name>-meta.json`과 마찬가지로 SSOT 4파일이
   아니다.

6. **기록** — 만들었으면 `<name>-artifact.md`에 산출물 경로를, 도구가 없어 건너뛰었으면
   "다이어그램 미실행 — 도구 없음"을 날짜와 함께 한 줄 남긴다. 기록하지 않으면 나중에
   "묻지 않은 것"과 "묻고 건너뛴 것"을 구분할 수 없다.

7. **실행은 `/harness-diagram`이 담당한다** — 위 4~6번(probe·degrade·산출물·기록)을 실제로 수행하는
   어댑터가 `commands/harness-diagram.md`다. task 생성 시점 이후 아무 때나 다시 실행해 산출물을
   갱신할 수 있다. 이 문서는 **옵트인 계약**의 정본이고, 그 계약을 실행하는 절차는 그쪽에 있다.

## `<name>-meta.json`과 판정 창

`<name>-meta.json`은 harness가 소유하는 **기계 상태**다(`created`·`firstActivatedAt`·`status`·
`closedAt`·`reopenedAt`). SSOT 4파일에 포함되지 않으며 **손으로 고치지 않는다** — `done` 가드가
증거를 찾는 판정 창의 시작점이 여기서 정해지기 때문이다.

- **판정 창 = `reopenedAt || firstActivatedAt`** (처음 유효한 값). 창을 통째로 버리면 마커 신선도·
  커밋·테스트 시각 가드가 전부 꺼지는 fail-open이 된다.
- **`firstActivatedAt`은 생성 시 1회만** 기록되고 재활성화가 밀지 않는다. 이 값과 `switchedAt`이
  갈라지는 순간이 done 가드 오탐의 원인이었다.

### 완료 상태의 만료

완료는 시간이 아니라 **전이**로 만료된다. `done`된 task를 `harness-team task <name>`으로 다시
활성화하면 그 완료가 무효가 되어 `status`가 `open`으로 돌아가고 `closedAt`이 풀리며, 그 시각이
`reopenedAt`에 남아 **새 판정 창의 시작**이 된다. 출력도 `activated:`가 아니라 `reopened:`다.
새 라운드의 완료는 새 증거로 판정해야 하기 때문이다.

- **열린 task 사이의 평범한 재활성화는 meta를 건드리지 않는다** — 거기까지 쓰면 판정 창이 흔들린다.
- **`status`가 `done`인 task는 SessionStart 재개 후보에서 빠진다.** 후보 판정의 정본은 plan의
  체크박스가 아니라 이 값이다 — 열린 체크박스만 보던 탓에 `done --force`로 닫은 task가 영구히
  후보로 떴다.
- `meta.json`이 없는 구 task는 원장·handoff에서 추론한 값을 굳혀 만료시키되, 알 수 없는
  `firstActivatedAt`은 지어내지 않는다(구 task는 시각 가드를 건너뛴다).
