---
description: 엔진 중립 read-only 외부 리뷰(codex·claude·gemini·custom)를 로컬 git 상태에 실행하고 결과를 활성 task의 artifact ## Reviews에 기록
phase: Workflow
argument-hint: '[codex|claude|gemini|custom] [--base <ref>] [focus ...]'
---

이 명령은 AGENTS.md 리뷰 프로토콜의 실행 절차를 하네스가 직접 소유한다.
리뷰어(별도 프로세스·별도 컨텍스트)와 작성자(현재 세션)의 분리가 이 명령의 존재 이유다.
**엔진과 절차는 직교한다** — 절차(scope 결정 → 실행 → 발견 검증 → 기록 → 보고)는 아래에
한 번만 정의되고, 엔진 차이는 "엔진 runner 표"의 한 줄뿐이다.

핵심 제약:

- **review-only.** 이 명령 안에서 발견 사항을 고치지 않는다. 수정은 리뷰 보고 후
  사용자 지시로 별도 진행한다.
- **기록 없는 리뷰는 안 한 것이다** (AGENTS.md 리뷰 프로토콜). 결과는 반드시 활성
  task의 artifact에 남긴다.

Raw slash-command 인수:
`$ARGUMENTS`

인수 해석: 첫 토큰이 `codex`·`claude`·`gemini`·`custom`이면 엔진으로 소비한다.
`--base <ref>`는 브랜치 리뷰의 기준 ref, 나머지 토큰은 리뷰 focus 문구로
공용 리뷰 프롬프트 끝에 그대로 전달한다.

## 실행 절차

1. **엔진 결정** —
   - 엔진 인자가 있으면 그 엔진을 쓴다. `codex`·`claude`·`gemini`는 `command -v <cli>`로
     존재를 확인하고, 없으면 설치 명령을 단정해 안내하지 말고(#17의 404 안내 결함 재발 방지)
     해당 CLI의 설치·인증 상태를 공식 문서로 확인하도록 안내하고 종료한다.
     `custom`의 preflight는 CLI probe가 아니라 설정이다 — `.harness/reviewers.json`을 읽어
     `custom.command` 키를 확인하고, 그 템플릿의 **첫 토큰**을 `command -v`로 확인한다.
     둘 중 하나라도 없으면 아래 custom 절의 스키마로 안내하고 종료한다.
   - 엔진 인자가 없으면 **probe 폴백 체인**: `command -v`로 **codex → gemini → claude**
     순서로 탐지해 첫 가용 엔진을 쓴다. claude는 Claude Code 환경에서 항상 존재하므로
     이 체인은 어느 머신에서든 리뷰어를 보장한다. vendor 분리 리뷰어(codex·gemini)를
     우선하고, 컨텍스트 분리만 제공하는 claude가 마지막이다(엔진 표의 한계 참조).
     `custom`은 체인에 포함되지 않는다 — 명시 호출 전용이다.

2. **Scope 결정** — `git status --short`가 dirty면 working tree 전체가 리뷰 대상이다.
   clean이면 base 대비 브랜치 diff를 리뷰한다 — base는 `--base <ref>` 인수가 있으면
   그 값, 없으면 `origin/main`, 그것도 없으면(`git rev-parse --verify origin/main` 실패)
   `main`. diff가 비어 있으면 리뷰할 것이 없다고 보고하고 종료한다.

3. **실행** — 아래 "엔진 runner 표"의 해당 행으로 공용 리뷰 프롬프트를 실행한다.
   규모가 작으면(대략 파일 1~2개) 포그라운드, 그 외에는 Bash 백그라운드로 실행한다.

   공용 리뷰 프롬프트 (엔진 무관 — `<...>`만 채운다):

   ```text
   You are performing an independent read-only code review of this repository.
   Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).
   Do not modify anything. Report findings ranked by severity (P1 blocking / P2 should-fix / P3 nit),
   each with file:line and a one-line rationale, then a final verdict.
   If nothing significant is found, say so explicitly. <focus arguments, if any>
   ```

4. **발견 검증** — 리뷰어의 지적은 주장이지 사실이 아니다. 각 발견을 코드에서 직접
   재현·대조해 **진짜 결함 / 오탐**을 판별한 뒤 보고한다. 검증 없이 지적을 그대로
   반영하거나 기각하지 않는다.

5. **기록** — 활성 task가 있으면 artifact `## Reviews`에 날짜·**실행 엔진**과 함께
   요약·발견·판별 결과·조치를 append 한다. 폴백 체인으로 엔진이 내려갔다면(예: codex
   미설치로 gemini 실행) 건너뛴 엔진과 사유도 명기한다. 활성 task가 없으면 기록할
   곳이 없다는 사실을 사용자에게 보고한다.

6. **보고** — 사용자에게 실행 엔진, 심각도순 발견 목록과 판별 결과를 전달한다.
   수정 제안이 있으면 제안까지만 하고 멈춘다.

## 엔진 runner 표

### codex

```bash
codex exec --sandbox read-only "<공용 리뷰 프롬프트>" < /dev/null
```

> **`< /dev/null` 은 생략하지 말 것.** `codex exec` 는 프롬프트를 인자로 받고도 stdin 이
> 열려 있으면 추가 입력을 기다리며 무한 blocking 된다. 출력 파일에
> `Reading additional input from stdin...` 한 줄만 남고 CPU 는 거의 0인 채 멈춘다.
> 백그라운드로 돌리면 수십 분을 통째로 날린다.

### gemini

```bash
gemini --approval-mode default -p "<공용 리뷰 프롬프트>"
```

AGENTS.md 역할표의 공식 호출 방식. `gemini` CLI가 없는 머신이 있다 — preflight에서
걸러지고, 명시 호출이었다면 안내 후 종료한다.

### claude

```bash
claude -p --permission-mode plan "<공용 리뷰 프롬프트>"
```

`plan` 모드가 read-only를 강제한다 — 쓰기 도구는 차단되고 read-only git 명령은
프롬프트 없이 실행되며, 부모 세션의 인증을 상속한다 (2026-08-21 실측 검증).

> **한계 명시:** claude 엔진은 **컨텍스트 분리만** 제공한다 — 작성 세션의 sunk-cost
> 편향은 제거되지만, 같은 모델의 맹점은 공유한다(vendor 분리 없음). codex·gemini를
> 쓸 수 없는 환경(claude-only 팀원)의 경로이며, probe 폴백 체인에서 마지막인 이유다.

### custom

`.harness/reviewers.json`(커밋 가능한 팀 공유 설정 — `active.json`·`config.json`과 달리
gitignore 대상이 아니다)에서 커맨드 템플릿을 읽어 `{prompt}`를 공용 리뷰 프롬프트로
치환해 실행한다:

```json
{
  "custom": {
    "command": "mycli review --readonly {prompt}"
  }
}
```

**치환 계약**: `{prompt}`는 **POSIX 단일 인용 리터럴 하나**로 치환한다 — 프롬프트 전체를
`'...'`로 감싸고 내부의 `'`는 `'\''`로 이스케이프한다. focus 문구에 셸 문법이 섞여 있어도
명령이 아닌 **데이터**로 전달되어야 한다(다른 엔진들이 프롬프트를 단일 인용 인자로 받는
것과 같은 계약). 치환 결과 외의 문자열을 템플릿에 추가·해석하지 않는다.

파일 또는 `custom.command` 키가 없으면 **실패시키지 말고** 위 스키마로 설정하도록
안내하고 종료한다. 커스텀 리뷰어도 read-only여야 한다 — 쓰기 가능한 커맨드를
등록하는 것은 사용자 책임이지만, 안내 시 read-only 요건을 명시한다.

## 예시

```bash
# 엔진 자동 (probe 체인: codex → gemini → claude)
/harness-review

# claude-only 머신에서 명시 호출, origin/develop 대비 브랜치 리뷰
/harness-review claude --base origin/develop

# codex로 보안 focus 리뷰
/harness-review codex security and input validation
```

적대적 프레이밍(설계 결정·가정에 대한 반박 시도)이 필요하면
`harness-adversarial-review`를 사용한다 — 엔진 표와 절차는 이 문서를 그대로 쓰고
리뷰 프롬프트만 교체된다.
