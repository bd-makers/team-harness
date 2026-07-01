# sim-agentloop-redesign — Spec

## 목적 / 요구사항

현재 `/harness-sim`은 `node bin/harness-team.mjs ...` **CLI 배관**만 검증하고,
정작 "실제 사용자 경험" 레이어(slash command 해석·skill 트리거·SessionStart 주입·
hook 실발화·context/memory/token/session 저장)는 리포트의 **"수동확인 잔여"** 칸에
미뤄둔다. 매트릭스는 전부 PASS지만, 사용자가 측정하려던 우선순위는 측정에서 빠져 있다.

**요구사항:** 테스트 프로젝트에서 *실제 에이전트 세션*을 굴려 init→apply→task 전 과정과
skill/command/hook/rule/token/context/memory/session-history 동작을 **관찰 가능한
사이드이펙트로** 측정하고, 비결정성을 정직하게 반영한 날짜 리포트를 남긴다.

### 측정 대상 (사용자 명시 항목 → 관찰 신호 매핑)
| 사용자 항목 | 관찰 신호 (deterministic) |
|---|---|
| init | throwaway 빈 dir에 `/harness-init` 세션 → AGENTS.md/CLAUDE.md/.claude/{hooks,rules,skills} scaffold 생성 |
| apply | 기존 파일 있는 dir에 `/harness-apply` → 비파괴 병합(기존 보존 + 코어 주입) |
| task | `/harness-task <n>` → 4종 SSOT + `.harness/active.json` 갱신 |
| skill/command | slash 실해석 여부 = 해당 command의 **사이드이펙트 발생** 여부로 대리 측정 |
| hook | SessionStart nudge 텍스트가 session JSONL/출력에 등장 · post-commit handoff 갱신 · PreToolUse protect-files 차단 |
| rule | `.claude/rules/*` 존재 + 세션 context 주입 |
| token | `--output-format json`의 `usage`/`total_cost_usd` |
| context/memory | CLAUDE.md/AGENTS.md import 체인이 세션 system context로 주입됐는지(JSONL) |
| session history | `~/.claude/projects/<cwd>/<session_id>.jsonl` 생성·파싱 가능 |

## 설계 / 접근

### 핵심 결정 1 — 실행 주체: 유저-런 스크립트 (스킬 자동실행 불가)
**경험적 사실:** 내 세션(자식 세션)이 spawn한 `claude -p`는 `"Not logged in"`을 반환한다
(인증 미전파, 검증 완료). 따라서 이 sim은 **스킬 내부에서 자동 실행 불가**. 형태는
**유저가 인증된 터미널에서 직접 실행하는 독립 Node 스크립트**다 — 이게 오히려 "실제
사용자가 굴려본다"는 원래 컨셉과 정합한다. 스크립트는 첫 줄에서 `"Not logged in"`을
감지하면 가이드와 함께 즉시 중단한다.

### 핵심 결정 2 — `claude -p` agent-in-the-loop
각 시나리오는 `claude -p "<프롬프트>" --output-format json --debug hooks` 호출.
- 프롬프트는 slash(`/harness-init`)와 자연어("팀 하네스를 설치해줘") **둘 다** 시험(트리거 신뢰성 측정).
- `--debug hooks` stderr로 hook 발화 관찰, JSON stdout으로 token/session_id, session JSONL로 주입·skill activation 관찰.

### 핵심 결정 3 — 신뢰성 = 사이드이펙트 루브릭 (프로즈 신뢰 금지)
에이전트의 산문 응답을 믿지 않는다. 시나리오마다 **관찰 가능한 신호 목록**을 정의하고
각 신호를 파일/git/JSONL/stderr 상태로 이진 판정. 점수 = 통과 신호 / 전체 신호.

### 핵심 결정 4 — 비결정성: N-trial pass-rate
agent-in-the-loop은 비결정적(트리거돼야 할 skill을 안 할 수도). 시나리오당 N=2(기본)
반복 → 단일 PASS/FAIL 대신 **pass-rate(2/2, 1/2…)** 보고. 1/2 이하는 `⚠️flaky` 플래그.

### 핵심 결정 5 — 격리 / 무오염
- init/apply는 파괴적 → 영속 3프로젝트가 아닌 `$PG/.sim-tmp/<TS>/` throwaway dir에서.
- task/hook 시나리오는 영속 프로젝트의 격리 브랜치(현 sim 방식 계승) 또는 throwaway.
- 종료 시 `.sim-tmp/<TS>` 전체 삭제 + 영속 프로젝트 무오염 사후 검증(git clean + doctor green).

### 핵심 결정 6 — 정직성 규칙 계승 + 강화
현 SKILL의 "위조 금지"는 좋은 속성 → 유지. headless로 대부분의 "수동확인"이 신호화되지만,
**JSONL로도 관찰 불가한 항목은 계속 정직하게 manual**로 남긴다. redesign이 false PASS
양산 통로가 되면 본말전도. 비결정·플래키 항목은 pass-rate로 투명하게.

### 핵심 결정 7 — 상태 관리: 하이브리드 (버전 간 재테스트 비교)
"하네스 버전 올린 뒤 다시 돌려 비교"가 핵심 요구. 통제 실험으로 만든다 — 하네스 버전만 변수.
세 가지 상태를 **분리**한다:
- **시나리오 작업 흔적**(`.sim-scratch`·더미 커밋·handoff churn) = 노이즈 → **매 런 clean 복원**
  (baseline 시작 조건을 버전 간 동일하게 유지 = 비교가능성).
- **하네스 산출물**(init/apply scaffold·4종 SSOT 구조) = 측정 대상 →
  `harness-playground/sim-snapshots/<version>/<scenario>/`에 **골든 스냅샷 커밋**.
  `git diff <v1>..<v2>`로 "이번 업데이트가 출력을 뭘 바꿨나" 회귀 탐지.
- **품질 리포트**(pass-rate) = 측정 결과 → 날짜+버전 박힌 `sim-reports/`에 **누적**.
- 결과: 버전 간 비교가 **점수 비교(리포트)** + **구조 diff(스냅샷)** 두 축으로 성립.

### 산출물
- `tests/sim/agentloop.mjs` (또는 `bin/` 인접) — 유저-런 하네스 스크립트.
- `/harness-sim` 스킬 본문 → "유저가 터미널에서 이 스크립트를 실행" 안내 + 결과 해석 가이드로 재작성.
- 리포트 템플릿 갱신: pass-rate 매트릭스 + 신호별 관찰 + 정직성 잔여.

## 신호 루브릭 (P1 — 시나리오별 관찰 신호)
*각 신호는 파일/git/JSONL/hook-stderr로 이진 판정. 산문 응답은 신호가 아니다.
slash→CLI→설치-hook 전 체인을 헤드리스 세션이 cwd=테스트프로젝트에서 굴린다.*

### SC1. init (빈 `.sim-tmp/<TS>/init`에서 `claude -p "/harness-init"`)
- [ ] `AGENTS.md` 생성 + `harness:section=` 마커 포함
- [ ] `CLAUDE.md`·`GEMINI.md` 생성 + `@AGENTS.md` import 포함
- [ ] `.claude/settings.json` 생성 + `hooks.SessionStart`/`PreToolUse` 키 존재
- [ ] `.claude/hooks/*`·`.claude/rules/*` 파일 ≥1
- [ ] `node $BIN doctor --json --target <dir>` → status success, fail 0

### SC2. apply (기존파일 dir에서 `/harness-apply`)
- [ ] 기존 사용자 파일(예: `README.md`, `src/index.js`) **내용 보존**(해시 불변)
- [ ] 코어(`AGENTS.md` 등) 주입됨
- [ ] doctor green

### SC3. task (init된 프로젝트에서 `/harness-task sim-<TS>`)
- [ ] `docs/<user>/sim-<TS>/`에 4종 SSOT 생성
- [ ] `.harness/active.json`이 task 가리킴
- [ ] 생성 spec에 "Ambiguity 자가진단"·"Ontology" 섹션 존재

### SC4. 설치-hook 발화 (init된 프로젝트의 **두 번째** 헤드리스 세션 — 본질적 2번 측정)
- [ ] **SessionStart**: 활성 task 없을 때 세션 출력/JSONL에 "활성 task가 없습니다" nudge 주입
- [ ] **post-commit**: 더미 커밋 후 `<name>-handoff.md` mtime/내용 갱신
- [ ] **PreToolUse protect-files**: 보호 경로 Edit 시 차단(거부 신호) — 관찰되면 PASS, 불가 시 `⚠️manual`

### SC5. slash/skill 트리거 신뢰성 (비결정 — pass-rate 핵심)
- [ ] `/harness-doctor` slash → doctor 사이드이펙트 발생 (N=2 pass-rate)
- [ ] 자연어("팀 하네스 점검해줘")로도 트리거되나 (N=2 pass-rate)

> 관찰 불가 잔여(정직성): JSONL에도 안 잡히는 항목은 `⚠️manual` 유지. false PASS 금지.

## Ontology
- **agent-in-the-loop**: 실제 `claude -p` 에이전트 세션을 부수 프로세스로 띄워 그 사이드이펙트를 관찰하는 검증. (vs. CLI 배관 직접 호출)
- **신호(signal)**: 파일/git/JSONL/hook-stderr 상태로 이진 판정 가능한 관찰 단위. 산문 응답은 신호가 아니다.
- **pass-rate**: 비결정 시나리오를 N회 반복했을 때 신호 루브릭 통과 비율.
- **유저-런**: 인증된 유저 터미널에서 직접 실행. 스킬/자식세션 자동실행과 구분(인증 벽).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — "claude -p 로 init→apply→task 실세션을 굴려 사이드이펙트 신호로 측정하는 유저-런 하네스".
- [x] **Constraint 명확도** (30%) — 유저-런(인증 벽)·무오염·정직성 규칙 계승·src 미오염.
- [x] **Success 기준** (30%) — 신호 루브릭 pass-rate 매트릭스 + 정직한 manual 잔여가 든 날짜 리포트.
- [x] **Context 명확도** (brownfield) — 현 `skills/harness-sim/SKILL.md`, playground 3프로젝트, 기존 리포트, bin/harness-team.mjs.
- [x] **Ambiguity ≤ 0.2** — 가중합 ≥ 0.8 (게이트 통과).

> **게이트 통과 근거:** 목표·제약·성공기준·brownfield 컨텍스트 모두 명확. 잔여 불확실성은
> "신호 목록 세부"와 "JSONL 정확한 모양"뿐 — 후자는 유저 probe 1회로 해소 예정.

## 참고
- 현 스킬: `skills/harness-sim/SKILL.md` (CLI L4)
- 기존 리포트: `harness-playground/sim-reports/harness-sim-2026-06-29T1859.md`
- 경험적 검증: nested `claude -p` → "Not logged in"(인증 미전파). `claude --print`/`--debug hooks`/`--output-format json` 사용.
- **미해소(유저 probe 대기):** ① slash 실해석 여부 ② SessionStart 실발화 여부 ③ session JSONL 정확한 스키마.
