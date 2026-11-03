# subsystem-audit — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: D12는 하네스 5개 하위 시스템 중 **환경**만 강의 기준으로 감사했다. 나머지 넷(지시·도구·상태·피드백)은 0.52.0 기준으로
  감사된 적이 없어, 다음 task를 고를 때 빈틈과 의도적 비채택을 구분할 근거가 없다.
- **영향**: 메인테이너의 후보 선택(D11 신규 기능 판정 질문의 입력). 소비자 저장소의 동작은 바뀌지 않는다.
- **기대 결과**: 하위 시스템마다 감사표(강의 항목·장치 `파일:줄`·빈틈·실사용 근거)와 판정(고칠 가치 있음 / 의도적으로 안 함(근거) / 미확인),
  고칠 가치가 있는 빈틈을 D12처럼 묶은 **후보 task** 목록.
- **제약**: 코드·`docs/decisions.md` 무변경, push·PR 없음 — 결정 기록과 후보 착수는 메인테이너 승인 뒤. 강의 원문을 못 찾은 항목은 추측하지 않고
  그렇다고 적는다. 판정은 D11(강제는 PR의 task 문서뿐·2차 장치 규칙·신규 기능 판정 질문)과 기존 결정에 대조한다.
  eager 예산 여유는 **233 B**(2026-11-03 실측: 루트 `AGENTS.md` 11,483 + `CLAUDE.md` 5,784 = 17,267 B, 상한 17,500 B — `tests/agent-files.test.mjs:448`;
  렌더 템플릿은 17,245 B·여유 255 B) — AGENTS.md에 글을 더하는 후보는 바이트 이동을 함께 낸다. `.env.*` 읽기 deny 유지.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `docs/hslee/subsystem-audit/` 의 spec·plan·artifact·TCC — 감사표·판정·후보 목록.
- **Out**: 환경 하위 시스템(D12가 감사함). 후보 task 착수, `docs/decisions.md` 기록(메인테이너 승인 뒤). 감사 중 발견한 문서 결함 수정
  (예: `MAINTAINING.md:52`의 낡은 eager 수치) — 후보 D로 넘긴다. 소비자 저장소는 읽기만 했다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- **강의 02** — walkinglabs `learn-harness-engineering` `docs/en/lectures/lecture-02-what-a-harness-actually-is/index.md`
  (main = 커밋 `a9342ff`, 2026-10-22, 2026-11-03에 받음). 5개 하위 시스템 정의 `:52-60`, 실패 귀인 5종 `:71`, "harness rots — audit regularly" `:93`.
- **심화 강의**(같은 커밋 고정 URL): 03 저장소가 system of record(fresh session test 5문항·지식 부패), 04 지시 파일 분할(진입 파일 50–200줄·
  지시마다 출처·적용·만료·hard/soft 구분), 05 연속성(진행·결정 로그·git 체크포인트, rebuild cost), 08 feature list(상태 전이는 하네스가 통제),
  09 이른 완료 선언(완료 판정 외부화·수리 단계를 담은 오류), 10 E2E(실행 가능한 아키텍처 규칙·리뷰 피드백 승격), 11 관측성, 12 clean state(세션 종료 5조건).
- **harness-designs/claude-code** "Mapping to the Course Framework" 표 — 도구 행(확장 4종의 책임 분리) 보조.
- **실사용 근거**: `docs/harness-cycle.md`, `docs/followups.md`(남은 후보 0, "이 목록에 없는 것" 4항), task artifact 171개(서브에이전트 수집 →
  주 세션이 4건 표본 대조), 소비자 3곳(job-scraper·deep-math·heliosent-profile) `AGENTS.md`·`.harness/gates.json` 읽기 대조.

### 발견
- (unresolved) 강의 저장소 README 본문은 다른 5분류(지시·상태·검증·범위·세션 수명주기)를 쓰고, README "What's New"·harness-designs·강의 02는
  지시·도구·환경·상태·피드백을 쓴다. → 결정: **강의 02가 정본**이다 — 하위 시스템마다 책임과 평가 기준을 적은 유일한 본문이고 D12가 같은 원천을 썼다.
  README 분류의 "범위"(07)·"세션 수명주기"(12)는 상태·피드백 행에 흡수했다.
- (open) 도구 하위 시스템은 강의 02에 두 문장(충분한 접근·최소 권한)뿐이고 전용 강의가 없다. → 결정: harness-designs/claude-code의 Tools 행
  (확장 4종 책임 분리)과 서브에이전트 격리만 보조 항목으로 쓰고, 그 밖의 도구 항목은 만들지 않는다(추측 금지).
- (open) 강의 01·02는 `main`에서 받았다. → 결정: 같은 시각 `main` = `a9342ff`을 API로 확인했고, 03–12와 harness-designs는 그 커밋 고정 URL로 받았다.
- (open) 서브에이전트가 모은 근거의 신뢰도. → 결정: 표본 4건(`audit-cleanup:158`·`scope-resolve-cli:243-247`·`escalation-packet-fields:189`·
  `MAINTAINING.md:52`)을 주 세션이 원문과 대조해 일치를 확인했다. 표의 `실사용` 라벨은 **소비자**(다른 저장소)·**dogfood**(이 저장소에서 실제로 쓰다 겪음)·
  **개발중**(테스트·리뷰·스크래치 발견) 셋이다.
- 검토 완료: 2026-11-03

## 설계 / 접근
D12 **배경** 절의 형식을 따른다 — 하위 시스템마다 *그것을 다루는 장치 → 무엇을 읽지 않는가 → 실사용 막힘* 한 단락, 그다음 표.
표의 1차 행은 강의 02 본문 항목이고, 03–12 항목은 하네스에 장치가 있거나 빈틈이 보일 때만 행으로 올렸다.
판정 근거가 **기록된 결정**(D-log·spec)이면 그 위치를, 이 감사의 **추론**이면 "(추론)"을 붙인다.

### 지시 (Instructions)

**배경**: 강의 02의 지시는 "AGENTS.md에 개요·스택과 버전·첫 실행 명령·하드 제약·상세 문서 링크"이고 원칙은 "매뉴얼이 아니라 지도"다.
지시를 다루는 장치는 AGENTS.md(SSOT)·CLAUDE.md(`@AGENTS.md`) 템플릿의 관리 절(`templates/AGENTS.md.hbs:7-170`, `templates/CLAUDE.md.hbs:8-75`),
`.claude/rules/*.md`(`paths:` 스코프 + 유래 마커), cursor 미러, Codex SessionStart 주입(D9), doctor의 `stale managed sections`·`rule provenance`·eager 크기 경고
(`src/commands/doctor.mjs:1018-1031`·`:650`), `/harness-promote`다. **읽지 않는 것**은 관리 절 밖의 프로젝트 고유 내용(개요·하드 제약)이 비었는지,
산문 문서 속 수치·단정이 아직 맞는지다. **실사용 막힘**은 둘 다 닫혔다 — Codex SessionStart 주입이 약 6개월 무증상으로 실패했고
(`docs/chad/codex-project-hooks-probe/…-artifact.md:7,68` → D9), deep-math 관리 절이 낡았는데 migrate 문서가 틀린 경로를 안내했다
(`docs/hslee/managed-section-refresh-path/…-artifact.md:12-13` → doctor 경고). 지금 남은 압박은 eager 여유 233 B다.

| # | 강의 항목 | 장치 | 빈틈 | 실사용 근거 | 판정 |
|---|---|---|---|---|---|
| I1 | 프로젝트 개요·목적 (02:52, 03 fresh-session Q1) | 템플릿에 자리 없음. 관리 절 밖 텍스트는 init이 보존(`tests/agent-files.test.mjs:440`) | 비어도 아무 장치도 알리지 않는다 | 막힘 0건 | **의도적으로 안 함** — 프로젝트 내용은 하네스 소유가 아니고 README가 답한다. 칸을 넣으면 eager가 든다 (추론) |
| I2 | 기술 스택과 **버전** (02:52) | `## 기술 스택` 이름만(`AGENTS.md.hbs:19-23`) | 버전 없음 | heliosent 2026-10-11(D12) | **의도적으로 안 함** — 버전 정본은 저장소 선언 파일, 산문 사본 금지(`decisions.md:325`, D12 정정). `stack` 빈칸 보고가 다룬다 |
| I3 | 첫 실행 명령 (02:52) | `## 명령` install·bootstrap·dev(`AGENTS.md.hbs:25-28`, `src/detect-stack.mjs:103-117`) | Python·go·generic은 dev 등이 `(configure)` | 소비자 3곳 모두 `## 명령`을 손으로 채움(2026-11-03 읽기 대조) | **의도적으로 안 함** — "감지 못하면 `(configure)`, 추측하지 않는다"(D12 원문 1번), 손 편집은 provenance로 보존(D8) |
| I4 | 협상 불가 하드 제약 + hard/soft 구분 (02:52, 04) | `## 핵심 원칙`(`AGENTS.md.hbs:7-17`), 프로젝트 제약은 사용자 영역·`.claude/rules` | 규범과 권장이 같은 형식 | dogfood: 문서 결함으로 `done`이라는 task가 생김 → 결정론 거부로 이전(`task-reserved-names-artifact.md:10`). doctor spec 게이트가 리터럴 grep(`p0-enforcement-artifact.md:54`, 2026-06-10) | **의도적으로 안 함**(형식 표기) — 막아야 할 것은 사례마다 결정론 가드로 옮겨 왔고, 형식 표기는 eager가 든다 (추론). spec 게이트 grep 건은 **미확인**(이후 해결 기록 없음) |
| I5 | 지도이지 매뉴얼 아님 — 진입 파일 ~100줄(02:34), 50–200줄(04) | AGENTS 170행 + CLAUDE 79행, `### 컨텍스트 파일` 표(`AGENTS.md.hbs:160-169`), JIT retrieval(`:107-119`), eager 가드 | `protocol` 절(약 105행)이 버그 수정 세션에도 상시 로드(04의 SNR) | eager 반복 압박 — 2026-09-26 여유 5 B, 0.41.0에 170 B 한 줄 거부(`MAINTAINING.md:52`), lazy 이전은 Cursor가 `commands/`를 못 읽는 긴장(`eager-tier-slimming-artifact.md:72-78`, `eager-budget-headroom-artifact.md:40-46`) | **의도적으로 안 함**(현행 유지) — 04 범위 안이고, 남은 문장은 Cursor가 지켜야 할 규칙이라 이미 lazy로 옮길 수 있는 것은 옮겼다(task `eager-budget-headroom`) |
| I6 | 지시마다 출처·적용 조건·**만료 조건** (04) | `paths:`(적용), `<!-- harness:rule origin= since= -->`(출처)(`templates/.claude/rules/testing.md:1-8`), doctor `rule provenance` | 만료(재검토) 칸 없음 | 규칙 파일에서 난 사례 0건 — 낡은 단정은 산문 문서에서 났다(I7) | **미확인** — 규칙이 적다(이 저장소 0개, 템플릿 4개) |
| I7 | 지식 부패 — 낡은 문서는 없는 것보다 위험 (03), 정기 감사 (02:93) | `docs:check`(생성 문서), doctor stale 템플릿·관리 절, D11 재평가 신호 | 산문 속 수치·단정은 검사 밖 | **지금** `MAINTAINING.md:52`가 eager 16,425 B·여유 1,075 B라 적음(실측 17,267 B·233 B). 같은 패턴 7건(`codex-hooks-template:54`, `docs-refresh-0210:70`, `migrate-init-gaps:67` 등) | **고칠 가치 있음** → 후보 D (수치를 지우고 측정 방법만) |

### 도구 (Tools)

**배경**: 강의 02의 도구는 "충분한 접근 — shell을 끄지 말 것, 그러나 최소 권한"이다. 장치는 `templates/.claude/settings.json`의
allow(`Read`·`Edit`·`Write`·`Glob`·`Grep`·`Bash(codex:*)`)·ask(push·PR 생성·머지)·deny(`.env`·`rm -rf`·force push)(`:3-25`),
스택 의존 Bash allow(`src/settings-permissions.mjs:22-47`), PreToolUse 훅 5종(`settings.json:27-67`), `denied`·`failed`를 세는 observe 훅
(`templates/.claude/hooks/observe-tools.mjs:16`, `src/commands/observe.mjs:85-127`), 명령 문서 21·스킬 래퍼·템플릿 스킬 3, 서브에이전트 규범
(`CLAUDE.md.hbs:21-27`), 리뷰어 호출(`src/commands/review.mjs:386`)이다. **읽지 않는 것**은 `Bash(codex:*)`가 어떤 codex 인자를 허용하는지,
그리고 권한 프롬프트가 실제로 얼마나 뜨는지(observe는 이 저장소에서 not-installed, 소비자 실데이터 미보정 — `observability-consumer-artifact.md:68,70`)다.
**실사용 막힘**은 대부분 닫혔다 — `release --help`가 실제 릴리스를 돌림(`global-cli-drift-artifact.md:74-77`), `codex exec` stdin 대기 38·63분
(`task-ledger-derived-artifact.md:80-84`, kc-admin-web). Codex 엔진 가용성 실패(5건)와 리뷰어 read-only 샌드박스의 테스트 불가(4건)는 반복 중이다.

| # | 강의 항목 | 장치 | 빈틈 | 실사용 근거 | 판정 |
|---|---|---|---|---|---|
| T1 | 충분한 접근 — shell을 끄지 않는다 (02:54) | shell 허용, pm 계열 install·add·test·lint·typecheck allow(`settings-permissions.mjs:31-37`) | Python·go·generic은 pm allow 0개(`ADD_CMD` `:11`), `bootstrap`은 allow 밖(task `env-describe` D-B), `harness-team` 자체도 allow 밖(grep 0건) | 승인 피로 기록 0건, denied 데이터 없음 | **미확인** — 프롬프트 빈도 데이터가 없다. 소비자 observe `denied` 집계로 판정 가능 |
| T2 | 최소 권한 (02:54) | deny·ask 목록, 훅 차단, RN 네이티브 Edit deny(`settings-permissions.mjs:44`), `.env.*` deny 유지(D12) | **`Bash(codex:*)`(`settings.json:10`)가 codex 인자 전체를 승인 없이 허용** — `--sandbox danger-full-access`·`--dangerously-bypass-approvals-and-sandbox` 포함(`codex exec --help` 실측). 하네스의 리뷰 호출은 node가 spawn하므로(`review.mjs:386`) 이 allow가 필요 없다. read-only라도 codex는 Claude의 `Read(./.env)` deny 밖에서 파일을 읽는다(추론, 미실측) | 사고 0건(예방적). 2026-06 첫 커밋부터 있음 | **고칠 가치 있음** → 후보 B |
| T3 | 확장 메커니즘 책임 분리 (designs: skills·MCP·hooks·subagents) | 명령 문서(lazy 정본) + 스킬 래퍼, 훅은 결정론 검사, 서브에이전트는 규범 | — | 템플릿·훅 수정이 기존 설치에 안 닿음 7건 → doctor stale 경고·migrate로 경로 있음 | **의도적으로 안 함**(현행 유지) — `harness-cycle.md` §3 "스킬 래퍼 유지" |
| T4 | 서브에이전트 컨텍스트 격리 (designs) | CLAUDE.md §2, D6 read-only 검증자, `/harness-loop` QA | — | 위임 발견 19건 표본 재현 일치(`audit-cleanup-artifact.md:151`) | **있음** |

### 상태 (State)

**배경**: 강의 02의 상태는 "진행 파일에 완료·진행 중·막힘을 적고, 세션이 끝나기 전에 갱신하고, 다음 세션 시작에 읽는다"다. 장치는 task 4문서 + meta.json + TCC
(`AGENTS.md.hbs:68-100`), post-commit 훅의 handoff 갱신(`src/git-hooks.mjs:130`), SessionStart의 breadcrumb·TCC 주입(`src/commands/session-context.mjs:51-136`,
Codex도 D9), `context check` 한도 검사(`src/commands/context.mjs:84-131`), 체크박스 직전 `boundary check`, `done` 가드, 집계 파일 기본 브랜치 전용(D5)이다.
**읽지 않는 것**은 세션 종료 시점(Stop·SessionEnd 훅 없음, 결정 기록도 없음 — 커밋 없이 끝난 세션은 handoff·TCC가 갱신되지 않는다)과 TCC의 신선도
(`context check`는 크기·형식만 본다)다. **실사용 막힘**은 주로 하네스가 쓴 파일이 가드를 더럽힌 것이었고 닫혔다 — done 판정 창 리셋(`done-guard-window-artifact.md:60-82`),
post-commit의 handoff 재작성으로 done 상시 차단(`handoff-hook-churn-artifact.md:6-14`), user handoff 고착·병렬 충돌(`done-user-handoff-freeze:8-10`,
`user-handoff-parallel-conflict:6-14`). 남은 것은 **TCC 미작성**이다 — 추적 TCC 144개 중 42개(29%)가 `Current atomic step`이 빈 채 커밋됐다(2026-11-03 전수 측정).
이 수치는 종결된 task를 포함하므로 지금의 재개 가치가 아니라 **커밋 시점에 규범이 지켜졌는가**를 잰다.

| # | 강의 항목 | 장치 | 빈틈 | 실사용 근거 | 판정 |
|---|---|---|---|---|---|
| S1 | 진행 기록 — 완료·진행 중·막힘 (02:58) | plan 체크박스, TCC `Current atomic step`, failure capsule `### F-*`(`AGENTS.md.hbs:92-100`) | — | — | **있음** |
| S2 | 세션이 끝나기 전에 갱신 (02:58, 05) | post-commit → handoff, TCC 갱신 시점 규범(`AGENTS.md.hbs:97`) | 세션 종료 장치 없음. TCC는 규범에만 의존 | TCC 42/144 미작성(측정). 빈 TCC 2연속 커밋 → 리뷰 P2(`scope-resolve-cli-artifact.md:243-247`, 2026-09-17), 3회차 리뷰까지 낡음(`default-branch-primitive:170-177`) | **고칠 가치 있음** → 후보 E (단, 2차 장치 규칙상 TCC 축소부터 검토). 세션 종료 훅 자체는 **미확인**(TCC 밖의 사고 근거 없음) |
| S3 | 다음 세션 시작에 읽기 (02:58) | SessionStart `harness-team session-context`, Codex SessionStart(D9) | — | Codex 주입 무증상 실패 → 해결(D9) | **있음** |
| S4 | 결정 로그·git 체크포인트·검증 결과·다음 행동 (05) | `docs/decisions.md`, artifact `## Reviews` + meta.reviews, plan, 커밋 | — | — | **있음** |
| S5 | 상태 전이는 하네스가 통제, 검증 통과만 승격 (08) | 체크박스는 에이전트가 편집, `boundary check`(선언 시), `done` 가드(미완 체크박스) | 검증 없이 `- [x]` 가능 | 선체크 3건(`docs-refresh-0210:133`, `escalation-packet-fields:189`, `scope-resolve-cli:287`), 게이트 실패인데 체크만 남음(`default-loop-skill:295`) — 모두 리뷰가 잡음 | **의도적으로 안 함** — D11: 강제는 PR 문서뿐, 구현 방식 자유. 재평가: 리뷰가 못 잡은 선체크가 머지되면 |
| S6 | 세션 종료 clean state 5조건 (12) | build·tests는 커밋 게이트(커밋 시점), progress는 post-commit, startup path는 D12 Q4·Q5 | 세션 종료 시점 검사 없음 | 세션이 죽어 브랜치가 갈라짐 1건(`doctor-eager-global:142`) | **미확인** — 커밋 게이트가 같은 것을 커밋 시점에 본다. 추가 가치를 보인 사례 1건 |
| S7 | 동시성 격리·내구성 (03 ACID) | D4 단일 쓰기, D5 worktree, user handoff gitignore | 저장 계층 롤백 감지 없음 | iCloud `.git/index` 롤백으로 문서 4개 조용히 복귀(`observe-surfacing-artifact.md:49,70`) | **의도적으로 안 함** — iCloud는 메인테이너 개인 저장 위치, D11 "개인 도구 의존 비소유". 대응은 개인 메모리에 있다 |

### 피드백 (Feedback)

**배경**: 강의 02는 피드백을 "ROI가 가장 높은 하위 시스템"이라 하고, 검증 명령(tests·typecheck·lint·full verification)을 **AGENTS.md에 명시**하라고 한다.
장치는 `## 명령` test·lint·typecheck(`AGENTS.md.hbs:29-31`) + 그 세 줄을 정본으로 읽는 `/verify` 스킬(`templates/.claude/skills/verify/SKILL.md:14-16`),
커밋 게이트(`pre-commit-check.sh` → `src/commands/gate.mjs:29-66`, 목록 `.harness/gates.json`은 프리셋 commit 규칙에서 제안 — `src/presets.mjs:200`),
리뷰 엔진(D2)·read-only 검증자(D6)·루브릭, `pr-check`, `done` 가드, R2 `scenario check`, `boundary check`, CLI 오류 envelope의 next_action·retry·alternatives,
failure capsule + Cause, observe 트립와이어, `/harness-promote`다. **읽지 않는 것**: AGENTS.md는 커밋 게이트 목록을 가리키지 않는다(`gates` grep 0건) —
에이전트가 읽는 검증 명령과 게이트가 돌리는 명령이 **다른 도출**이다. 게이트 **실패** 메시지는 원인 단서가 없다. **실사용 막힘**: heliosent-profile
2026-10-11 커밋 게이트 tsc 실패는 환경(`node_modules` 없음) 탓이었고 사람이 `bun install --frozen-lockfile`을 찾아 풀었다(`docs/harness-cycle.md:279`).
"`docs:generate` 전에 `git add`" 학습이 9개 artifact에서 반복됐지만 승격도 자동화도 되지 않았다.

| # | 강의 항목 | 장치 | 빈틈 | 실사용 근거 | 판정 |
|---|---|---|---|---|---|
| F1 | 검증 명령을 AGENTS.md에 명시 — tests·typecheck·lint·**full** (02:60-67) | `## 명령` 3줄(`detect-stack.mjs:114-116`), `/verify`, `.harness/gates.json`(`presets.mjs:200`) | ① full verification 줄 없음 — 게이트 목록을 AGENTS.md가 가리키지 않는다. ② `## 명령`은 package.json 스크립트만(`detect-stack.mjs:103-117`), 게이트는 프리셋 규칙(`tsconfig.json` → `tsc --noEmit`, Python → `ruff check .`·`pytest`). **Python은 `## 명령` test·lint·typecheck가 늘 `(configure)`인데 게이트 제안은 pytest·ruff** — `/verify`는 "미설정"으로 건너뛰고 게이트는 돈다 | heliosent(0.48.0): `## 명령` typecheck `bun run typecheck` vs gates `bunx tsc --noEmit`. job-scraper·deep-math는 0.44.4(gates는 0.46.0)라 대조 불가. 사고 기록 없음 | **고칠 가치 있음** → 후보 A |
| F2 | 실행 가능한 규칙 + 작업자/검증자 분리 (02:35) | 커밋 게이트, D2·D6, 엔진 probe 체인 codex→claude(`review.mjs:33`) | 검증자 호출이 외부 엔진 상태에 취약, read-only라 검증자가 테스트를 못 돌림 | Codex 실패 5건, EPERM 4건, 리뷰 비수렴 5 task(`scope-resolve-cli:185-263` 7회 등) | **의도적으로 안 함** — 폴백 체인이 있고, 테스트 불가는 read-only의 대가(D6: 반박만, 재현은 작성 세션) |
| F3 | 완료 판정 외부화 + 3층 검증 (09) | `done` 가드(Done evidence 기본 optional), `pr-check`, R2 `scenario check`(옵트인), `/harness-inttest` | 기본이 optional | 확인 안 한 것을 확인했다고 씀 3건(`settings-ask-tier:202`, `preset-gates:117`, `escalation-packet-fields:179`) — 루브릭 리뷰가 잡음 | **의도적으로 안 함** — D11 2026-11-02 정정(엄격도는 팀 선언으로, `decisions.md:208-210`) |
| F4 | 오류 메시지에 수리 단계 (09, 10) | CLI next_action·retry·alternatives(`followups.md:13-16`), doctor 처방, 게이트 설정 오류 힌트(`gate.mjs:13`) | 게이트 **실패**는 `커밋 게이트 실패: <cmd> (exit N)`뿐(`gate.mjs:59`). "코드 탓 전에 `stack --json` installTrace" 안내는 lazy 스킬(`skills/harness-team/SKILL.md:36`)에만 있어 훅이 실패한 순간에는 로드되지 않는다 | heliosent 2026-10-11 tsc 실패(환경 원인, `harness-cycle.md:279`) — D12 Q5 설치 축이 계산하는 바로 그 상태 | **고칠 가치 있음** → 후보 C |
| F5 | 아키텍처 규칙 실행 + 리뷰 피드백 승격 (10) | `boundary check`, `/harness-promote`(학습 3회 → `.claude/rules`), gates | 승격 장치 실사용 0건(이 저장소 `.claude/rules` 없음). 승격 대상이 산문 규칙이라 10의 "실행 가능" 기준과 다르다 | "`docs:generate` 전에 `git add`" 9회 반복(`audit-cleanup:158` 외 8) — 원인은 인벤토리가 `git ls-files` 기준(`scripts/generate-harness-overview.mjs:101`) | **고칠 가치 있음** → 후보 D (규칙 승격이 아니라 원인 제거) |
| F6 | 관측성 — 런타임 신호 + 과정 산출물, 계약, 루브릭 (11) | observe 트립와이어 + SessionStart 표면(`session-context.mjs:126-132`), artifact·Reviews, Done evidence·scenarios, 루브릭 | 임계값을 실데이터로 보정한 적 없음 | `observability-consumer-artifact.md:68,70` | **미확인** — 소비자 실데이터가 필요 |
| F7 | 실패 기록과 귀인 (02:71) | failure capsule + Cause(task `capsule-cause`, D12 ③) | — | 0.52.0에 막 도입 | **있음** — 재평가는 D12 신호 |

### 강의 항목에 걸리지 않는 반복 패턴
- **PATH의 CLI와 저장소 코드·버전 불일치**(5건: `global-cli-drift:74`, `review-adopt-record-quality:144` 등) — doctor `global CLI version drift`가 있다. 판정: 장치 있음.
- **하네스가 쓴 파일이 가드를 더럽혀 `--force`가 정상화**(5건) — 사례마다 닫혔다(`review-scope-handoff`, `handoff-hook-churn` 등). 판정: 해결됨, 재발 시 패턴으로 본다.

### 후보 task (D12 형식 — 각각 별도 task·PR, 착수는 메인테이너 승인 뒤)
우선순위는 실사용 근거 × 크기 순이다. 모두 **새 명령을 만들지 않는다**(2차 장치 규칙). AGENTS.md 바이트를 더하는 후보는 없다 — A의 대안 하나만 예외로 표시했다.

- **A. 검증 명령의 정본 하나 — 피드백 F1.** `/verify`와 에이전트가 읽는 검증 명령을 커밋 게이트 목록과 같은 출처로 맞춘다.
  D11 ① S4 구현 검증·S5 커밋 ② 언어 지식은 이미 프리셋 commit 규칙에 있다 — 새 지식 없음 ③ 일부 그렇다(`## 명령` 렌더가 프리셋 지식을 쓰지 않음).
  2차 장치 규칙: 권장안은 `/verify`(lazy 스킬)가 `.harness/gates.json`을 먼저 읽고 없을 때만 `## 명령`으로 내려가는 것 — **eager 0 B**. 대안인
  `## 명령`에 `verify: .harness/gates.json` 한 줄은 약 +50 B(여유 233 B의 약 1/5)라, 택하면 같은 `stack` 절에서 줄일 문장을 함께 낸다.
- **B. 리뷰어 허용 범위 좁히기 — 도구 T2.** `Bash(codex:*)`를 빼거나 read-only 호출로 좁힌다.
  D11 ① 가로축 안전 가드 ② 아니오 ③ 아니오 — 원래 장치를 **줄이는** 방향이라 2차 장치 규칙에 맞는다.
  spec에서 실측할 것: Claude Code 접두 규칙이 뒤에 붙는 위험 플래그를 막는지, settings 배열이 합집합 병합이라 소비자에게서 항목을 뺄 수 없는 문제
  (`settings-ask-tier-artifact.md:179-196`)를 migrate 일회성 단계로 풀지 doctor 안내로 풀지, 직접 호출 안내(`commands/harness-review.md:169`)의 처리.
- **C. 게이트 실패 메시지의 원인 단서 — 피드백 F4.** 게이트 명령이 실패하면 이미 있는 installTrace 판정(`stack`, D12 Q5)을 재사용해 `absent`일 때
  "환경 원인 가능 — `<bootstrap>`" 한 줄을 붙인다. D11 ① S5 커밋 + D12 재평가 신호(귀인 `environment`)의 입구 ② 지식은 프리셋 installTrace에 이미 있다
  ③ 아니오 — 기존 메시지 확장. eager 0 B. 근거가 가장 강하다(heliosent 실사고와 D12 Q5가 같은 상태).
- **D. 저장소 유지보수 문서·도구의 낡음 원인 제거 — 피드백 F5 + 지시 I7.** ① 문서 인벤토리가 작업 트리를 보게 해 "`docs:generate` 전에 `git add`" 학습(9회)을
  불필요하게 만든다(`scripts/generate-harness-overview.mjs:101` — 삭제됐지만 index에 남은 파일 처리를 spec에서 정한다). ② `MAINTAINING.md:52`의 eager 수치를
  지우고 측정 명령만 남긴다. 저장소 전용이라 D11 ①의 사이클 단계 질문은 해당 없음. CLAUDE.md §3의 승격 조건(3회 이상)을 넘었고, 2차 장치 규칙상
  규칙 승격보다 원인 제거가 빼는 방향이다.
- **E. TCC 가치 재검토 — 상태 S2.** 42/144 미작성은 규범이 지켜지지 않거나 TCC가 덜 쓰인다는 신호다. D11 ① 가로축 인계 ② 아니오 ③ **그렇다** —
  TCC를 지키는 감지(`context check`가 scaffold 그대로인 카드를 warning, SessionStart nudge)를 붙이기 전에 TCC를 줄이는 안(task 생성 시 plan 첫 단계로
  채우기, 필드 축소, 폐지하고 handoff로 대체)을 먼저 검토한다. `context check`를 done 게이트로 쓰는 안은 기각돼 있다(`followups.md:52`). 우선순위 가장 낮다.

**올리지 않은 것 (재론 조건)**: T1 권한 프롬프트 빈도·F6 트립와이어 보정 — 소비자 observe 실데이터가 생기면. S6 세션 종료 검사 — 커밋 게이트로 못 잡은
세션 종료 사고가 2건 이상이면. I6 규칙 만료 칸 — 규칙 파일에서 낡은 규칙이 사고를 내면.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **하위 시스템**: 강의 02의 하네스 5요소 중 지시·도구·상태·피드백(환경은 D12). 정의는 강의 02 `:52-60`이 정본이다.
- **강의 항목**: 강의 02 본문이 그 하위 시스템에 요구한 것(1차)과, 03–12가 같은 하위 시스템에 더한 것(장치나 빈틈이 있을 때만).
- **장치**: 그 항목을 다루는 하네스의 파일·명령·훅·규범. `파일:줄`로 가리킨다.
- **빈틈**: 강의 항목 중 장치가 읽지 않거나 다루지 않는 부분.
- **판정**: 고칠 가치 있음(후보 task로) / 의도적으로 안 함(기록된 결정 또는 "(추론)" 근거) / 미확인(판정에 필요한 데이터가 없음) / 있음(빈틈 없음).
- **실사용 근거 라벨**: 소비자 · dogfood · 개발중.
- **후보 task**: 판정이 "고칠 가치 있음"인 빈틈을 D11 판정 질문 ①②③과 2차 장치 규칙으로 걸러 묶은 단위.
- 게이트 통과 근거: 목표·제약·완료 기준·영향 범위가 위 절에 모두 적혔고 남은 모호점은 R1에서 결정으로 닫았다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 네 하위 시스템을 강의 02 기준으로 감사해 판정과 후보 task를 낸다.
- [x] **Constraint 명확도** (30%) — 코드·decisions 무변경, push·PR 없음, 원문 없는 항목은 추측 금지, eager 여유 233 B.
- [x] **Success 기준** (30%) — 감사표·판정·후보가 spec과 artifact에 있고 `npm test` fail 0, `npm run docs:check` 최신.
- [x] **Context 명확도** (brownfield 한정) — 하위 시스템별 장치를 `파일:줄`로 식별했다(위 표).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "required" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 본보기: `docs/decisions.md` D11(`:192-247`)·D12와 정정·Q5 결과(`:249-344`).
- 강의 원문: https://github.com/walkinglabs/learn-harness-engineering/tree/a9342ff471f2c0e60be0c08b9f4a7c502df4e442/docs/en/lectures
- 측정 명령: eager — `wc -c AGENTS.md CLAUDE.md`(상한은 `tests/agent-files.test.mjs:448`). TCC 미작성 — 추적 `docs/*/*/*-context.md` 중 `- Current atomic step:` 뒤가 빈 파일 수.
