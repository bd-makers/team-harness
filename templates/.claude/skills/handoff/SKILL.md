---
name: handoff
description: 활성 task의 handoff.md를 갱신하고 세션을 마무리
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash
---

# /handoff — 세션 종료 인수인계

## 전제
활성 task 경로는 `.harness/active.json`에서 읽습니다.
작업 문서: `docs/<member>/<feature|fix>/<name>/handoff.md`

## 절차
1. `.harness/active.json`에서 활성 task 확인
2. `git status`, `git diff --stat` 확인
3. 검증 실행 (프로젝트 명령에 맞게): typecheck / lint / test
4. 활성 task의 `handoff.md`를 갱신

## handoff.md 형식
```markdown
# Handoff

## 마지막 세션 요약
(1-3줄)

## 변경된 파일
- path/to/file.ts

## 검증 상태
- [x] typecheck
- [x] lint
- [ ] test (실패 항목 요약)

## 막힌 점 / 의사결정 필요
(없으면 "없음")

## 다음 단계
1. (우선순위 순)
```

## 핵심 원칙
- handoff.md는 **다음 세션이 이 파일만 읽고 이어서 작업할 수 있어야** 한다
- 변경 파일, 검증 상태, 막힌 점을 정확히 기록
- task가 완료되면 `harness-team task done`으로 artifact.md에 자동 수집
