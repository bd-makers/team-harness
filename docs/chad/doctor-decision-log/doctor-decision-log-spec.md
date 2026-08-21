# doctor-decision-log — Spec

## 목적 / 요구사항
- instruction-structure task(PR #30)가 D2/D4/D5 결정 로그 전문을 AGENTS.md에서 `docs/decisions.md`
  (신규, `templates/docs/decisions.md`로 스캐폴드)로 이관했다. 스캐폴드는 `copyStaticAssets`의
  skipExisting 정책이라 소비 프로젝트에 같은 이름의 파일이 이미 있으면 D-log가 전파되지 않는다
  (Codex 리뷰 P2-1, `docs/chad/instruction-structure/instruction-structure-artifact.md` ## Reviews).
- doctor에 warn 수준 검사 1건 추가: `docs/decisions.md`가 존재하고 `## D2`/`## D4`/`## D5` 제목을
  포함하는가. 없거나 미포함이면 경고(실패 아님)와 함께 `templates/docs/decisions.md`에서 해당 절을
  가져오라는 안내를 낸다. 기존 doctor 검사들의 출력 스타일·코드 패턴을 그대로 따른다.
- `tests/doctor.test.mjs`에 존재/부재/부분누락 케이스 테스트 추가, `npm run test` 전체 green.

## 설계 / 접근
- `checkDecisionLog(targetDir)` — 기존 warn 헬퍼와 동일한 string|null 패턴
  (`checkSessionStartHook`·`checkActiveSpecGate`류). runDoctor에서 ⚠️ warning으로 배선.
- 제목 매칭: `^## D2\b` (multiline) — 본문 중간 언급·`## D20` 오탐을 막고,
  템플릿의 `## D2 (2026-06-11) — …` 형식은 허용한다.
- 부재 케이스는 apply가 스캐폴드로 해결 가능 → 메시지에 apply 안내 + JSON next_actions에
  `harness-team apply` 추가. 부분누락은 skipExisting이라 apply로 해결 불가 → 템플릿에서 해당 절을
  가져오라는 수동 병합 안내만 낸다.
- e2e 불변식(apply 직후 doctor 완전 green, `tests/e2e/apply-smoke.test.mjs`) 유지를 위해
  `templates/docs/decisions.md`를 이 브랜치에도 포함한다 — PR #30 브랜치와 동일 바이트라
  양측 추가여도 병합이 클린하다. tracked 파일 추가로 overview 파일 트리가 바뀌므로
  `npm run docs:generate`를 동반한다 (instruction-structure 때와 동일한 커플링).
- pluginDev 게이트 없음: 소스 레포도 #30 이후 자체 `docs/decisions.md`를 가진다.
  #30 머지 전까지 소스 레포에서 경고가 뜨는 것은 정확한 상태 보고이며 fail이 아니라 CI에 무해하다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **decision log**: `docs/decisions.md` — AGENTS.md 규범 요약의 전문(배경·근거·재평가 조건) 정본.
  `## D2`/`## D4`/`## D5`는 상류(team-harness) 결정이고 프로젝트 고유 결정은 아래에 append 된다.
- **skipExisting 전파 갭**: 스캐폴드가 기존 파일을 보존하므로 상류 D-log 갱신이 파일을 이미 가진
  소비 프로젝트에 도달하지 않는 상태. 이 검사의 존재 이유 (P2-1 완화안).
- 게이트 통과 근거: 검사 대상·수준(warn)·안내문·테스트 케이스가 사용자 지시로 완전 구체화되어 있음.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (테스트 3케이스 + npm run test green)
- [x] **Context 명확도** (brownfield 한정) — 영향 파일 식별: `src/commands/doctor.mjs`,
  `tests/doctor.test.mjs`, `templates/docs/decisions.md`(신규), `docs/harness-overview.html`(재생성)
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- 다이어그램 옵트인(§1-B): 자율(비대화형) 세션이라 AskUserQuestion 미실시 — plan에 다이어그램
  단계 없음. "묻고 아니오"가 아니라 **미질문** 상태임을 여기 명시해 상태를 구별한다.
