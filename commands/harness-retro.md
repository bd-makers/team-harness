---
description: 현재(또는 지정) task의 artifact.md에 학습/교정 내용을 append. CLAUDE.md 자기개선 루프 정책 실행.
phase: Workflow
argument-hint: '[학습 내용 요약]'
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-06-02
---

이 명령은 활성 task의 `artifact.md`에 날짜가 붙은 **Learnings** 섹션을 기계적으로 append한다.
append 로직은 CLI(`harness-team retro`)가 소유한다 — 이 래퍼는 그것을 orchestrate할 뿐이다.

## 실행 절차

1. **이번 세션에서 교정받거나 학습한 내용이 무엇인지** 사용자에게 한 문장으로 확인한다.
   - 이미 `$ARGUMENTS`로 요약이 전달된 경우 그대로 사용한다.

2. **CLI를 Bash로 실행**해 dated 섹션을 artifact.md에 append한다:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" retro "$ARGUMENTS"
   ```
   - 다른 래퍼와 같이 플러그인의 CLI를 직접 호출한다 — PATH의 전역 `harness-team`은 없거나 다른 버전일 수 있다.
   - `$ARGUMENTS`가 비어 있으면 인수 없이 실행 — 빈 헤더를 생성해 사용자가 직접 채울 수 있게 한다.
   - 성공 시 stdout에 `✓ retro: ...` 줄과 `next:` 힌트가 출력된다.
   - 실패(활성 task 없음) 시 `✗ retro:` 줄을 사용자에게 그대로 전달하고 `harness-team task <name>` 로 활성화하도록 안내한다.

3. **artifact.md를 열어** 방금 추가된 Learnings 섹션 아래에 구체적인 내용을 채운다:
   - 어떤 실수가 있었는가?
   - 올바른 접근법은 무엇인가?
   - 다음에 같은 실수를 방지하는 규칙이 있다면 기록한다.

4. **append된 diff를 사용자에게 보여준다**:
   ```bash
   git diff --no-index /dev/null docs/<user>/<task>/<task>-artifact.md 2>/dev/null | tail -20
   ```
   또는 artifact.md의 마지막 20줄을 출력한다.

## 예시

```bash
# 학습 내용을 인수로 직접 전달
harness-team retro "readActive를 재사용하지 않고 중복 구현했던 실수 수정"

# 인수 없이 — 빈 헤더만 생성, 이후 직접 편집
harness-team retro
```
