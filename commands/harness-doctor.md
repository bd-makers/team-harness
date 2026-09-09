---
description: 하네스 무결성 점검 (파일, hooks, CLI PATH)
phase: Validation
tags:
  - project
  - ai
  - obsidian
created: 2026-04-28
modified: 2026-09-10
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" doctor
```

**dangling 훅 참조 / 판정 불가**

`.claude/settings.json`이 배선한 훅 중 **프로젝트 내부 경로**를 가리키는 것 — 상대경로(`./.claude/hooks/x.sh`)와
`${CLAUDE_PROJECT_DIR}` 접두 경로 — 는 파일 존재를 검사해 없으면 ⚠️로 보고한다. 전역 CLI 호출
(`harness-team session-context 2>/dev/null || true`)은 하네스가 `|| true`로 스스로 부재를 허용하므로 검사하지 않는다.
어느 모양에도 해당하지 않는 `command`는 **침묵하지 않고 `판정 불가`로 보고한다** — "경고 0"이 "문제 없음"이 아니라
"검사한 범위 안에서는 문제 없음"을 뜻하게 되는 것을 막기 위해서다. 이 검사도 warn 수준이라 exit code는 바뀌지 않는다.

**observe 트립와이어 경고**

관측 로그(`.harness/observability/`)의 트립와이어가 발화한 상태면 `observe trip wires` 경고 1건을 낸다 — wire id·수치·
`harness-team observe` 안내·루프백 nudge. warn 수준이라 exit code에 영향이 없고(임계값이 실사용 보정 전이라 오탐이 CI를
깨면 안 된다), task를 자동 생성하지 않는다. 로그가 없거나 발화가 없으면 항목 자체가 없다. 판정 정본은 `/harness-observe`.

**CLAUDE.md 커스텀 내용 점검**

doctor 실행 결과와 함께, 현재 디렉토리의 `CLAUDE.md`를 읽어 하네스 마커(`<!-- harness:section -->`, `<!-- harness:user -->`) 외부에 커스텀 내용이 있는지 확인하고 결과를 보고하세요:

- ✅ **반영됨** — CLAUDE.md가 없거나, 모든 내용이 하네스 마커 내부에 있음
- ⚠️ **미반영 내용 있음** — 하네스 마커 외부에 커스텀 내용이 있음 (`/harness-init`으로 `<!-- harness:user -->` 섹션에 이전 가능)
