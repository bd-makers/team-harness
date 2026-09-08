# done-force-audit-trail — Plan

## 목표

`done --force`로 무시한 가드 issue가 `<name>-meta.json`과 원장에 기계 판독 가능한 흔적으로
남게 한다. 가드의 차단 판정과 `--force` 우회 경로는 그대로 둔다.

## 단계

- [ ] **meta 스키마 확장** — `taskMetaTemplate`(`src/commands/summary.mjs:26-27`)에
      `forcedAt: null`, `forcedIssues: null` 추가. 필드 의미를 주석으로 고정 —
      `firstActivatedAt` 주석과 같은 자리에, 손으로 고치지 않는 harness 소유 상태임을 명시.
- [ ] **`runDone`에서 기록** — force 분기(`src/commands/task.mjs:676-679`)가 이미 쥔 `issues`를
      meta 쓰기(`:688`)에 전달. 기록 조건은 `force && issues.length > 0` —
      플래그만 붙고 무시한 것이 없으면 기록하지 않는다(spec 완료 기준 2).
- [ ] **원장 렌더링 + 역파싱 동시 갱신** — `src/commands/summary.mjs:147`(task_summary)과
      `:157-160`(`<user>-task.md`)에 우회 표시 추가. **같은 커밋에서** `:82`의
      `(✅ done|🔄 (?:open|active))` 정규식을 갱신한다 — 렌더링만 바꾸면 원장 재읽기 시 행이 유실된다.
- [ ] **구 task degrade 확인** — `inferLegacyMeta`(`:49-65`)는 우회 여부를 알 수 없다.
      두 필드를 `null`로 두고 "우회 아님"으로 단정하지 않는지 확인.
- [ ] **테스트** — (a) issue 있는 `--force` → 두 필드 기록, (b) issue 없는 `--force` → 미기록,
      (c) 원장 렌더 → 역파싱 왕복에서 우회 행 보존, (d) 필드 없는 구 meta 렌더링 회귀 없음.
      `tests/done-guard.test.mjs`·`tests/summary.test.mjs`에 각각 배치.
- [ ] **검증** — `npm run test` 전체 통과. 우회 표시가 실제로 원장에 뜨는 것을 E2E로 확인.
- [ ] **리뷰** — spec이 `review: required`를 선언했다. `/harness-review`(Codex, read-only) 실행 후
      결과를 artifact `## Reviews`에 마커와 함께 기록. 반영은 이 세션이 재현·판별한 뒤 단일 스레드로.
- [ ] **retro** — `/harness-retro`로 학습 기록 후 `harness-team done`.

## Ontology 변경 로그

- **가드 / 감사 흔적 분리** (신규) — 지금까지 done 가드 계열 task는 "무엇을 차단하는가"만 다뤘다.
  이 task는 차단하지 않고 **기록만** 하는 층을 처음으로 구분해 도입한다.
  `done-guard-window`가 P1을 기각한 논거("가드의 위협 모델은 망각이지 고의가 아니다")가
  이 task에 적용되지 않는 이유가 바로 이 구분이다 — spec `### 기존 결정과의 관계` 참조.
- **흔적 없는 우회 (silent bypass)** (신규) — 우회가 일어났으나 meta·원장·doctor 어디에도
  남지 않아 정상 종결과 구분 불가능한 상태.

## 참고

- 실제 우회 이력이 산문으로만 남아 있는 사례:
  `docs/chad/done-guard-window/done-guard-window-plan.md:30`
- 이 task를 예고한 경고:
  `docs/chad/done-guard-window/done-guard-window-artifact.md` (Learnings — "오탐은 가드를 죽인다")
- 렌더링과 역파싱이 짝이라는 사실을 놓치면 나는 회귀: `src/commands/summary.mjs:82` ↔ `:147`
- 다이어그램 옵트인: 2026-09-07 물었고 **넣지 않기로 결정**했다 — 변경 표면이 meta 필드 2개 +
  렌더링/역파싱 한 쌍이라 구조가 spec 표 하나로 다 들어간다. 따라서 `## 단계`에 다이어그램 항목이
  없는 것이 정상이다("묻지 않음"이 아니라 "묻고 거절함").
