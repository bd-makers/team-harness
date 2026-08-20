# d5-parallel-pr-scope — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**PR:** https://github.com/bd-makers/team-harness/pull/24 (base `main`, 머지하지 않음)
**브랜치:** `ao/harness-aijient-team-plugin-2/d5-parallel-pr-scope`
**커밋:** `514c089 docs(agents): D5 결정 추가 — 단일 스레드 쓰기 범위를 같은 워킹트리로 정정`

### 무엇을 했나

`AGENTS.md` roles 절 D4(2026-07-28) **바로 뒤에** D5(2026-08-20) 결정 노트를 append 했다.
D4 원문은 한 글자도 수정하지 않았다 — 이 파일은 append-only 결정 원장이고, 뒤 항목이 앞 항목을
정정하는 것이 설계 의도다(D4도 D2를 지우지 않고 정정했다).

D5의 요지:

- 단일 스레드 쓰기 규칙이 금지하는 범위 = **같은 워킹트리·브랜치 안에서의 동시 쓰기**
- 격리된 브랜치 또는 git worktree에서 각자 작업하고 **PR/MR로 병합하는 것은 허용·권장 병렬 경로**
- D4를 뒤집는 것이 아니라 **범위를 정정** — "OpenCode는 순차 전환 세션"이라는 D4 규정은
  같은 워킹트리를 공유할 때의 기준으로 그대로 유지
- 유지되는 제약 명시: task SSOT 4파일은 각 task 디렉터리에 격리되고,
  `docs/task_summary.md`·`docs/<user>/<user>-task.md`는 생성물이라 기본 브랜치에서
  `summary --write`로만 갱신
- 근거: 격리 작업공간 + 리뷰 게이트를 통한 병합은 병렬 쓰기의 상충 위험을 제거하면서
  병렬성을 얻는 표준 방식

### 변경 파일 (문서 전용 — `src/` 무변경)

| 파일 | 변경 |
|---|---|
| `AGENTS.md` | D4 뒤 D5 blockquote append |
| `templates/AGENTS.md.hbs` | 동일 (쌍 편집) |
| `CLAUDE.md` | §2 불릿에 "같은 워킹트리·브랜치 안에서" 한정 추가 + 격리 병렬 허용 불릿 신설 |
| `templates/CLAUDE.md.hbs` | 동일 (쌍 편집) |
| `CHANGELOG.md` | `[Unreleased]` 항목 추가 — 버전 범프 없음 |

### CLAUDE.md §2 불릿 판단

손봐야 한다고 판단했다. 기존 불릿은 "쓰기는 단일 스레드로 유지한다"를 무조건 금지로 읽히게 하면서
근거로 D4만 가리켰다. D5로 범위가 정정된 이상 이 불릿을 그대로 두면 소비자 프로젝트가 "격리
브랜치 병렬도 금지"로 오해한다. 다만 회귀 가드가 문자열을 고정하고 있어 **문구를 덧붙이는 방식**으로만
고쳤다 — `병렬 작성·결정 에이전트는 두지 않는다`, `쓰기는 단일 스레드로 유지한다`,
`컨텍스트 격리 서브에이전트`는 모두 원문 그대로 살아 있다.

### 검증 (실제 출력)

`npm run test` 전체:

```
ℹ tests 290
ℹ pass 290
ℹ fail 0
ℹ duration_ms 20964.1275
✔ boundary performance: cold check <100ms and plan checkpoint <200ms ... (682.411917ms)
ℹ tests 1 / pass 1 / fail 0
```

문서 쌍 가드 개별 실행 (`tests/agent-files.test.mjs` + `tests/e2e/ssot-consistency.test.mjs`) —
20 pass / 0 fail. 핵심 항목:

```
✔ 저장소 루트 AGENTS.md는 렌더된 템플릿의 관리 절과 드리프트하지 않는다
✔ 저장소 루트 CLAUDE.md는 렌더된 템플릿의 관리 절과 드리프트하지 않는다
✔ AGENTS.md(core)는 D2 이력을 보존한 채 D4 단일 스레드 쓰기 결정을 담는다
✔ AGENTS.md(core) roles 표의 OpenCode 행은 순차 전환 세션 — "병렬 작성 세션" 회귀 금지
✔ CLAUDE.md(thin) §2는 컨텍스트 격리 서브에이전트는 유지, 병렬 작성·결정은 금지
✔ scaffold 되는 AGENTS.md/CLAUDE.md 쌍은 병렬 쓰기 서술에서 모순되지 않는다
✔ L3 SSOT [bare-node/next/react-native]: AGENTS source + @import + cursor/opencode mirrors
```

`harness-team context check` → `context: valid` (1943/6144 bytes, 26/100 lines, 0 capsules).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

- **2026-08-20 — 외부 리뷰 미실행.** 문서 텍스트 전용 변경(실행 경로 없음)이라 `harness-codex-review`를
  돌리지 않았다. 대신 PR #24의 사람 리뷰를 게이트로 둔다. Gemini CLI는 이 머신에 미설치 — 미실행.

## Learnings

- **결정 원장은 append-only다.** D4를 고쳐 "범위는 같은 워킹트리"라고 쓰는 편이 짧지만, 그러면 왜 범위
  질문이 생겼는지가 사라진다. 문서 내부 긴장(D4 vs 작업 프로토콜의 "브랜치 병렬 무충돌")은 지워야 할
  오류가 아니라 D5가 답한 실제 질문이다. 날짜 붙은 항목을 쌓으면 결정의 궤적이 남는다.
- **테스트가 문서 문구를 고정하고 있으면 "덧붙이기"가 유일한 안전 편집이다.**
  `tests/agent-files.test.mjs`는 `쓰기는 단일 스레드로 유지한다` 같은 부분 문자열을 `assert.match`로
  잡는다. 문장을 다시 쓰면 회귀 가드가 깨지지만, 앞뒤에 한정어를 붙이면 부분 문자열은 살아남는다.
  **문서를 고치기 전에 무엇이 문자열로 고정돼 있는지 먼저 grep 한다.**
- **루트 파일 ↔ 템플릿 쌍은 문자 단위로 대조된다.** `extractSections(render(template))`와
  `extractSections(rootFile)`를 `assert.equal`로 비교하므로 공백 하나만 달라도 실패한다.
  두 파일을 손으로 각각 편집하지 말고 **같은 치환을 스크립트로 양쪽에 적용**하는 편이 안전하다
  (이번에는 python 한 번으로 4파일 동시 치환).
- **역할 표 가드는 행 단위 정규식(`/^\|\s*\*\*/`)이다.** `병렬` 금지는 표 행에만 걸리므로 blockquote
  결정 노트에는 자유롭게 쓸 수 있다. 가드의 적용 범위를 읽지 않으면 불필요하게 표현을 우회하게 된다.
