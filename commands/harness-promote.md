---
description: 활성 task artifact의 Learnings 항목을 사용자 승인 후 .claude/rules/<slug>.md로 승격 — 유래 마커 부착·cursor 미러 재생성
phase: Workflow
argument-hint: '[<n> --name <slug> [--paths <a,b>]]'
---

이 명령은 활성 task `artifact.md`의 `## Learnings` 항목 하나를 `.claude/rules/<slug>.md`로 **기계적으로 복사**한다.
어떤 항목을 올릴지는 **사용자가 고른다** — 이 래퍼는 후보를 보여 주고 승인을 받아 CLI를 호출할 뿐, 스스로 승격 대상을
판단하지 않는다(자동 수정 루프 금지, `AGENTS.md` D6). 승격 로직은 CLI(`harness-team rules promote`)가 소유한다.

승격된 규칙 본문 첫 줄에는 유래 마커 `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`가 붙고,
artifact의 원 항목 끝에는 `(→ rules/<slug>.md, <날짜>)`가 남아 재승격을 막는다. artifact 항목은 지우지 않는다.

## 실행 절차

1. **후보 나열** — `$ARGUMENTS`에 이미 `<n> --name <slug>`가 있으면 3단계로 간다.
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" rules promote
   ```
   - 다른 래퍼와 같이 플러그인의 CLI를 직접 호출한다 — PATH의 전역 `harness-team`은 없거나 다른 버전일 수 있다.
   - `- rules promote: … Learnings 항목 없음`이면 `/harness-retro`로 먼저 기록하라고 안내하고 끝낸다.
   - `✗ rules promote: no-active-task`면 `harness-team task <name>`로 활성화하도록 안내한다.

2. **사용자 확인** — `AskUserQuestion` 한 번으로 (a) 항목 번호 (b) slug(`^[\w.-]+$`, 파일명이 된다) (c) `paths` glob(비우면 항상 로드되어
   eager 계층에 상시 실린다는 점을 알린다)를 확인한다. 질문 설명에 **선택 기준**을 붙인다 — 같은 교정이 3회 이상 반복됐는가 ·
   주관 없이 검사할 수 있는가 · 어기면 재작업이나 위험이 따르는가 · 고치는 법을 한 줄로 설명할 수 있는가. 하나도 해당하지 않으면
   승격하지 않고 artifact에 남겨 둔다. `[promoted → …]` 표시가 있는 항목은 후보에서 뺀다.

3. **실행**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" rules promote <n> --name <slug> --paths "<a,b>"
   ```
   - 성공 시 `✓ rules promote:` · `✓ artifact:` · `✓ cursor mirror:` 세 줄이 나온다.
   - `✗ rules promote: <code>`는 그대로 전달한다. `already-promoted`·`rule-exists`·`invalid-name`은 2단계로 돌아가 다른 항목·이름을 묻는다.
   - `artifact-write-failed`는 방금 쓴 규칙 파일을 되돌린 상태다 — artifact 권한을 확인하고 재실행한다. `⚠️ cursor mirror:` 경고가 나오면
     승격은 완료된 것이며 `harness-team sync`로 미러만 다시 만든다.

4. **결과 표시** — 생성된 `.claude/rules/<slug>.md` 전문과 `git diff --stat`를 보여 준다. 커밋은 사용자 지시 후.

## 예시

```bash
/harness-promote                                   # 후보 나열 → 확인 → 승격
harness-team rules promote                         # 번호 목록만 (read-only)
harness-team rules promote 2 --name api-errors --paths "src/api/**/*.ts"
harness-team rules promote 2 --name api-errors --json
```
