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
3. `<name>-spec.md`에 초기 요구사항 작성 — spec의 **Ambiguity 자가진단** 5항목을 채점하고, 3개 이상
   미체크면 구현에 들어가지 않는다: `/harness-spec`으로 초안을 만들고 막히면 `/harness-interview`로 돌아간다
   (작은 변경은 생략 가능 — `CLAUDE.md` §1).

### Phase 2: 계획 수립
1. 코드베이스 탐색으로 영향 범위 파악
2. `<name>-plan.md`에 단계별 체크리스트 작성 — 초안은 `superpowers:writing-plans`가 설치돼 있으면
   그것으로 쓰고, 없으면 직접 쓴다. 형식은 `AGENTS.md`의 **plan.md 계약**을 따른다
   (체크박스가 `done` 가드의 입력이다 — 하지 않은 단계를 미리 `- [x]`로 켜지 않는다).

### Phase 3: 구현
1. 단계별로 구현 + `<name>-plan.md` 체크리스트 갱신
2. **수직 슬라이스로 진행한다** — 테스트를 전부 먼저 쓰고 구현을 뒤에 몰아 붙이지 말 것.
   한 seam → 테스트 하나(실패를 먼저 확인) → 그 테스트만 통과시키는 최소 구현 → 반복.
   각 테스트는 tracer bullet이다: 다음 테스트는 미리 상상한 동작이 아니라 직전 사이클이 가르쳐 준
   것에서 고른다. 몰아 쓰면 *상상한* 동작의 모양을 먼저 굳히게 된다.
3. 테스트를 쓸 때는 3형제 중 해당하는 것을 **그 슬라이스만 스코프로 주어** 호출한다 —
   `/harness-unittest file <경로>`(순수 로직) · `/harness-comptest`(컴포넌트·화면) ·
   `/harness-inttest`(프로세스 경계). 인자를 생략하면 `session` 기본값이라 세션 변경분을 통째로
   태워 위 슬라이스 규율과 어긋난다. 뮤테이션 자가점검과 동어반복·mock 반향 게이트가 거기 있다.
4. 재현 가능한 실패는 `<name>-context.md`의 failure capsule에 신호·시도·현재 가설·다음 판별법·
   안전한 source 위치만 압축해 기록한다(최대 3개). raw stderr, 토큰, 비밀값, 전체 HTTP payload는 복사하지 않는다.
   해소 시 capsule을 제거하고 재발 방지 가치가 있으면 artifact의 `## Learnings`에 남긴다.
5. 중요한 변경은 `AGENTS.md`의 **코드 리뷰 기준** 확인

### Phase 4: 완료
1. git commit → post-commit hook이 handoff 자동 갱신
2. plan 완료 시 `harness-team done` (AskUserQuestion 확인 후)

## 주의사항
- 항상 `harness-team task <name>`으로 시작 (수동으로 docs/ 만들지 말 것)
- post-commit hook이 handoff를 자동 갱신하므로 `harness-team handoff`를 손으로 실행할 필요 없음
