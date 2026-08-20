# ship-command — Spec

## 목적 / 요구사항

PR/MR을 열기 직전에 그동안 작성한 `spec`·`plan`·`artifact`를 최종 갱신하고,
다이어그램은 **옵트인**으로 갱신·생성한 뒤 **"PR/MR 준비 완료" 상태를 보고하는**
새 커맨드 `/harness-ship`을 추가한다.

- 현재 하네스에는 PR/MR 개념이 전무하다(전수 grep 0건). 라이프사이클이 `harness-team done`에서
  끝나 문서와 실제 머지 사이가 비어 있다. 리뷰어가 문서를 실제로 읽는 시점은 PR인데,
  그 시점에 문서가 최신이라는 보장이 없다.
- 요구사항
  1. 활성 task 확인 → spec·plan·artifact 최종 갱신 → 다이어그램(옵트인) → 준비 완료 보고.
  2. **PR 생성·푸시는 하지 않는다.** 준비 완료 보고에서 멈추고 실제 PR은 사용자 지시로 별도 진행.
  3. 다이어그램 도구는 **하드 의존 금지** — 없으면 실패하지 않고 건너뛰며 artifact에 '미실행' 기록.
  4. `harness-team done`은 건드리지 않는다.

## 설계 / 접근

- **새 커맨드로 분리하고 `done`은 손대지 않는다.** 이 저장소의 실제 릴리스 플로우는 PR 없이
  main에 직접 범프 커밋 → 태그 푸시다. `done`에 PR 단계를 끼우면 그 플로우가 깨진다.
- **새 CLI 서브커맨드를 만들지 않는다 (결정 + 근거).** ship이 하는 일은 "문서가 현재 코드와
  맞는지 판단해 갱신"하는 **에이전트 판단** 작업이라 결정론적 CLI로 표현할 대상이 없다.
  게다가 `tests/manifest-sync.test.mjs`의 "bin subcommands referenced in commands/ exist in the
  router"가 commands/*.md 안의 모든 `harness-team <sub>` 표기(백틱·줄머리, 예시 코드펜스 포함)를
  스캔해 `bin/harness-team.mjs`의 router case와 대조한다 — 즉 CLI 없는 서브커맨드를 문서에
  적는 것 자체가 CI에서 막힌다. 따라서 command doc + Codex skill 래퍼만으로 구현한다.
  ship이 참조하는 CLI는 기존 router case인 `context`·`retro` 뿐이다.
- **다이어그램 실행 계약: probe → degrade → record** (`commands/harness-codex-review.md`의
  Preflight·기록 문체를 그대로 따름).
  - `diagram-design`은 이 플러그인 것이 아니라 별도 마켓플레이스의 **Claude Code 전용 플러그인**이며
    **머신별 설치**다. 하드 의존하면 한쪽 머신에서 깨진다.
  - probe는 `command -v`로 할 수 없다 — 바이너리가 아니라 스킬이다. "스킬이 노출되지 않거나
    호출이 실패하면"이 판정 기준이며, 설치 명령을 단정해 안내하지 않는다.
  - 없으면 **건너뛰고 artifact에 '미실행' 한 줄**. 직접 인라인 SVG를 대신 그리지 않는다 —
    그러면 옵트인의 의미가 사라진다.
- **Claude 전용 호출의 위치.** `AGENTS.md`는 Codex·Cursor·OpenCode도 읽는 멀티에이전트 SSOT라
  Claude 전용 스킬 호출(`/diagram-design:diagram-design`)을 거기 박으면 안 된다.
  AGENTS.md에는 도구 중립 한 줄만, 구체적 호출은 `commands/harness-ship.md`(및 Codex 래퍼 번역)에.
- **산출물 형식.** `docs/`는 Obsidian 볼트 안이라 **script 태그가 제거되어 mermaid JS가 렌더되지
  않는다.** 볼트에서 보이는 것은 **inline SVG 자립형 HTML** 뿐이므로 산출물은
  `docs/<user>/<name>/` 아래 `<name>-diagram.html` 하나의 자립형 HTML이며, **SSOT 4파일이 아닌
  생성물**이다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **ship**: PR/MR을 열기 **직전**에 문서(spec·plan·artifact)를 코드 현실과 일치시키고 준비 완료를
  보고하는 단계. 커밋·푸시·PR 생성을 포함하지 않는다.
- **done**: task 자체의 완료 처리(`harness-team done`). ship과 별개이며 ship이 대체하지 않는다.
- **옵트인(다이어그램)**: 사용자가 직접 친 커맨드 안에서 **한 번 묻는 것**. 사용자 응답을 어디에도
  저장하지 않는다 — `.harness/config.json` 스키마 추가도, 전용 doctor 체크도 만들지 않는다.
  잔소리 문제가 없으므로 저장할 상태가 없다.
- **`<name>-diagram.html`**: task 디렉터리의 **생성물**. SSOT 4파일(spec·plan·handoff·artifact)에
  포함되지 않으며, 없어도 task는 유효하다.
- **Ambiguity 게이트 통과 근거**: 브리프(W3-brief.md)가 목적·확정 설계 결정·제약·산출물·검증
  기준을 모두 지정했고, 영향 파일 집합을 이 저장소에서 직접 확인해 아래 4항목을 모두 충족했다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — PR/MR 직전에 문서를 최종 갱신하고 준비 완료를 보고하는 커맨드
  `/harness-ship`을 추가한다(PR 생성은 하지 않는다).
- [x] **Constraint 명확도** (30%) — `done` 불변, PR 자동 생성 금지, 다이어그램 도구 하드 의존 금지,
  버전 범프 금지, `harness-team <sub> --help` 금지, 검증은 샌드박스에서.
- [x] **Success 기준** (30%) — `npm run docs:check` 통과 + `npm run test` 전체 통과(실제 출력으로
  확인) + 커맨드/스킬/매니페스트/문서 쌍이 모두 동기화되어 manifest-sync·agent-files·
  ssot-consistency·documentation-inventory-pointers가 녹색.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일: `commands/harness-ship.md`(신규),
  `skills/harness-ship/SKILL.md`(신규), `.claude-plugin/plugin.json`, `AGENTS.md` ↔
  `templates/AGENTS.md.hbs`, `README.md`, `CHANGELOG.md`, `docs/harness-overview.html`(생성물).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0.

## 참고
- `commands/harness-codex-review.md` — probe → degrade → record 문체의 원본
- `skills/harness-task/SKILL.md` — Codex 래퍼 형식의 원본
- `tests/manifest-sync.test.mjs`, `tests/cli-drift.test.mjs`, `tests/agent-files.test.mjs`,
  `tests/e2e/ssot-consistency.test.mjs`, `tests/documentation-inventory-pointers.test.mjs`
