# harness-sim — Spec

## 목적 / 요구사항

영속 playground(`../harness-playground`)의 **실제 설치된 하네스 설정**을 3개 프로젝트
(bare-node / next-app / rn-app)에서 에이전트가 굴려보고, **날짜 박힌 사람용 리포트**를 남기는
시뮬레이션 스킬(`skills/harness-sim/SKILL.md`)을 만든다.

검증 3축:
1. **하네스 코어 & 스킬** — doctor green, SSOT 일관성, session-context nudge
2. **새 피처 워크플로우** — task 생성→4종 SSOT→커밋 훅→done-guard→done (더미 변경)
3. **기존 수정 워크플로우** — task→스크래치 수정→커밋 훅→done (더미 변경)

산출물: `harness-playground/sim-reports/harness-sim-<YYYY-MM-DDTHHmm>.md`

## 설계 / 접근

- **포지셔닝**: `tests/e2e/`(휘발성 tmpdir, L1·L2·L3 기계검증)의 재구현이 아니라,
  *설치된 설정의 L4(살아있는 세션) + 리포트*. 판정은 assert 재작성 없이 기존 `--json`
  출력(`doctor --json`, `session-context`)을 호출해 요약.
- **격리**: 프로젝트별 ephemeral 브랜치 `harness-sim/<ts>` → 실행 후 reset + 브랜치 삭제 →
  playground 무오염. 더미 변경은 throwaway `.sim-scratch` 파일(실 src/toolchain 미오염).
- **잔재 reclaim**: 직전 실패로 남은 `sim-*` 브랜치/task 문서/더럽혀진 active.json 청소 후 진행.
- **트리거류 위조 금지**: slash/skill 실세션 해석·SessionStart nudge는 시뮬 중 관찰 불가 →
  PASS 아닌 ⚠️"수동확인" 표기. nudge는 session-context 출력으로 대리 검증(한계 명시).
- **패키징**: dev 전용. `../harness-playground` 부재 시 우아하게 no-op.

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **시뮬레이션(L4)**: 설치된 하네스 설정을 실제로 실행해 워크플로우가 도는지 관찰하는 것.
  기계적 단위 assert(e2e)가 아니라 "한 사이클을 굴려본" 통합 관찰 + 리포트.
- **playground**: 디스크 상주 3개 소비자 프로젝트. 각자 독립 git repo. post-commit 훅 실동작.
- **격리 브랜치**: 시뮬 부산물(커밋·task 문서)을 담는 일회용 git 브랜치. 실행 후 폐기.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — playground 3프로젝트 L4 시뮬 스킬 + 날짜 리포트.
- [x] **Constraint 명확도** (30%) — 더미 변경만, 브랜치 격리, e2e 비중복, dev 전용.
- [x] **Success 기준** (30%) — 3×3 매트릭스 리포트 생성 + 사후 git clean·doctor green.
- [x] **Context 명확도** (brownfield 한정) — playground 구조·doctor --json·skills 글롭 등록 확인.
- [x] **Ambiguity ≤ 0.2** — 가중합 ≥ 0.8

> 게이트 통과: 사용자 AskUserQuestion 3답(대상=playground / 형태=에이전트 스킬 / 깊이=더미)으로
> 모호성 제거. advisor 4점(e2e 포지셔닝·reclaim·트리거 위조금지·패키징) 반영.

## 참고
- `tests/e2e/sandbox.mjs` — 3스택 매트릭스 선례
- `../harness-playground/README.md` — 수동 L4 관찰 포인트 목록
- `templates/.claude/skills/new-feature/SKILL.md` — SKILL.md 포맷 레퍼런스
