# verify-evidence-gate — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

2026-08-26 — 적대적 검증(D6) 도입 4단계 (src + 유닛테스트):

- **done 가드 `verify` evidence 키 + kind allowlist** (`src/commands/task.mjs`):
  `verify: required|optional`(기본 optional), required면 판정 창 내 검증 프레이밍
  kind 마커 필요. `VERIFY_KIND_SUFFIXES`(-adversarial·-testcritic·-shipcheck·
  -contrarian·-simplifier) 접미사 대조 — review 증거는 현행대로 비대조, 검증
  마커는 review 겸용(역 불성립). spec 템플릿 주석에 verify 키 문서화.
- **harness-review.md 마커 계약 갱신**: "kind 비대조" 단일 문장을 증거 키별 대조
  규칙(review 비대조 / verify 접미사 열거 대조)으로 재정의 — 열거가 allowlist의
  정본임을 명시.
- **sim rule 층 승격**: `tests/sim/rules.mjs` 신설 — agentloop.mjs의 순수 채점
  함수(sanitizeNote·sig·manual·na·sectionBody·ambiguityCounts·forceAllChecked·
  scoreSpecArtifacts·aggregateTrials·ICO·renderSignals) 이동, 동작 불변.
  `agentloop-spec-signals.test.mjs`는 rule 층을 직접 import.
- **중복 헬퍼 통일 판별 — 동일 구현 없음(통일 안 함)**: `codex-agentloop.mjs`는
  sanitizeNote 절단 90자(agentloop 70자)·ico 미지 상태 폴백 `•`(agentloop `⚠️`),
  `skilltest.mjs`는 sanitize 없음·renderSignals 포맷 상이(제목 뒤 빈 줄, 후행
  개행 없음). drift 사본이지만 동작 불변 원칙에 따라 이번 task에서 정렬하지
  않고 rules.mjs 헤더 주석에 차이를 명시 — 정렬은 별도 결정 후.
- **AO 워커 §8 검증 슬롯**: 보고 계약 5번 항목으로 "외부 검증 — kind·요약 또는
  미실행 사유" 최소 추가(기존 5번은 6번으로). 파일은 이번 추가 전 이미 127행으로
  자기 제약(≤100행)을 초과한 상태 — 범위 밖이라 압축하지 않음(사용자 확인).
- **CHANGELOG `[Unreleased]`** 갱신.
- **검증 증거**: TDD red(가드 미구현 시 차단 케이스 2건 실패) → green.
  `npm run test:unit` → `tests 429 / pass 428 / fail 0 / skipped 1`,
  `npm run docs:check` → "harness overview 생성 상태가 최신입니다".
- 다이어그램: 미실행 — 옵트아웃 (task 생성 시 1회 질문, 사용자 "아니오" 선택).


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

2026-08-26 — Codex read-only 외부 리뷰 (`codex exec --sandbox read-only`, probe 체인 1순위,
origin/main 대비 전체 변경 + working tree)
- 요약: **P1/P2/P3 발견 0건 — Approve** (병합 차단·수정 권고 없음).
- 리뷰어 확인 사항: `verify: required`가 allowlist 접미사와 판정 창을 함께 확인하며 기존
  `review` 동작 불변, sim rule 분리의 기존 호출이 전부 새 모듈 import로 연결됨(정적
  syntax/import smoke 통과). 리뷰어는 read-only 샌드박스라 테스트 스위트는 미실행 —
  작성 세션에서 `npm run test:unit` 429/428/0 + `npm run test:e2e` 10/10으로 보완.
- 조치: 발견 없음 → 반영 사항 없음.

<!-- harness:review kind=codex scope=worktree tip=f64358e91b6450a2a40dfafaf3f01a6c8e0c16d4 at=2026-08-26T14:13:36Z -->


## Learnings

- post-commit 훅의 handoff 재생성은 그것을 커밋해도 다음 훅이 다시 써서 **항상 1커밋
  지연 dirty**다 — done 가드는 이를 제외하지만, 리뷰 scope 결정(dirty→worktree 규칙)
  때는 "handoff 2개는 훅 노이즈"를 리뷰 프롬프트에 명시하고 진행하면 된다.
- 신 evidence 키(verify)는 설치된 구버전 CLI의 unknown-key 거부에 걸린다 — 키를 추가한
  task 자신의 spec에는 선언하지 못하고, 실사용은 다음 릴리스 이후다(dogfooding 함정).
