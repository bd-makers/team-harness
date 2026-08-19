---
description: Codex read-only 외부 리뷰를 로컬 git 상태에 실행하고 결과를 활성 task의 artifact ## Reviews에 기록
phase: Workflow
argument-hint: '[--base <ref>] [focus ...]'
---

이 명령은 AGENTS.md 역할표의 공식 호출 방식(`codex exec --sandbox read-only`)으로
Codex 외부 리뷰를 실행한다. openai-codex 플러그인의 `/codex:review`와 같은 역할이지만,
그 커맨드는 `disable-model-invocation`이라 모델이 호출할 수 없으므로 하네스가 직접
절차를 소유한다. 리뷰어(Codex)와 작성자(Claude)의 분리가 이 명령의 존재 이유다.

핵심 제약:

- **review-only.** 이 명령 안에서 발견 사항을 고치지 않는다. 수정은 리뷰 보고 후
  사용자 지시로 별도 진행한다.
- **기록 없는 리뷰는 안 한 것이다** (AGENTS.md 리뷰 프로토콜). 결과는 반드시 활성
  task의 artifact에 남긴다.

Raw slash-command 인수:
`$ARGUMENTS`

인수 해석: `--base <ref>`는 브랜치 리뷰의 기준 ref, 나머지 토큰은 리뷰 focus 문구로
3단계 프롬프트 끝에 그대로 전달한다.

## 실행 절차

1. **Preflight** — `command -v codex`로 CLI 존재를 확인한다. 없으면 설치 명령을
   단정해 안내하지 말고(#17의 404 안내 결함 재발 방지), Codex CLI 설치·인증 상태를
   `codex:setup` 스킬 또는 OpenAI 공식 문서로 확인하도록 안내하고 종료한다.

2. **Scope 결정** — `git status --short`가 dirty면 working tree 전체가 리뷰 대상이다.
   clean이면 base 대비 브랜치 diff를 리뷰한다 — base는 `--base <ref>` 인수가 있으면
   그 값, 없으면 `origin/main`, 그것도 없으면(`git rev-parse --verify origin/main` 실패)
   `main`. diff가 비어 있으면 리뷰할 것이 없다고 보고하고 종료한다.

3. **실행** — 규모가 작으면(대략 파일 1~2개) 포그라운드, 그 외에는 Bash 백그라운드로
   실행한다:

   > **`< /dev/null` 은 생략하지 말 것.** `codex exec` 는 프롬프트를 인자로 받고도 stdin 이
   > 열려 있으면 추가 입력을 기다리며 무한 blocking 된다. 출력 파일에
   > `Reading additional input from stdin...` 한 줄만 남고 CPU 는 거의 0인 채 멈춘다.
   > 백그라운드로 돌리면 수십 분을 통째로 날린다.

   ```bash
   codex exec --sandbox read-only "You are performing an independent read-only code review of this repository.
   Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).
   Do not modify anything. Report findings ranked by severity (P1 blocking / P2 should-fix / P3 nit),
   each with file:line and a one-line rationale, then a final verdict.
   If nothing significant is found, say so explicitly. <focus arguments, if any>" < /dev/null
   ```

4. **발견 검증** — Codex의 지적은 주장이지 사실이 아니다. 각 발견을 코드에서 직접
   재현·대조해 **진짜 결함 / 오탐**을 판별한 뒤 보고한다. 검증 없이 지적을 그대로
   반영하거나 기각하지 않는다.

5. **기록** — 활성 task가 있으면 artifact `## Reviews`에 날짜와 함께 요약·발견·판별
   결과·조치를 append 한다. Gemini 리뷰를 함께 돌리지 못했다면(예: `gemini` CLI 미설치)
   그 사실도 명기한다. 활성 task가 없으면 기록할 곳이 없다는 사실을 사용자에게 보고한다.

6. **보고** — 사용자에게 심각도순 발견 목록과 판별 결과를 전달한다. 수정 제안이
   있으면 제안까지만 하고 멈춘다.

## 예시

```bash
# working tree 리뷰 (uncommitted 변경)
codex exec --sandbox read-only "Review the current working tree changes ..." < /dev/null

# 브랜치 리뷰 (origin/main 대비)
codex exec --sandbox read-only "Review the diff against origin/main ..." < /dev/null
```

적대적 프레이밍(설계 결정·가정에 대한 반박 시도)이 필요하면
`harness-codex-adversarial-review`를 사용한다.
