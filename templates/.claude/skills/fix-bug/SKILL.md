---
name: fix-bug
description: 버그 수정 task를 생성하고 진단-수정-검증 워크플로우를 시작
disable-model-invocation: true
argument-hint: <bug-name> [증상]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /fix-bug — 버그 수정 task 시작

## 절차

### Phase 1: task 생성 + 진단
1. `$ARGUMENTS`에서 bug name 추출 (kebab-case)
2. ```bash
   harness-team task <name>
   ```
3. `docs/<user>/<name>/<name>-spec.md`에 증상·재현 경로·의심 원인 기록
4. Grep/Glob으로 관련 코드 탐색, 근본 원인 파악

### Phase 2: 수정
1. `docs/<user>/<name>/<name>-plan.md`에 수정 접근 + 체크리스트 작성
2. 최소 surgical fix (관련 없는 리팩토링 금지)
3. 회귀 방지 테스트 작성

### Phase 3: 검증
1. typecheck / lint / test
2. 재현 시나리오로 수동 확인
3. 중요한 수정은 `CLAUDE.md`의 **코드 리뷰 기준** 확인

### Phase 4: 완료
1. git commit → post-commit hook이 handoff 자동 갱신
2. plan 완료 시 `harness-team done` (AskUserQuestion 확인 후)

## 핵심 원칙
- **근본 원인 수정**, 증상만 가리는 패치 금지
- 테스트로 회귀 방지 확실히
- 관련 없는 코드는 건드리지 말 것
