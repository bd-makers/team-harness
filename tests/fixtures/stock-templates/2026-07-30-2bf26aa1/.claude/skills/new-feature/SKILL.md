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
   - `docs/<user>/<name>/{<name>-spec,<name>-plan,<name>-handoff,<name>-artifact,<name>-context}.md` 생성 + active 설정
3. `<name>-spec.md`에 초기 요구사항 작성

### Phase 2: 계획 수립
1. 코드베이스 탐색으로 영향 범위 파악
2. `<name>-plan.md`에 단계별 체크리스트 작성

### Phase 3: 구현
1. 단계별로 구현 + `<name>-plan.md` 체크리스트 갱신
2. 재현 가능한 실패는 `<name>-context.md`의 failure capsule에 신호·시도·현재 가설·다음 판별법·
   안전한 source 위치만 압축해 기록한다(최대 3개). raw stderr, 토큰, 비밀값, 전체 HTTP payload는 복사하지 않는다.
   해소 시 capsule을 제거하고 재발 방지 가치가 있으면 artifact의 `## Learnings`에 남긴다.
3. 중요한 변경은 `CLAUDE.md`의 **코드 리뷰 기준** 확인

### Phase 4: 완료
1. git commit → post-commit hook이 handoff 자동 갱신
2. plan 완료 시 `harness-team done` (AskUserQuestion 확인 후)

## 주의사항
- 항상 `harness-team task <name>`으로 시작 (수동으로 docs/ 만들지 말 것)
- post-commit hook이 handoff를 자동 갱신하므로 수동 `/handoff` 불필요
