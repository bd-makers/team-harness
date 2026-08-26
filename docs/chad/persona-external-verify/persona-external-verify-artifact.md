# persona-external-verify — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

2026-08-26 — 적대적 검증(D6) 도입 3단계 완료 (페르소나 층, 순수 명령 문서 편집 + pin 테스트):

- **contrarian/simplifier 외부 엔진 모드(옵트인)**: `commands/harness-contrarian.md`·
  `commands/harness-simplifier.md`에 인수 해석(첫 토큰이 엔진이면 external) + 기존
  4각도/4체크를 A1–A4·R1–R4 루브릭 표로 승격 + 마커
  `kind=<engine>-contrarian|-simplifier scope=task-docs`. 절차·엔진 표는
  `/harness-review` 재사용, scope 결정만 제외(대상이 diff가 아니라 task 문서).
- **interview 선행 채점**: `commands/harness-interview.md` 절차 2번에 채점표
  (Goal·Constraint·Success·Context(brownfield 한정)·Ontology, pass/fail/na, 근거는
  spec 문장 인용) 신설 — fail/na 차원만 질문(3번), 체크박스는 채점표로만 갱신(5번),
  전부 pass면 질문 없이 통과 선언(6번).
- **kind 접미사 열거 확장**: `commands/harness-review.md`에 `-contrarian`·`-simplifier`
  추가 + scope 정의를 "프레이밍별 대상 값 유효"로 재정의(D-log D6 전문은 역사 기록이라 불변).
- **회귀 고정**: `tests/agent-files.test.mjs` 소비 표면 pin 4→6곳 + scope=task-docs pin +
  접미사 열거 pin + interview 선행 채점 pin(단계 번호로 순서 고정).
- **CHANGELOG `[Unreleased]`** 갱신, 커맨드 frontmatter 소비처 `docs/harness-overview.html`
  재생성(`docs:generate`).
- **검증 증거**: `npm run test:unit` → `tests 422 / pass 421 / fail 0 / skipped 1`(리뷰
  반영 후 재실행 동일), `npm run docs:check` → "harness overview 생성 상태가 최신입니다".
- 범위 제외(후속 task = 4단계): done 가드 `verify` evidence 키·kind allowlist
  (`src/commands/task.mjs`), sim 순수 채점 함수 rule 층 승격, AO 워커 §8 검증 슬롯.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

2026-08-26 — Codex read-only 외부 리뷰 (`codex exec --sandbox read-only`, working tree scope, probe 체인 1순위)
- 요약: P1 0건, P2 3건, P3 1건 → 판별 결과 4건 모두 반영.
- P2 — `harness-review.md` 마커 계약이 `scope=<worktree|diff>`만 정의한 채 persona 문서가
  `scope=task-docs`를 지시해 자기모순 → **판별: 진짜 결함** (1–2단계에서 kind가 겪은 것과
  동일한 계약 모순). **조치: 수정** — scope를 "프레이밍별 리뷰 대상 값"으로 재정의하고
  가드가 scope도 목록 대조하지 않음을 명시.
- P2 — interview 채점 4차원에 Context 명확도(brownfield)가 빠져 spec 체크박스와 불일치 →
  **판별: 진짜 결함(기존 결함의 표면화)** — 종전 문서도 같은 공백이 있었으나 채점표 도입으로
  1:1 대응이 계약이 됨. **조치: 수정** — Context(brownfield 한정, greenfield는 na)를 채점
  차원과 질문 각도에 추가, 통과 조건을 "모든 항목 pass(greenfield Context na 허용)"로 변경.
- P2 — pin 테스트가 `harness-review.md` 접미사 열거에서 `-contrarian`·`-simplifier` 삭제를
  못 잡음 → **판별: 진짜 결함** (요구사항 4 미고정). **조치: 수정** — 열거 존재 assert 2건 추가.
- P3 — interview pin이 키워드 존재만 봐서 "채점 → 질문" 순서 역전을 못 잡음 → **판별: 타당**.
  **조치: 수정** — 단계 번호(`2. **선행 채점**` / `3. **fail/na 차원만**`)로 순서를 고정.
- 반영 후 재검증: `npm run test:unit` 422/421/0, `npm run docs:check` 최신.

<!-- harness:review kind=codex scope=worktree tip=52b749d053aa7e600670d10ad30cca26a71acd0d at=2026-08-26T12:29:39Z -->

## Learnings

- 신규 워크트리에는 gitignore 대상인 `.harness/config.json`이 없어 harness user가 git
  user.name으로 폴백된다(docs/hslee 오생성) — 워크트리 생성 직후 메인 체크아웃에서 복사할 것.
- 커맨드 frontmatter(description·argument-hint)는 `docs/harness-overview.html` 생성물에
  소비된다 — 커맨드 문서를 고치면 `npm run docs:generate`가 검증의 일부다.
