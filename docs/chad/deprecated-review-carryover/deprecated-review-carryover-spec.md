# deprecated-review-carryover — Spec

## 목적 / 요구사항

옛 리뷰 이름 4개(`/harness-codex-review`·`/harness-codex-adversarial-review`의 커맨드·스킬,
포워딩 4개)의 제거가 0.18.0 → 0.19.0 → 0.20.0으로 2릴리스째 이월 중이다. 0.19.0 Notes는
"다시 이월한다면 그 사실을 그 릴리스의 이 절에 적는다"고 스스로 규칙을 정했는데,
**0.20.0 절에는 이월 언급이 전혀 없다 — 자기 규칙 위반이다.**

이 task는 두 가지를 한다:

1. **이월 기록 누락 정정** — `CHANGELOG.md`의 `## [Unreleased]`에 정정 기록을 추가한다.
   이미 발행된 `## [0.20.0]` 절은 절대 수정하지 않는다(발행된 릴리스 절은 불변).
   내용: 0.19.0 Notes의 이월 기록 규칙이 0.20.0에서 지켜지지 않았다는 사실과,
   옛 리뷰 이름 4개가 0.20.0 트리에 그대로 남아 있으며 이는 의도된 하위 호환이라는 사실
   (제거는 선행 조건 충족 후 0.21.0 목표).
2. **0.21.0 제거 준비** — 제거의 실행 단계를 plan에 후속 범위로 명시해 두어,
   선행 조건이 충족되는 즉시 별도 탐색 없이 실행할 수 있게 한다.

## 선행 조건 (제거 실행의 게이트)

제거의 선행 조건은 **팀원 머신 전역 `~/.claude/CLAUDE.md`의 새 이름
(`/harness-review codex` 계열) 전환 확인**이다. 옛 이름을 부르는 안내가 살아 있는 동안
포워딩을 지우면 그 안내가 그대로 실패한다(0.19.0 Notes의 이월 사유).

- [x] 회사 머신 chadonpro 전역 CLAUDE.md 새 이름 전환 확인됨
- [x] 홈 머신 hsonpro 전역 CLAUDE.md 전환 확인됨 (2026-08-28) — 그 머신 세션에서 실측:
      `~/.claude/CLAUDE.md`의 외부 리뷰 절이 `/harness-review`·`/harness-adversarial-review`를
      호출 경로로 안내한다. 옛 이름은 "새 참조를 옛 이름으로 만들지 말 것"이라는 금지 문구
      1회뿐이라 호출 경로가 아니다 — 포워딩을 지워도 실패할 안내가 없다.

## 설계 / 접근

- 정정 기록은 `## [Unreleased]`의 `### Notes` 절에 쓴다 — 0.19.0에서 이월 기록이 살던
  자리와 같은 절이라, "그 릴리스의 이 절에 적는다"는 규칙의 파일 위치 관행을 따른다.
- 저장소 CHANGELOG의 기존 문체(한국어, 왜/근거 중심)를 따른다.
- 제거 자체는 이 PR 범위 밖이다 — 선행 조건(홈 머신 확인)이 미충족이고, 이 확인은
  세션이 수행할 수 없다(사용자 소관).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **포워딩 4개**: `commands/harness-codex-review.md`·`commands/harness-codex-adversarial-review.md`
  와 동명의 스킬 디렉터리 2개(`skills/harness-codex-review`·`skills/harness-codex-adversarial-review`).
  deprecated 상태로 새 이름(`/harness-review codex`·`/harness-adversarial-review codex`)에
  포워딩한다. `skills/harness-codex-sim`은 별개 스킬이며 제거 대상이 아니다.
- **이월 기록 규칙**: 0.19.0 Notes가 정한 자기 구속 — "다시 이월한다면 그 사실을
  그 릴리스의 이 절(Notes)에 적는다." 0.20.0이 이를 지키지 않았다.
- **발행 절 불변**: 이미 발행된 버전 헤딩(`## [X.Y.Z] - 날짜`) 아래는 수정하지 않는다.
  정정은 `## [Unreleased]`에 새 기록으로 남긴다.
- 게이트 통과 근거: 목표(이월 기록 누락 정정 + 0.21.0 제거 준비)·제약(발행 절 불변,
  제거는 범위 밖)·성공 기준(Unreleased 기록 + 테스트 green + PR)이 모두 한 문장으로
  구체화되어 있고, 영향 파일이 CHANGELOG.md + task 문서로 식별되어 있다.

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
```json
{ "version": 1, "tests": "skip" }
```

## 참고
- `CHANGELOG.md` `## [0.19.0]` `### Notes` — 이월 기록 규칙 원문과 이월 사유
- `.claude-plugin/plugin.json` commands 배열 33–34행 — 제거 시 함께 지울 2개 항목
