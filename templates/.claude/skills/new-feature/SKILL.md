---
name: new-feature
description: 새 기능 task를 생성하고 구현 워크플로우를 시작
disable-model-invocation: true
argument-hint: <feature-name> [설명]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /new-feature — 새 기능 task 시작

## 전제
이 하네스는 task별로 `docs/<user>/<name>/` 디렉토리를 갖습니다.

## 절차

### Phase 1: task 생성
1. `$ARGUMENTS`에서 feature name 추출 (kebab-case 권장)
2. ```bash
   harness-team task <name>
   ```
   - `docs/<user>/<name>/{<name>-spec,<name>-plan,<name>-handoff}.md` 생성 + active 설정
3. `<name>-spec.md`에 초기 요구사항 작성

### Phase 2: 계획 수립
1. 코드베이스 탐색으로 영향 범위 파악
2. `<name>-plan.md`에 단계별 체크리스트 작성

### Phase 3: 구현
1. 단계별로 구현 + `<name>-plan.md` 체크리스트 갱신
2. 중요한 변경은 `CLAUDE.md`의 **코드 리뷰 기준** 확인

### Phase 4: 완료
1. git commit → post-commit hook이 handoff 자동 갱신
2. plan 완료 시 `harness-team done` (AskUserQuestion 확인 후)

## 주의사항
- 항상 `harness-team task <name>`으로 시작 (수동으로 docs/ 만들지 말 것)
- post-commit hook이 handoff를 자동 갱신하므로 수동 `/handoff` 불필요
