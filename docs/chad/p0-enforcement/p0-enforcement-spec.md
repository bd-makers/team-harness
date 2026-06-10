# p0-enforcement — Spec

## 목적 / 요구사항

0.8.0 plan의 **P0 — 선언 → 강제 전환(Enforcement Gap)** 묶음을 추적하는 task다.

dogfooding(`hs-memory-mananger`, 2026-06-10)이 입증한 근본 원인은 하나다: 하네스의
게이트·자기개선 루프·멀티에이전트 리뷰·task 종결은 `CLAUDE.md` **산문 지시**일 뿐
강제 장치가 없어, 마찰 0으로 전부 skip된다. scaffold(symlink·rules·hooks)는 파일 생성으로
강제되어 100% 적용되는 반면, process(게이트·루프·리뷰)는 채택률이 0%에 수렴했다.

**요구사항:** P0가 정의한 6개 enforcement 항목을 각각 작은 PR로 머지해, "선언만 하고
강제 안 함" 한 뿌리를 메운다. 결정(D1·D2·D3) 없이 오늘 착수 가능한 quick win 묶음이다.

P0 항목:
1. `task done` 종결 가드 (커밋·테스트·plan·artifact 미충족 시 경고/거부) — **완료**
2. `doctor` 게이트 우회(포인터 껍데기 spec) 감지 — **완료**
3. 리뷰 산출물 규약 (Codex/Gemini 리뷰 결과를 task 디렉토리에 남김) — 미완
4. README↔CLAUDE.md 화해 (task 구조를 코드 SSOT에 정렬) — **완료**
5. spec 경로 단일화 (외부 본문 흡수, 포인터 껍데기 방지) — 미완
6. 플러그인 레포 자기 dogfooding (이 task 자체) — **진행 중**

## 설계 / 접근

각 항목은 **독립적이고 작은 PR**이다(P1 SSOT·P3 역할분기 같은 breaking change와 달리).
공통 설계 원칙: **"선언을 강제로 옮긴다."** 산문 권장을 CLI 게이트·doctor 경고·디렉토리 규약
같은 **결정론적 마찰**로 치환한다.

- 종결 가드(①)는 `src/commands/task.mjs`의 `collectDoneIssues`가 plan 미완 `- [ ]`·
  artifact 부재/템플릿 그대로·미커밋 변경·활성화 이후 커밋 0개를 검사하고, `--force`로만
  우회 가능하게 한다.
- 게이트 우회 감지(②)는 `src/commands/doctor.mjs`의 `checkActiveSpecGate`가 활성 task의
  spec.md에 "Ambiguity 자가진단" 섹션이 없으면 ⚠️ 경고를 띄운다(fail 카운트엔 미산입).
- 자기 dogfooding(⑥)은 이 task가 **실제로** task 도구로 운용되는 것 자체가 강제 갭을
  상시 노출하는 장치다. 플러그인이 자기 워크플로우를 안 쓰면 갭을 못 본다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **강제(enforcement) vs 선언(declaration)**: 선언은 `CLAUDE.md` 산문 지시처럼 따를지
  말지를 에이전트 재량에 맡기는 권장이다(마찰 0 → skip 가능). 강제는 CLI 종료 코드·doctor
  경고·디렉토리 구조처럼 우회에 의식적 행동(`--force`)을 요구하는 결정론적 마찰이다.
- **포인터 껍데기 spec(pointer-shell spec)**: task 디렉토리의 spec.md가 실제 요구사항·
  자가진단을 담지 않고 외부 문서(docs 루트·`superpowers/plans`)를 **가리키기만** 하는 빈
  껍데기. 이렇게 되면 spec 템플릿에 주입된 Ambiguity 게이트가 우회되고, SSOT가 분산되어
  실드리프트(예: "TDD 실행 여부"가 두 SSOT에서 어긋남)가 발생한다.
- **종결 가드(completion guard)**: `task done`이 미충족 신호(미완 plan·artifact 부재·
  커밋 0개)를 감지하면 종료 코드 1로 거부하는 장치. "검증 없이 완료 선언" 안티패턴을 막는다.
- **메타 아이러니**: 이 하네스 플러그인 레포 자신이 `.harness/active.json`을 갖지 않아
  자기 task 워크플로우를 dogfooding하지 않던 상태. 이 task가 그것을 해소한다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
  → "하네스의 산문 권장(게이트·루프·리뷰·종결)을 결정론적 강제로 옮긴다." P0가 6개
  구체 항목으로 분해되어 있어 한 문장 목표 + 항목 단위로 명확.
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
  → 각 항목은 독립적 작은 PR(breaking change 금지), D1·D2·D3 결정에 의존하지 않음,
   대상 파일이 `task.mjs`/`doctor.mjs`로 한정. P1/P3는 명시적으로 범위 밖.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
  → 항목별 측정 가능: ①②는 테스트 통과 + 커밋(검증됨), ⑥은 `doctor`가 게이트 우회
   경고를 안 띄우고 `list`에 active task가 보임. P5 채택률 baseline(현재 게이트 채택률 0%)
   대비 가동 항목 증가.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
  → brownfield(기존 플러그인 레포). 영향 파일 식별 완료: `src/commands/task.mjs`
   (`collectDoneIssues`/`runDone`/템플릿), `src/commands/doctor.mjs`
   (`checkActiveSpecGate`), `bin/harness-team.mjs`(targetDir=cwd 해석),
   `docs/superpowers/plans/2026-05-29-0.8.0-improvements.md`(P0 출처).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8
  → 4개 항목 전부 충족(가중합 1.0). 진입 게이트 통과.

## 참고
- 출처 plan: `docs/superpowers/plans/2026-05-29-0.8.0-improvements.md` (P0 섹션 + 🔬 실증 검증 섹션)
- 선행 dogfooding 분석: `hs-memory-mananger` (2026-06-10), "강제되는 것은 100%, 권장되는 것은 0%"
