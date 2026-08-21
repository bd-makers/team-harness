# instruction-structure — Spec

## 목적 / 요구사항

AGENTS.md(코어) + CLAUDE.md/GEMINI.md(얇은 어댑터) 지시 구조의 중복·비대를 제거하고,
순간(moment)에 결합된 절차를 lazy 정본으로 이관한다. 2026-08-21 세션 분석에서 도출·승인된 수정안:

- **P1 다이어그램 옵트인 4중 중복 제거**: 정본 = `commands/harness-task.md`.
  AGENTS.md는 도구 중립 요약 1블록만(멀티에이전트 계약 유지 — Codex/Cursor/OpenCode는
  플러그인 commands/를 못 읽으므로 요약 자체는 남긴다), CLAUDE.md §1-B는 삭제.
- **P2 CLAUDE.md 슬림화**: 상시 행동 기본값(§1·2·3·4·5·5-A·6)만 남기고,
  순간 결합 절차(§1-A task 시작, §1-B task 생성)는 제거.
- **P4 결정 로그 분리**: D2/D4/D5 전문 → `docs/decisions.md`(신설, 템플릿 포함).
  AGENTS.md roles 절에는 규범 요약 + 포인터만.
- **P5 TCC 상세 축약**: capsule 경계 파싱 규칙은 코어에서 제거 —
  `harness-team context check`의 결정론 검사 + failure 메시지에 위임.
- **1-A 게이트의 문서 운반**: spec 템플릿(taskSpecTemplate) 자가진단 안내문에
  게이트 규칙(복귀·Ontology 근거 기록)을 직접 심는다 — 에이전트 중립 lazy.
- **P3 전역 ~/.claude/CLAUDE.md 드리프트 수정**: 구식 명령(`/harness-task new feature`) 정정 +
  "하네스 프로젝트에서는 프로젝트 파일 우선" 명시. (플러그인 레포 밖 — 별도 커밋 없음, 이 머신만)

## 설계 / 접근

- 수정 기점은 `templates/*.hbs` — 루트 AGENTS.md/CLAUDE.md는 마커 절을 템플릿과 동일하게 갱신
  (drift 테스트 `agent-files.test.mjs`가 동일성을 강제).
- apply는 마커 절을 통째로 교체하므로 소비 프로젝트에 자동 전파. D-log 전문은
  `templates/docs/decisions.md`로 스캐폴드(init/apply 공통 `copyStaticAssets`, skipExisting)되어
  기존 소비 프로젝트에서도 정보 소실 없음.
- lazy 판별 기준: **트리거를 컨텍스트 없이 인지할 수 있는가.** 트리거가 명령·파일·훅·가드로
  표현되면 절차는 lazy 정본으로, 트리거 문장만 eager 유지. 상황 인식형 규칙(§5-A 등)은 eager 유지.
- 현 설계를 고정한 테스트(3표면 계약 등)는 새 설계(정본 1곳 + 도구 중립 요약)를 고정하도록 재작성.
  의도(건너뛴 단계 종결 규칙, done 가드 정합)는 보존한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **eager 지시**: 매 세션 무조건 컨텍스트에 로드되는 지시(AGENTS.md·CLAUDE.md·전역 CLAUDE.md).
- **lazy 정본**: 특정 순간에만 로드되는 절차의 단일 소스(커맨드 문서·스킬·훅 주입·가드 메시지·문서 템플릿).
- **트리거/절차 분해**: 규칙 = 트리거(eager 1줄) + 절차(lazy 정본). 트리거 없는 lazy는 잊히고,
  절차까지 eager면 비대해진다.
- **표면(surface)**: 같은 규칙이 서술된 파일 위치. 표면 수 > 1이면 드리프트 위험.

게이트 통과 근거: 사용자가 분석 보고의 수정안(P1~P5+lazy 설계)을 그대로 승인 — 목표·제약·완료 기준이
보고서에 구체화되어 있음.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (npm test green + 마커 드리프트 0 + 표면 수 감소)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- 분석 세션: 2026-08-21, worktree `harness-instruction-structure-7ada8a`
- 리뷰 정본 패턴 선례: ship("절차·산출물 계약은 ship 명령 문서가 정본", AGENTS.md)
