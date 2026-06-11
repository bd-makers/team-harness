# p0-enforcement — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

P0 6개 항목 중 3개를 강제 장치로 전환 완료(2026-06-10). 각 항목과 근거 커밋:

- **① README↔CLAUDE.md 화해** — commit `b18eeb9`
  ("docs(harness): task 구조 문서를 코드 SSOT에 정렬 + 0.8.0 dogfooding 반영").
  task 구조 문서를 코드 SSOT(`docs/<user>/<name>/`, 4파일 prefix, `task <name>` 시그니처)에
  정렬. 변경: `README.md`, `templates/CLAUDE.md.hbs`, `templates/docs/README.md`,
  `docs/superpowers/plans/2026-05-29-0.8.0-improvements.md`(0.8.0 plan 신설).

- **② `task done` 종결 가드** — commit `1b28b97`
  ("feat(harness): task done 종결 가드 + doctor 게이트 우회 감지 (P0 강제 전환)").
  `src/commands/task.mjs`에 `collectDoneIssues` 추가: plan 미완 `- [ ]`·artifact
  부재/템플릿 그대로·미커밋 변경·활성화 후 커밋 0개를 감지. 미충족 시 종료 코드 1로 거부,
  `--force`로만 우회. 테스트 `tests/done-guard.test.mjs`(187줄) 신설.

- **③ `doctor` 게이트 우회 감지** — commit `1b28b97` (②와 동일 커밋).
  `src/commands/doctor.mjs`에 `checkActiveSpecGate` 추가: 활성 task의 spec.md에
  "Ambiguity 자가진단" 섹션이 없으면 ⚠️ 경고(포인터 껍데기 spec 감지). fail 카운트엔
  미산입(소프트 경고). 테스트 `tests/doctor.test.mjs` 보강.

**검증(이 task):** 본 task의 spec.md를 `task` 도구로 생성해 "Ambiguity 자가진단" 섹션을
포함시켰고, `doctor` 실행 시 ②③가 의도대로 동작 — 게이트 우회 경고가 **뜨지 않음**을 확인.

**추가 완료(2026-06-10 후속):**
- **리뷰 산출물 규약** — commit `8feacb7`. artifact 템플릿 `## Reviews` 섹션 + CLAUDE.md.hbs 리뷰 프로토콜 규약.
- **spec 경로 단일화 (규약)** — commit `85a64cd`. task 4파일 SSOT·포인터 껍데기 금지 protocol 명문화.
- **list 오인식 버그 수정** — commit `995647a`. `runList`이 `<name>-spec.md` 마커 있는 디렉토리만 task로 인정. dogfooding 즉시 발견. 테스트 54개 통과.

**P0 6개 핵심 enforcement 전부 완료.** migrate 흡수(⑤b)는 "필요 시" 옵션이라 별도. ⑥ 자기 dogfooding은 본 task 운용으로 달성 → done.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다.*

- 2026-06-10: 외부 Codex/Gemini 코드리뷰는 미실행. 대신 P0 구현 시 advisor(상위 모델) 검토로
  종결 가드의 dead code(커밋 0개 신호 미발동)를 발견·수정했고, 서브에이전트 자체 테스트(54개 통과)로
  회귀를 검증함. 외부 리뷰는 후속 과제.

## Learnings

- **플러그인이 자기 워크플로우를 안 쓰면 갭을 못 본다.** 이 하네스 레포는 자신의 task 도구
  대신 `superpowers/plans`만 써왔고, 그 결과 `.harness/active.json` 부재 상태로
  enforcement 갭(게이트 우회·종결 가드 미작동)을 스스로 노출시키지 못했다. 자기 dogfooding은
  "기능이 실제로 마찰을 만드는가"를 검증하는 가장 직접적인 장치다.

- **강제되는 것(scaffold)은 100%, 권장되는 것(process)은 0%.** dogfooding이 입증한 관통
  렌즈. scaffold는 파일 생성으로 강제되어 빠짐없이 적용되는 반면, 산문 지시(게이트·루프·리뷰·
  종결)는 마찰 0으로 skip된다. 따라서 0.8.0의 방향은 "선언을 강제로 옮기기"여야 한다.

- **doctor 게이트는 문자열 grep이라 빈 체크박스도 통과한다.** `checkActiveSpecGate`는
  "Ambiguity 자가진단" 리터럴만 검사하므로, 체크는 했지만 근거 없는 spec도 경고를 피한다.
  도구 게이트의 하한선과 사람의 품질 기준("빈 껍데기 금지")은 별개 — 자가진단 각 항목에
  판단 근거를 한 줄씩 남겨야 진짜 게이트가 된다.
