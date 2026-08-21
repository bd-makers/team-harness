# pocock-merge — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

Matt Pocock skills 2개 병합 완료 (2026-07-02).

### #1 git-guardrails → `templates/.claude/hooks/block-dangerous-git.sh` (신규)
- 파괴적 git 명령을 PreToolUse(Bash)에서 exit 2로 차단. Matt 스크립트를 그대로 쓰지 않고 하네스 정책에 맞춰 재작성:
  - **모든 push 차단 안 함** — "요청 시 push"는 승인된 워크플로우. force push(`--force`/`--force-with-lease`/`-f`)만 차단.
  - `reset --hard`, `clean -f/-fd/-fdx/--force`, `branch -D`, `checkout .`/`checkout -- <file>`, `restore <워킹트리>`.
- 오탐 최소화: 모든 패턴이 `git`+subcommand 인접 요구(`(.*[[:space:]])?` 템플릿). `restore --staged`·`branch -d`·`checkout -b`·`clean -n`·`push --follow-tags`·커밋 메시지·non-Bash 도구는 통과.
- 관례 통일: `jq // empty`, `TOOL_NAME != Bash` 방어, 한국어 사유+우회법 메시지, chmod 700.
- 배선: `settings.json` 기존 Bash matcher hooks 배열에 block-first로 추가. JSON valid 확인.
- **Provenance**: 상류 Matt Pocock, [mattpocock/skills](https://github.com/mattpocock/skills) (MIT), `skills/misc/git-guardrails-claude-code/scripts/block-dangerous-git.sh` — 대조 커밋 `885e2ca4d842d139e9aef4e48d366c63cb1b8013`. 사본이 아니라 파생이며, 정책 분기(상류 all-push 차단 → force push만 차단, `checkout -- <file>`·워킹트리 `restore` 추가)를 훅 주석에도 남겼다.

### #2 diagnosing-bugs → `templates/.claude/skills/fix-bug/SKILL.md` (보강)
- 병렬 스킬 안 만들고 기존 Phase 1~3에 산문 흡수:
  - Phase 1: 수정 전 **red 피드백 루프** 우선(빠름/결정론/증상 assert), 못 만들면 멈춤.
  - Phase 2: **반증 가능한 가설 3~5개 랭킹** → 변수 하나씩, `[DEBUG-xxxx]` 태그.
  - Phase 3: 원 시나리오 red→green 재확인, `[DEBUG-...]` grep 제거.
- 핵심 원칙에 "피드백 루프가 90%" 추가.

## Reviews

### 2026-07-02 — 셀프 리뷰 (하네스 코드 리뷰 기준)
- **정확성**: 차단 8종 + 허용 12종 매트릭스 hook 직접 실행 전부 PASS. fix-bug 3가지 방법론 반영 확인.
- **엣지 케이스**: `--force-with-lease`(차단), `branch my-Data`(허용, `-D` 플래그 경계), `checkout --track`(허용, bare `--` 아님), `restore --staged`(허용), 커밋 메시지 내 `reset --hard`(허용, git+subcommand 인접), non-Bash 도구(통과) 모두 검증.
- **회귀**: settings.json JSON valid. 기존 `deny`·pre-commit-check·protect-files 그대로 유지(추가만). 두 Bash hook은 매칭 명령 disjoint.
- **보안**: hook은 exit 2로 차단만, 명령 실행/네트워크 없음. 입력은 jq로 파싱.
- **단순성**: Matt 6-phase/스크립트 복제 안 함, 산문 흡수. hook은 패턴 배열 + restore 특례 하나.
- **테스트**: hook은 매트릭스로 커버. fix-bug는 문서라 별도 테스트 없음.
- **advisor**: 착수 전 검토 — 블로커 2개(force-with-lease defer, `checkout --` 누락) 해소, 오탐 완화(adjacency) 반영.
- **배포 경로 검증(advisor blocker)**: `harness.mjs:105` `copyTree`가 `templates/.claude/hooks` 전체를 재귀 복사 → `block-dangerous-git.sh` 자동 편승(명시 manifest 없음). 신규 init은 settings 그대로 wiring, apply(기존)는 `deepMergeJson` 배열 union-dedup으로 template Bash matcher가 append돼 hook은 동작(단, pre-commit-check 이중 실행 cosmetic 중복 — 기존 병합 방식의 특성).
- **잔여 리스크(의식적 수용)**:
  - **오탐(false positive)**: 커밋 메시지에 `git reset --hard`처럼 subcommand까지 통째로 들어가면 차단 가능(substring 휴리스틱, shell 파서 아님).
  - **누락(false negative)**: `git -C dir push --force`, `git -c k=v reset --hard`처럼 전역 옵션 프리픽스가 끼면 `git`+subcommand 인접이 깨져 우회됨(exit 0). 흔한 형태는 잡히며, 프리픽스 반복 매칭은 단순함 원칙에 반해 정규식 확장 안 함.
  - apply 병합 중복(위) — 정규식/merge 로직 수정은 이 task 범위 밖(templates/ only).

## Learnings
- **hook 정규식 오탐**: 초기 `subcommand[[:space:]].*[[:space:]]-TOKEN`은 공백을 두 번 요구해 인자 1개짜리(`branch -D feature`, `checkout .`)를 놓쳤다. `(.*[[:space:]])?`로 토큰 왼쪽 경계를 선택적 처리해야 subcommand 바로 뒤 토큰도 잡힌다.
- `(.*[[:space:]])?`는 공백으로 끝나야 해서 `--force`의 둘째 대시로 못 건너뜀 → clean은 `--force` 대안을 명시 추가.
- 상류 스킬을 그대로 쓰지 말 것: Matt의 block-all-push는 우리 워크플로우와 모순, `checkout .`만 잡고 `checkout -- <file>` 누락. 정책·관례에 맞춘 재작성이 정답.

## Follow-up

### 2026-08-21 — "핀 참조로 전환" 요청 검증 (전환 안 함)
- 요청: 벤더링된 matt-pocock 스킬을 핀 참조로 바꿔 달라. **검증 결과 전제가 성립하지 않아 전환하지 않았다.**
- repo 전역 grep(`pocock|git-guardrails|diagnosing-bugs|grilling|wayfinder|to-spec|domain-modeling`, docs·.git 제외) 히트는 `templates/.claude/hooks/block-dangerous-git.sh` 하나뿐 — 상류 사본 없음.
- **결정적 근거**: `mattpocock-skills` 플러그인의 `.claude-plugin/plugin.json`(sha `885e2ca`)이 노출하는 스킬 25개에 `skills/misc/git-guardrails-claude-code`가 **없다**. 상류는 repo에만 두고 플러그인으로 배포하지 않으므로 핀 참조로는 그 파일이 오지 않고, 가져오려면 다시 복사해야 한다(= 벗어나려던 벤더링).
- 배달 경로도 다르다: 이 훅은 `src/harness.mjs:232` `copyTree`가 **소비자 프로젝트의 `.claude/hooks/`로 배달**한다. 마켓플레이스 핀은 `~/.claude/plugins` 설치일 뿐 scaffold 대상 `.claude/`를 채우지 못한다.
- 네임스페이스 질문: `mattpocock-skills:*`와 `harness-aijient-team:*`는 접두어가 달라 공존 가능(사용자가 말한 `team-harness:`는 repo/마켓플레이스 이름). 템플릿 스킬 `fix-bug`/`new-feature`/`verify`도 상류 25개와 이름 충돌 없음. 실제 비용은 목적 중복(`diagnosing-bugs`↔`fix-bug`, `tdd`↔`harness-unittest`, `code-review`↔`harness-codex-review`, `grilling`↔`harness-interview`)과 always-on ~1.6k 토큰 — 설치 여부는 사용자 판단으로 남김.
- 조치: 출처 표기만 적용(훅 주석 + 위 Provenance 줄). 훅 동작은 미변경 — 차단/허용 매트릭스 재실행으로 확인(force push·`reset --hard`·`checkout -- <file>`·워킹트리 `restore` = exit 2 / `push`·`restore --staged`·`branch -d` = exit 0).
