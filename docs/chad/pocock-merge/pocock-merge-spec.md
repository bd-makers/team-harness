# pocock-merge — Spec

## 목적 / 요구사항
Matt Pocock skills(github.com/mattpocock/skills) 2개를 팀 하네스에 병합한다 (분석·결정은 백로그 메모리 `matt-pocock-merge-backlog`에서 완료, 구현만).

- **#1 git-guardrails** → 새 hook `templates/.claude/hooks/block-dangerous-git.sh`. 파괴적 git 명령을 PreToolUse(Bash)에서 차단. `templates/.claude/settings.json` 기존 Bash matcher에 배선.
- **#2 diagnosing-bugs** → 기존 `templates/.claude/skills/fix-bug/SKILL.md` 방법론 보강 (병렬 신규 스킬 금지, 기존 Phase 1~3에 흡수).

## 설계 / 접근

### #1 block-dangerous-git.sh
Matt 스크립트를 **그대로 쓰지 않는다** — 우리 하네스 정책·관례에 맞춰 재작성:

- **모든 push 차단(Matt) ❌ → 파괴적 명령만 차단 ✅.** 이 하네스는 "사용자 요청 시 push"가 승인된 워크플로우이므로 block-all-push는 하네스 자체 설계와 모순. 백로그의 "파괴적 한정" 결정이 SSOT.
- **오탐 최소화:** 모든 패턴은 `git`+subcommand **인접**을 요구(`git[[:space:]]+push …`). bare 패턴(`reset --hard` 단독)은 버림. (커밋 메시지에 `git reset --hard`처럼 subcommand까지 통째로 들어간 경우는 잔여 오탐 — 이 hook은 shell 파서가 아닌 substring 휴리스틱임을 명시.)
- **차단 대상:** force push(`--force`/`--force-with-lease`/`-f`), `reset --hard`, `clean -f`(조합 `-fd`/`-fdx` 포함), `branch -D`(플래그 경계 요구), `checkout .` / `checkout -- <file>`, `restore <file>`(워킹트리).
- **허용(오탐 회귀 방지):** `git push`, `git checkout -b`, `git branch -d`(소문자), `git clean -n`, `git restore --staged`, 커밋 메시지 등.
- **관례 통일:** protect-files/pre-commit-check 스타일 — `jq -r '… // empty'`, `TOOL_NAME != Bash` 방어 exit 0, 차단 메시지는 **한국어 + 사유 + 우회법**, exit 0 허용 / exit 2 차단.
- **배선:** 기존 Bash matcher hooks 배열에 `./.claude/hooks/block-dangerous-git.sh` 추가(`$CLAUDE_PROJECT_DIR` 아님 — 로컬 관례). 순서 무관(pre-commit-check는 `git commit` 아니면 즉시 exit 0, 두 hook의 매칭 명령 집합 disjoint). 기존 settings `deny`(`git push --force*`)는 유지 — defense-in-depth.

### #2 fix-bug 보강
Matt diagnosing-bugs 6-phase의 핵심 3가지를 기존 fix-bug Phase 1~3에 산문으로 흡수(hitl-loop 스크립트 복사 안 함, 6-phase 통째 복제 안 함):
1. 수정 전 **재현 가능한 red 피드백 루프**부터 구축 (Phase 1)
2. **반증 가능한 가설 3~5개 랭킹** 후 하나씩 변수 하나만 바꿔 검증 (Phase 2)
3. 진단 계측은 `[DEBUG-xxxx]` **태그** → 완료 시 grep으로 제거 (Phase 2~3)

## Ontology
- **guardrail hook**: 파일 편집이 아닌 **git 명령** 대상 PreToolUse 차단기. 기존 `protect-files.sh`(파일 편집 차단)와 역할 분리.
- **파괴적 git 명령**: 커밋되지 않은 워킹트리 변경 또는 push된 히스토리를 **되돌릴 수 없게** 만드는 명령.
- **red 피드백 루프**: 해당 버그에서만 red가 되는(그 증상을 assert하는) 빠르고 결정론적인 단일 명령.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — #1 새 hook + 배선, #2 기존 fix-bug 산문 보강. 백로그에 결정 완료.
- [x] **Constraint 명확도** (30%) — templates/ 범위, 하네스 원칙, hook 관례(exit 2/한국어), force-with-lease는 이번 범위 밖(defer).
- [x] **Success 기준** (30%) — 차단/허용 테스트 매트릭스 통과(hook 직접 실행), fix-bug에 3가지 방법론 반영, 리뷰 기준 확인.
- [x] **Context 명확도** — settings.json, protect-files.sh, pre-commit-check.sh, fix-bug/SKILL.md 확인 완료.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

**게이트 통과 근거:** 백로그에서 분석·결정 완료, 원문 4종(2 SKILL + 2 script) 및 로컬 hook 3종 정독, advisor가 블로커 2개(force-with-lease defer, `checkout --` 누락) 해소.

## Deferred (이번 범위 밖)
- **`--force-with-lease` 허용:** settings `deny`의 `Bash(git push --force*)` glob이 with-lease도 잡으므로, hook에서 허용해도 permission deny가 먼저 막아 무의미. 두 레이어를 함께 손대야 하므로 이번엔 with-lease도 차단하고 defer. 백로그 문구도 "허용 검토"(soft).

## 참고
- 백로그: 메모리 `matt-pocock-merge-backlog`
- 원문: `skills/misc/git-guardrails-claude-code/`, `skills/engineering/diagnosing-bugs/`
