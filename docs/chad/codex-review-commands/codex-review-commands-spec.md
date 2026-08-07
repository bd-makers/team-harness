# codex-review-commands — Spec

## 목적 / 요구사항

Codex 외부 리뷰를 하네스 자체 커맨드로 노출한다. 현재 openai-codex 플러그인의
`/codex:review`·`/codex:adversarial-review`는 `disable-model-invocation: true`라서
모델 호출 가능 스킬 목록에 노출되지 않고, 슬래시 입력이 Skill 도구를 경유하는
앱 세션에서는 사실상 사용 불가다(1.0.6에서도 동일 — 의도된 설계). 실무는
Bash `codex exec --sandbox read-only` 직접 실행에 의존하는데, 이 절차가 문서화된
커맨드 없이 세션 기억에만 존재한다.

요구사항 (사용자 지시, 2026-08-08):

1. 팀하네스의 command + skill로 추가한다.
2. 프리픽스는 `harness-codex-review`처럼 명시적으로 가져간다.
3. 두 개로 나눈다 — 하나는 `/codex:review` 대응, 하나는 `/codex:adversarial-review` 대응.

## 설계 / 접근

- **이름**: `harness-codex-review`, `harness-codex-adversarial-review`.
  사용자가 제안한 `-review1`/`-review2` 대신 서술형을 택했다 — 저장소 관례
  (comptest/inttest처럼 이름이 역할을 설명)와 일치하고, 숫자는 어느 쪽이 적대적
  리뷰인지 이름만으로 구분할 수 없다. (사용자: "이렇게 해도 되고" — 양쪽 허용)
- **패턴**: `harness-retro` 방향을 따른다 — `commands/<name>.md`가 절차 SSOT,
  `skills/<name>/SKILL.md`는 Codex command-equivalent 래퍼.
- **실행 경로**: openai-codex 플러그인 내부 스크립트에 의존하지 않는다(타 플러그인
  내부는 계약이 아님). AGENTS.md 역할표의 공식 호출 방식인
  `codex exec --sandbox read-only`를 직접 사용한다.
- **adversarial 변형**: 절차 골격은 base 커맨드를 참조하고 리뷰 프롬프트 프레이밍만
  교체한다 — 중복 최소화.
- **리뷰 기록**: AGENTS.md 리뷰 프로토콜("기록 없는 리뷰는 안 한 것") 준수 —
  활성 task의 artifact `## Reviews`에 날짜와 함께 남기고, Gemini 미실행 시 그 사실도
  기록한다.
- **설치 안내 금지 규칙**: codex CLI 부재 시 npm 설치 명령을 단정하지 않는다
  (#17의 404 안내 결함 재발 방지) — `codex:setup` 스킬/OpenAI 문서로 안내만 한다.

## Ontology

- **harness-codex-review**: 로컬 git 상태(working tree 또는 base 대비 diff)에 대한
  Codex read-only 외부 리뷰를 실행하고 결과를 검증·기록하는 하네스 커맨드.
- **harness-codex-adversarial-review**: 같은 절차에서 프롬프트 프레이밍만 적대적
  (설계 결정·가정에 대한 반박 시도)으로 교체한 변형.
- **게이트 통과 근거**: 요구사항이 사용자 지시로 명시됐고, 계약(manifest-sync 테스트
  5종)이 코드로 존재하며, 성공 기준이 `npm run test` 통과로 측정 가능하다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — Codex 리뷰 2종을 하네스 command+skill로 노출
- [x] **Constraint 명확도** (30%) — manifest-sync 계약, 스킬 frontmatter 규격,
      README 19개 카운트 3곳, review-only 원칙, 설치 명령 단정 금지
- [x] **Success 기준** (30%) — `npm run test` 전체 통과 + 신규 커맨드가 계약 테스트에
      걸리지 않음 + README 카운트 정합
- [x] **Context 명확도** (brownfield) — `commands/`, `skills/`, `.claude-plugin/plugin.json`,
      `README.md`(79·82·101행) 식별 완료
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고

- AGENTS.md 리뷰 프로토콜 · 역할표(Codex 호출 방식)
- tests/manifest-sync.test.mjs — commands↔manifest↔skills 동기화 계약
- 메모리 codex-review-invocation — disable-model-invocation 확인 경위
