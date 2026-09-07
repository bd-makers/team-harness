---
name: new-feature
description: 새 기능 task를 생성하고 구현 워크플로우를 시작
disable-model-invocation: true
argument-hint: <feature-name> [설명]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /new-feature — 새 기능 task 시작

## 전제
이 하네스는 task별로 `docs/<member>/feature/<name>/` 디렉토리를 갖습니다.

## 절차

### Phase 1: task 생성
1. `$ARGUMENTS`에서 feature name 추출 (kebab-case 권장)
2. Bash로 task 생성:
   ```bash
   harness-team task new feature <name>
   ```
   - 이 명령이 `docs/<member>/feature/<name>/{spec,plan,handoff,artifact}.md` 생성 + active 설정
3. `spec.md`에 초기 요구사항 작성 (사용자 설명 기반)

### Phase 2: 계획 수립
1. 코드베이스 탐색으로 영향 범위 파악
2. `plan.md`에 단계별 체크리스트 작성 (`/plan` 참조)

### Phase 3: 구현
1. feature는 `src/features/<name>/` 하위에 co-locate (프로젝트 구조에 맞게)
2. 단계별로 구현 + `plan.md` 체크리스트 갱신
3. 중요한 변경은 `/harness-review`로 Codex+Gemini 리뷰

### Phase 4: 검증 및 마무리
1. typecheck / lint / test
2. `/handoff`로 handoff.md 갱신
3. task 완료 시: `harness-team task done` → artifact.md에 자동 수집

## 주의사항
- 항상 `harness-team task new`로 시작 (수동으로 docs/ 만들지 말 것)
- 세션 종료 전 반드시 `/handoff`
