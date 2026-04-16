---
name: review
description: Codex + Gemini 병렬 리뷰. 중요한 변경(새 기능, 아키텍처, 복잡한 리팩토링, 보안, 스키마/API) 전에 실행
---

# /review — Codex + Gemini 병렬 리뷰

Claude가 메인, Codex/Gemini는 read-only 리뷰어입니다.
사소한 변경(포맷, 문서, deps)에는 생략해도 됩니다.

## 필수 규칙
**Zero-prompt 규칙**: Bash 첫 토큰은 반드시 `gemini` 또는 `codex`여야 합니다
(`settings.json`의 `Bash(gemini:*)` / `Bash(codex:*)` 허용 패턴과 매칭).
파이프·복합 명령·쉘 래퍼 금지 — first-token 매칭이 깨져 수동 승인이 뜹니다.

## 절차

### 1. 리뷰 브리프 작성
다음을 포함:
- **Summary** (1–3 문장)
- **Key design choices**
- **Risk areas**
- **How to view the diff** (리뷰어가 직접 실행할 git 명령)

Diff 명령 예시:
- Unstaged: `git diff -U10`
- Staged: `git diff --cached -U10`
- Branch: `git diff main...HEAD -U10`
- Specific: `git diff -U10 -- path/to/file.ts`
- New untracked: `cat path/to/new_file.ts`

### 2. 병렬 호출 (READ-ONLY)

**Bash timeout: 300000ms.** 절대 commit/push/수정 지시 금지.

**Gemini:**
```shell
gemini --model gemini-3-pro-preview --approval-mode default -p "Review for correctness, best practices, and potential improvements. Do NOT commit, push, or modify any files." <<'REVIEW_EOF'
<review brief including git command to view diff>
REVIEW_EOF
```
- `-p`는 stdin 뒤에 프롬프트를 덧붙임
- `--yolo` 절대 사용 금지 (auto-approve commits)

**Codex:**
```shell
codex exec --model gpt-5.3-codex --sandbox read-only - <<'REVIEW_EOF'
Review for correctness, best practices, and potential improvements. Do NOT commit, push, or modify any files.

<review brief including git command to view diff>
REVIEW_EOF
```

실패 시 최대 2회 재시도(15초 간격).

### 3. 피드백 처리
- 동의하는 항목은 구현
- 이견이 있으면 사용자에게 확인
- 두 리뷰어 모두 재시도 후에도 실패하면 사용자에게 알림
- 리뷰 중 발견한 사전 버그는 관련되고 작으면 inline 수정, 아니면 이슈 생성
- 무언가 안 됐다고 사용자가 말하면, 재시도 전에 가이드 요청
