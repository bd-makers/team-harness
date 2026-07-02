# pocock-merge — Plan

## 목표
Matt Pocock #1(git-guardrails hook) + #2(diagnosing-bugs → fix-bug 보강) 병합. templates/ 범위, 하네스 관례 준수.

## 단계

### #1 git-guardrails hook
- [x] `templates/.claude/hooks/block-dangerous-git.sh` 작성 (파괴적 패턴만, git+subcommand 인접, restore --staged 예외, 한국어 차단 메시지)
- [x] `chmod 700` (기존 hook과 동일 권한)
- [x] `templates/.claude/settings.json` 기존 Bash matcher hooks 배열에 배선 (block 먼저, JSON valid 확인)
- [x] 차단 매트릭스 검증(exit 2): push --force / --force-with-lease / -f / reset --hard / clean -fd·-fdx·--force / checkout .·-- foo·ref -- foo / branch -D x / restore foo
- [x] 허용 매트릭스 검증(exit 0): push / status / commit -m "…reset --hard…" / checkout -b·main·--track / branch -d·my-Data / clean -n·--dry-run / restore --staged / push --follow-tags / non-Bash

### #2 fix-bug 보강
- [x] `templates/.claude/skills/fix-bug/SKILL.md` Phase 1~3에 3가지 방법론 흡수 (병렬 스킬 금지)

### 마무리
- [x] 리뷰 기준(정확성/엣지/회귀/보안/단순성/테스트) 확인 → artifact ## Reviews 기록
- [ ] artifact 결과 기록 → `harness-team done`

## Ontology 변경 로그
- guardrail hook / 파괴적 git 명령 / red 피드백 루프 정의 (spec 반영 완료)

## 참고
- spec.md, 백로그 메모리 `matt-pocock-merge-backlog`
