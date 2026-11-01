# eval-defect-triage — Spec

## 목적 / 요구사항
문제: 2026-11-01 `claude plugin eval` 스위트(로컬 브랜치 `test/plugin-eval-interview`, 23케이스)가 플러그인을 read-only로
보고 결함 후보 6건만 기록했다. 후보는 eval 샌드박스 관찰이라 현재 소스에서 재현되는지 확인되지 않았다.
영향: 페르소나·테스트 커맨드 문서(`commands/*.md`)를 읽고 움직이는 에이전트 — 문서가 없는 산출물을 전제하거나
불필요한 명령을 강제하면 eval과 실사용 둘 다에서 엉뚱한 보고·실패가 난다.
기대 결과: 후보 6건 각각을 현재 소스와 eval 원문 응답으로 대조해 확인/기각을 증거와 함께 판정하고,
확인된 것만 최소 변경으로 고친다. 6번(SKILL.md 설명 "Codex wrapper")은 판단 사안이라 다수 파일을 바꾸기 전에 전하에게 묻는다.

## 범위 (In / Out)
- **In**: `commands/harness-simplifier.md` 1단계, `commands/harness-inttest.md` 0단계 2번, `commands/harness-contrarian.md` 대화형 3단계,
  `commands/harness-interview.md` 2단계, 해당 문구를 고정하는 `tests/agent-files.test.mjs` 단언
- **Out**: `src/commands/review-prompts.mjs`와 문서의 `harness:prompt` 미러 블록(외부 엔진 모드는 결함 대상이 아님),
  `skills/*/SKILL.md` 21개 일괄 변경(6번 — 전하 결정 전), eval 재실행(비용 발생 — 별도 승인), push

## 원천 검토 (R1)
### 원천
- 없음 — 원천은 eval 관찰 노트(세션 공유 노트 폴더)와 eval 결과 `evals/results/*/report.html`이며, 원천끼리 대조할 기획 문서가 없다

### 발견
- 검토 완료: 2026-11-01 — 새 발견 없음

## 설계 / 접근
후보마다 (1) 현재 소스 문장 (2) eval 원문 응답(report.html에 남은 최종 응답) 둘 다로 재현을 확인한다.
확인된 결함은 문서에 한두 문장을 더하거나 바꾸는 최소 수정으로 닫고, 바뀐 행동마다 pin 단언 하나를 둔다.

## Ontology
- **결함 후보**: eval 세션이 플러그인 행동에서 관찰해 기록한, 아직 소스로 확인되지 않은 의심 항목
- **확인(confirmed)**: 현재 소스 문장이 관찰된 행동을 유발하거나 허용하고, eval 응답에서 재현된 경우
- **기각(rejected)**: 소스가 이미 그 행동을 막거나, 관찰이 샌드박스·채점 보정 산물인 경우
- 게이트: 작은 문서 수정 task라 Ambiguity 게이트를 생략한다(CLAUDE.md §1 예외)

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
- 후보 1~6 각각이 artifact `## 결과`에 확인·수정 또는 기각으로 증거와 함께 판정돼 있다
- `npm run test` 통과
- 변경이 이 세션 브랜치(`claude/magical-hofstadter-b348e3`)에 커밋돼 있다 — push 하지 않는다
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
- eval 증거 상세: 세션 공유 노트 폴더 `eval-defect-triage.md`(저장소 밖, 판정 근거 원문 인용)
- eval 결과 원본: 메인 체크아웃 `evals/results/`(gitignore) — `03-27-55`(페르소나), `01-36`~`01-59`(interview 02)
