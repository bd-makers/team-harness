# claude5-context-apply — Spec

## 목적 / 요구사항

Anthropic 블로그 "The New Rules of Context Engineering for Claude 5 Generation Models"
(2026-08-30 검토, https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)
권고 중 하네스에 적용 가능하다고 판정한 4건을 반영한다.

1. **auto-memory ↔ artifact.md 경계 규칙** — Claude 5 세대의 auto-memory가 팀 학습을
   개인 메모리로 흡수해 SSOT(artifact.md)에서 사라지는 것을 막는 1줄 규칙을
   `templates/CLAUDE.md.hbs` §3(자기개선 루프)에 추가하고 루트 `CLAUDE.md`에 동기화.
2. **CLAUDE.md.hbs eager 감량** — §4(완료 전 검증)·§5(우아함)·§6(자율 버그 수정)의
   서술형 불릿을 판단 기반 1~2줄로 압축. 레버 자체와 예외 문구("작은 버그·문서 수정 생략")는
   유지. 근거: 블로그 shift 1(rules→judgment, 시스템 프롬프트 80% 삭제 무손실) +
   0.8.0 도그푸딩 기록(선언 레버 채택률 저조). **Claude 전용 파일에 한정** —
   AGENTS.md는 다중 엔진(Codex·Gemini·Cursor·OpenCode) 공유 규범이라 건드리지 않는다.
3. **doctor eager 계층 크기 경고** — 대상 프로젝트의 always-on 계층
   (AGENTS.md + CLAUDE.md 합산 UTF-8 바이트)이 24 KiB를 넘으면 doctor가 **경고**(fail 아님).
   TCC 6 KiB 검사와 같은 결정론 검사. MAINTAINING.md에 eager 크기 지침 한 단락 추가.
4. **session-context 미완 task 목록 캡** — no-task nudge 분기(branch C)의 미완 task
   나열이 유일한 무상한 출력 경로(이 저장소 기준 71 task 디렉터리). 최근 활동 순
   최대 8개 + "… 외 N개" 요약줄로 캡.

## 설계 / 접근

- 쓰기는 이 워크트리에서 **단일 스레드**(D4). 항목별 구현은 서브에이전트에 순차 위임하되
  각 항목의 정확한 편집 내용·계약은 메인 세션이 지정한다.
- 항목 1·2는 같은 파일(`templates/CLAUDE.md.hbs` + 루트 `CLAUDE.md`)이므로 한 패스로 적용.
  drift 테스트(`tests/agent-files.test.mjs`)가 템플릿↔루트 동기화를 강제한다.
- 항목 3: `src/commands/doctor.mjs`에 검사 추가. 임계값 24 KiB 근거 — 이 저장소 도그푸딩
  eager 계층이 ~16 KB이므로 1.5× 여유. 결정론(자동 요약·LLM 편집 없음) 원칙 유지.
- 항목 4: `src/commands/session-context.mjs` `listIncompleteTasks` 캡. 정렬은
  plan.md mtime desc, 동률 시 이름 오름차순(결정론 tiebreak).
- 항목 3·4는 동작 테스트를 추가한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **eager 지시**: 매 세션 무조건 컨텍스트에 로드되는 지시(AGENTS.md·CLAUDE.md) —
  `docs/chad/instruction-structure/` task의 어휘를 그대로 재사용한다.
- **auto-memory**: Claude Code가 프로젝트별 memory 디렉터리에 자동 저장하는 **개인** 메모리.
  팀 공유 SSOT(활성 task의 artifact.md)와 저장 위치·가시성이 다르다 — 겹치면 artifact.md 우선.
- **eager 크기 예산**: doctor가 경고하는 always-on 계층 합산 상한(24 KiB). TCC 6 KiB 한도와
  같은 결정론 검사이되, 차단이 아닌 경고다(문서 성장은 정당할 수 있으므로 판단은 사람 몫).
- 게이트 통과 근거: 4개 항목 모두 대상 파일·변경 내용·검증 방법이 사전 검토(블로그 대조
  리뷰)에서 확정되었다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
- 블로그 6대 변화 대비 하네스 현황 검토는 아티팩트 페이지에 정리(발행 URL은 artifact.md 참조).
- 채택하지 않은 항목: comptest/inttest/unittest 고정 파이프라인 완화(블로그의 "중요 영역
  과제약 유지" 예외에 해당), AGENTS.md 감량(다중 엔진 규범 보수 유지), spec rich-references
  섹션·stack 조건부 rules 복사(후속 후보, 이번 범위 제외).
