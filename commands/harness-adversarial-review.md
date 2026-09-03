---
description: 설계 결정과 가정에 반박을 시도하는 적대적 read-only 외부 리뷰 — 절차·엔진 표는 harness-review와 동일, 리뷰 프롬프트만 교체
phase: Workflow
argument-hint: '[codex|claude|custom] [--base <ref>] [focus ...]'
---

이 명령은 `harness-review`의 적대적 변형이다. 통상 리뷰가 "결함이 있는가"를 묻는다면,
이 리뷰는 **"이 변경이 거부되어야 할 이유가 있는가"** 를 묻는다 — 구현 접근과
설계 선택 자체에 반박을 시도한다.

Raw slash-command 인수:
`$ARGUMENTS`

인수 해석은 `harness-review.md`와 동일하다 — 첫 토큰이 `codex`·`claude`·`custom`이면
엔진, `--base <ref>`는 기준 ref, 나머지 토큰은 focus 문구로 아래 프롬프트 끝에 전달한다.

## 실행 절차

엔진 결정(probe 폴백 체인 포함)·scope 결정·엔진 runner 표(각 엔진의 호출 형태와 주의사항
전부)·발견 검증·artifact 기록·review-only 제약을 포함한 전체 절차는 `harness-review.md`와
동일하다. 차이는 공용 리뷰 프롬프트뿐이며, 아래로 교체한다:

```text
You are performing an adversarial read-only code review of this repository.
Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).
Do not modify anything. Actively try to find reasons this change should be REJECTED:
challenge the implementation approach and design choices, hunt for hidden assumptions,
missed edge cases, failure paths, concurrency and data-integrity hazards, and security exposure.
For each objection state severity (P1 blocking / P2 should-fix / P3 nit), file:line, and what concrete
scenario breaks. Separate real blockers from theoretical concerns in your verdict.
If the approach survives your objections, say so explicitly. <focus arguments, if any>
```

기록 시 artifact에는 실행 엔진과 함께 **적대적 리뷰**였음을 명기하고,
기계 판독용 마커의 `kind`는 `<engine>-adversarial`(예: `kind=codex-adversarial`)로 남긴다.
마커 형식·나머지 필드는 `harness-review.md` 5단계와 동일하다.

## 언제 이걸 쓰나

- 비자명한 설계 결정·아키텍처 변경·보안 민감 변경의 머지 직전
- `/harness-contrarian`이 spec/plan 층의 가정을 공격한다면, 이 명령은 **구현 diff 층**을
  외부 리뷰어가 공격한다 — 층이 다르므로 서로 대체하지 않는다

작은 버그·문서 수정에는 통상 리뷰(`harness-review`)로 충분하다.
