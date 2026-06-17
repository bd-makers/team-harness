# harness-aijient-team-plugin — AI Team Contract (Core)

> 이 파일(`AGENTS.md`)이 모든 에이전트가 공유하는 **단일 소스(SSOT)** 입니다 — agents.md 오픈 표준.
> `CLAUDE.md` / `GEMINI.md` 는 `@AGENTS.md` 를 import 하는 얇은 파일이며, 이 코어를 복제하지 않습니다.
> Cursor / OpenCode 는 `AGENTS.md` 를 네이티브로 읽습니다.

<!-- harness:section="principles" begin -->
## 핵심 원칙

- **단순함 우선**: 모든 변경을 최대한 단순하게. 최소한의 코드에만 영향을 준다.
- **게으름 금지**: 근본 원인을 찾는다. 임시 수정은 없다. 시니어 개발자 기준을 적용한다.
- **최소 영향**: 필요한 것만 건드린다. 버그 유입을 피한다.
<!-- harness:section="principles" end -->

<!-- harness:section="stack" begin -->
## 기술 스택
- **Runtime**: Node.js
- **Package Manager**: npm
- **Language**: TypeScript

## 명령
- install: `npm install`
- dev: `(configure)`
- test: `npm run test`
- lint: `(configure)`
- typecheck: `(configure)`
<!-- harness:section="stack" end -->

<!-- harness:section="roles" begin -->
## AI 팀 역할 분담

이 프로젝트에서 각 AI 에이전트가 맡는 역할과 호출 방식입니다.
필요에 따라 재정의하세요 — 단, 이 섹션은 `harness-team apply` 실행 시 갱신 대상이므로
마커(`<!-- harness:section="roles" -->`)는 유지해 주세요.

| 에이전트 | 역할 | 호출 방식 |
|---|---|---|
| **Claude Code** | 리드 프로그래머 (drive) | 주 세션 |
| **OpenCode** | 보조 드라이버 (병렬 작성 세션) | `opencode.json` 설정 |
| **Codex** | 리뷰어 (read-only) | Bash: `codex exec --sandbox read-only` |
| **Gemini** | 리뷰어 (read-only) | Bash: `gemini --approval-mode default -p` |
| **Cursor** | 보조 에디터 (IDE) | `.cursor/rules/*.mdc` 자동 적용 |

> **D2 (2026-06-11):** drive 주체 = Claude·OpenCode, 리뷰어 = Codex·Gemini.
> 독립 리뷰어의 가치는 작성자와의 분리에서 나오므로 리뷰 루프 정착을 우선한다.
> (Codex 하네스 확장 시 D2 재평가 — 그때 driver 승격 검토.)

### 리뷰 프로토콜
중요한 변경(새 기능, 아키텍처, 복잡한 리팩토링, 보안, 스키마/API) 완료 후
아래 **코드 리뷰 기준**을 따릅니다.
리뷰 결과(요약·발견·조치)는 활성 task의 `<name>-artifact.md` **## Reviews** 섹션에
날짜와 함께 남깁니다 — 남기지 않은 리뷰는 "안 한 것"으로 간주합니다.
<!-- harness:section="roles" end -->

<!-- harness:section="protocol" begin -->
## 작업 프로토콜

### task 단위 관리
모든 작업은 `docs/<user>/<name>/` 아래에서 관리됩니다.
각 task 디렉토리는 네 파일로 구성:
- `<name>-spec.md` — 요구사항/설계 (Ambiguity 자가진단·Ontology 포함)
- `<name>-plan.md` — 단계별 체크리스트 (완료 시 `- [x]`로 체크)
- `<name>-handoff.md` — 세션 인수인계 (post-commit hook 자동 갱신)
- `<name>-artifact.md` — 실행 결과·학습 (`task done`·`retro` 시 append)

이 네 파일이 task의 **SSOT**다. 상세 설계를 외부 문서(docs 루트·`superpowers/plans` 등)로
분리하더라도 `<name>-spec.md`를 외부를 가리키는 포인터 껍데기로 두지 말 것 —
요구사항·자가진단·Ontology는 spec.md에 직접 쓰고, 외부 문서는 보조 참조로만 둔다.
(doctor가 자가진단 없는 포인터 껍데기 spec을 경고한다.)

활성 task는 `.harness/active.json`에 저장.

### 세션 시작 시 (반드시 수행)
1. `docs/<user>/<user>-handoff.md` 읽기 — 현재 active task 확인
2. 활성 task의 `<name>-plan.md` 읽기 — 현재 단계 파악
3. 필요시 `<name>-spec.md`에서 맥락 보강

> **task-gate (자동):** SessionStart 훅이 `harness-team session-context`를 호출해
> 활성 task 유무를 주입한다. 활성 task가 없으면 첫 작업 프롬프트에서 `AskUserQuestion`으로
> **재개 / 새 task / task 없이 진행**을 확인하라 — 이는 block이 아닌 nudge이며 판단은 Claude 몫.

### task 워크플로우
- **시작**: `harness-team task <name>` — 생성 또는 활성화
- **진행**: `<name>-plan.md` 체크리스트 항목 완료 시 `- [x]`로 갱신
- **commit 시**: post-commit hook이 `<name>-handoff.md`와 `<user>-handoff.md` 자동 갱신
- **완료**: plan 전체 완료 감지 또는 사용자 신호 → AskUserQuestion → `harness-team done`

### 코드 리뷰 기준
중요한 변경 완료 시 아래 항목을 순서대로 확인하고 결과를 사용자에게 보고합니다:

- **정확성**: 의도한 동작과 실제 구현이 일치하는가
- **엣지 케이스**: 경계 조건과 오류 경로가 처리됐는가
- **회귀**: 기존 기능에 영향이 없는가 (관련 테스트 통과)
- **보안**: 입력 검증, 인증/인가, 민감 데이터 노출 없는가
- **단순성**: 더 간단한 구현이 가능한가, 불필요한 추상화가 없는가
- **테스트**: 핵심 동작과 실패 케이스가 테스트로 커버됐는가

사소한 변경(포맷, 문서, 의존성 업데이트)에는 생략해도 됩니다.

### 컨텍스트 파일
| 파일 | 용도 |
|---|---|
| `AGENTS.md` | 이 파일 — 공유 코어 규칙 (SSOT, 오픈 표준) |
| `CLAUDE.md` | `@AGENTS.md` import + Claude 전용 (워크플로우·서브에이전트·advisor) |
| `GEMINI.md` | `@AGENTS.md` import + Gemini 리뷰어 지침 |
| `docs/<user>/<name>/` | task별 작업 문서 4종 (spec·plan·handoff·artifact) |
| `.harness/active.json` | 현재 활성 task 포인터 |
| `docs/<user>/<user>-handoff.md` | 세션 시작 진입점 |
| `.claude/rules/*.md` | 영역별 코딩 규칙 |
<!-- harness:section="protocol" end -->
