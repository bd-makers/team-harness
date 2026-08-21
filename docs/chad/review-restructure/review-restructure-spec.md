# review-restructure — Spec

## 목적 / 요구사항

리뷰 커맨드 표면을 엔진 중립으로 재편한다. 현재는 엔진(codex)이 커맨드명에 박혀 있어
(`/harness-codex-review`, `/harness-codex-adversarial-review`) claude-only 팀원이 쓸 수 있는
리뷰 경로가 없고, 엔진이 늘 때마다 커맨드가 프레이밍 수만큼(×2) 곱으로 늘어난다.

요구사항:

1. 커맨드 2개로 재편 — `/harness-review`, `/harness-adversarial-review`.
   엔진(`codex|claude|gemini|custom`)은 첫 위치 인자. 나머지 인수 계약(`--base <ref>`, focus)은 현행 유지.
2. 엔진 인자 생략 시 probe 폴백 체인: `command -v`로 **codex → gemini → claude** 순 탐지,
   첫 가용 엔진으로 실행. claude는 Claude Code 환경에서 항상 존재하므로 어느 머신에서든 동작이 보장된다.
3. 실행된 엔진을 artifact `## Reviews` 기록에 명기한다.
4. claude 엔진의 한계("컨텍스트 분리만 제공, vendor 분리 없음")를 커맨드 문서에 명시한다 —
   폴백 체인에서 claude가 마지막인 근거.
5. custom 엔진은 `.harness/reviewers.json`의 `{"custom": {"command": "... {prompt} ..."}}` 템플릿을 치환해
   실행한다. 파일·키가 없으면 설정 안내 후 종료(실패시키지 않음).
6. 기존 커맨드·스킬 4개(`harness-codex-review`, `harness-codex-adversarial-review` 커맨드+스킬)는
   1개 마이너 버전 동안 deprecated 포워딩 문서로 유지 후 다음 마이너에서 제거한다.
7. Codex측 wrapper 스킬도 같은 이름 체계로 재편 — `skills/harness-review/`, `skills/harness-adversarial-review/`.

## 설계 / 접근

핵심 관찰: **엔진과 프레이밍(통상/적대적)은 직교**한다. 절차(preflight → scope → 실행 → 발견 검증
→ artifact 기록 → 보고)는 엔진 무관이고, 엔진 차이는 3단계 runner 한 줄뿐이다. 따라서:

- `commands/harness-review.md` — 전체 절차 + 엔진 결정(인자 or probe 체인) + 엔진 runner 표를 소유.
- `commands/harness-adversarial-review.md` — 현행 상속 패턴 유지: 절차는 base 참조, 리뷰 프롬프트 프레이밍만 교체.

엔진 runner 표:

| 엔진 | runner | 비고 |
|---|---|---|
| codex | `codex exec --sandbox read-only "<prompt>" < /dev/null` | 현행 그대로. `< /dev/null` stdin 경고 유지 |
| gemini | `gemini --approval-mode default -p "<prompt>"` | AGENTS.md 역할표의 공식 호출 |
| claude | `claude -p "<prompt>"` + read-only 강제 | 정확한 플래그는 구현 시 실측으로 핀(`--permission-mode plan` 또는 allowedTools 제한). 컨텍스트 분리만 제공 — 한계 명시 |
| custom | `.harness/reviewers.json` 템플릿 치환 | `{prompt}` placeholder. 미설정 시 안내 후 종료 |

deprecated alias: 기존 커맨드 파일 2개는 "deprecated — `/harness-review codex`로 진행하라"는 얇은
포워딩 문서로 교체하고 plugin.json에 계속 등재. 스킬 2개도 동일하게 얇은 포워딩으로.

부수 갱신: plugin.json(신규 커맨드 2개 추가), CHANGELOG, README·AGENTS.md의 리뷰 언급.
전역 CLAUDE.md 2대와 메모리(codex-review-invocation)는 릴리스 후 별도 갱신.
버전 범프는 main에서 `/harness-release`로 별도 수행(0.17.0 예상) — 이 task 범위 밖.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **엔진(engine)**: 리뷰를 실제 수행하는 외부 CLI 프로세스(codex/claude/gemini/custom). 커맨드명이 아니라 인자.
- **프레이밍(framing)**: 리뷰 프롬프트의 질문 방향 — 통상("결함이 있는가") vs 적대적("거부되어야 할 이유가 있는가"). 커맨드 차원.
- **probe 폴백 체인**: 엔진 인자 생략 시 `command -v`로 codex → gemini → claude 순 탐지해 첫 가용 엔진을 쓰는 규칙.
- **deprecated alias**: 옛 이름의 커맨드/스킬 파일을 새 커맨드로 포워딩하는 얇은 문서. 1개 마이너 버전 수명.
- **reviewers.json**: `.harness/reviewers.json` — custom 엔진 runner 템플릿을 담는 커밋 가능한 팀 공유 설정(gitignore 대상 아님).

게이트 통과 근거: 브레인스토밍에서 4개 갈림길(커맨드 형태·기본 엔진·구명 처리·custom 설정)을
AskUserQuestion으로 확정하고 통합 설계를 사용자가 승인함 (2026-08-21).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? (리뷰 커맨드 표면을 엔진 중립 2커맨드로 재편)
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? (버전 범프 범위 밖, alias 1버전 유지, review-only 계약 불변)
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (아래 검증 절 + doctor/테스트 통과)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? (commands 2, skills 2, plugin.json, README, AGENTS.md, CHANGELOG)
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 검증(완료 기준)

- `npm run test` 통과 (기존 테스트 회귀 없음; 커맨드 매니페스트 검사류 포함 여부는 구현 시 확인)
- plugin.json에 등재된 모든 커맨드 파일이 실제 존재
- claude 엔진 runner를 실측 1회 실행해 read-only 강제 플래그가 실제로 쓰기를 차단함을 확인
- deprecated 커맨드 문서가 새 커맨드를 정확히 가리킴

## 참고
- 현행 계약: `commands/harness-codex-review.md`, `commands/harness-codex-adversarial-review.md`
- AGENTS.md 역할표(D2·D4·D5), 리뷰 프로토콜
- 선행 task: docs/chad/codex-review-commands/ (기존 커맨드를 만든 task)
