# deprecated-review-carryover — Plan

## 목표

0.20.0에서 누락된 이월 기록을 `## [Unreleased]`에 정정 기록으로 남기고,
0.21.0 제거의 실행 단계를 후속 범위로 준비해 둔다.

## 단계

### 이번 PR 범위 — CHANGELOG 정정 기록
- [x] 다이어그램 옵트인 — 미실행(비대화 세션이라 기본값 "아니오"로 건너뜀)
- [x] spec 작성 — 목적·선행 조건 체크리스트·Ambiguity 자가진단·Done evidence
- [x] `CHANGELOG.md` `## [Unreleased]`에 정정 기록 추가 — 0.19.0 이월 기록 규칙의
      0.20.0 미준수 사실 + 포워딩 4개가 0.20.0 트리에 남은 것은 의도된 하위 호환이라는 사실.
      발행된 `## [0.20.0]` 절은 수정하지 않는다
- [x] 검증 — `node --test tests/what-changes-latest-version.test.mjs tests/manifest-sync.test.mjs
      tests/documentation-inventory-pointers.test.mjs` 12/12 green + `npm run docs:check` 최신
- [x] artifact 기록 → 커밋 → push → PR (머지는 하지 않는다)

### 후속 범위 — 0.21.0 제거 (선행 조건 충족: 2026-08-28 홈 머신 확인 → 게이트 닫힘)
- [x] `commands/harness-codex-review.md`·`commands/harness-codex-adversarial-review.md` 제거
- [x] `skills/harness-codex-review/`·`skills/harness-codex-adversarial-review/` 제거
      (`skills/harness-codex-sim`은 별개 — 건드리지 않았다. 삭제 후 `ls -d skills/harness-codex*`로 확인)
- [x] `.claude-plugin/plugin.json` commands 배열에서 위 커맨드 2개 항목 제거 — 26 → 24개.
      `.codex-plugin/plugin.json`은 `"skills": "./skills/"` 디렉터리 참조라 갱신 불필요,
      `marketplace.json`은 커맨드·스킬을 열거하지 않는다(실측 확인)
- [x] `npm test` 전체 통과 확인 — 453 pass / 0 fail / 1 skip + perf 1 pass (manifest-sync 포함)
- [x] `git add -A` **후** `npm run docs:generate` 재생성 — 생성이 `git ls-files` 기반이라
      삭제도 스테이징이 선행돼야 반영된다. `npm run docs:check` 최신 확인
- [x] 제거 사실을 CHANGELOG `## [Unreleased]` `### Removed`에 기록 + 기존 `### Notes`의
      "0.21.0 목표로 이월한다"를 게이트 종료·수행 완료로 갱신

### 후속 범위 — plan 최초 6단계에 없던 동반 갱신 (실행 중 발견)
- [x] `README.md` 3곳(92·95·114행) 슬래시 커맨드 개수 26 → 24
- [x] `commands/harness-diagram.md:10` — 어댑터 역할 유추 대상 `harness-codex-review` → `harness-review`
- [x] `docs/harness-fleet-guide.html`(465·655)·`docs/harness-task-guide.html`(458·821)·
      `docs/harness-workflow-simulation.html`(264·912) — "**0.19.0에서 제거**" 예고 4+2곳을
      제거 완료 시제로 정정. 새 릴리스 번호를 박지 않는다(이월할 때마다 또 틀리는 원인이었다)
- [x] 손대지 않을 것 확정 — `docs/harness-overview-*.html`·`what-changes-*.html`·
      `harness-workflow-simulation-0.18.1.html`은 발행된 버전 스냅샷,
      `docs/what-changes-latest-version.html`의 이월 callout은 0.20.0에 대한 **사실 기록**이며
      `tests/what-changes-latest-version.test.mjs`가 0.20.0 스냅샷과의 바이트 동일성을 강제한다
- [x] 잔여 참조 grep — `git grep`으로 확인(재귀 `grep`은 iCloud 볼트에서 타임아웃).
      라이브 문서에 옛 이름 0건, 남은 참조는 CHANGELOG 이력·버전 스냅샷·task 문서뿐

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- `CHANGELOG.md` `## [0.19.0]` `### Notes` — 이월 규칙 원문
