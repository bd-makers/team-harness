# release-0181-recovery — Spec

## 목적 / 요구사항

v0.18.1 범프 커밋(`f8d6b6d`)이 `docs/what-changes-0.18.1.html`을 빠뜨린 채 push·태그되어
main CI와 `release` 워크플로우가 동시에 레드다. GitHub 최신 릴리스는 여전히 v0.18.0이다.

- **R1** — `docs/what-changes-0.18.1.html`을 작성한다. 구조·톤·스타일은 기존 스냅샷
  (`what-changes-0.18.0.html`, 패치 릴리스는 `0.16.1`)을 그대로 따른다.
  docs/는 Obsidian 볼트에서 열리므로 **자립형 정적 HTML**만 쓴다 — 런타임 JS(mermaid 등) 금지.
  내용 출처는 `CHANGELOG.md`의 `## [0.18.1]` 절(done-guard 증거 기반 가드 2종, PR #38).
- **R2** — `docs/what-changes-latest-version.html`을 R1 스냅샷과 **바이트 단위로 동일**하게 맞춘다
  (`tests/what-changes-latest-version.test.mjs`의 `assert.equal(latest, snapshot)` 계약).
- **R3** — `npm run test` 388/388 그린, `npm run docs:check` 그린.
- **R4** — PR 생성 → CI 그린 → 머지.
- **R5** — v0.18.1 릴리스 재발행. 태그 `v0.18.1`은 이미 존재하고 깨진 커밋 `f8d6b6d`를 가리킨다.
  (a) 태그 강제 이동 / (b) v0.18.2 재범프 중 `release.yml` 계약에 맞는 쪽을 근거와 함께
  **오케스트레이터에게 보고한 뒤** 실행한다. 임의 실행 금지.

## 설계 / 접근

- 릴리스 노트 문서는 자동 생성 대상이 아니다(`MAINTAINING.md` "최신 변경 설명 문서의 최신성 보장").
  변경의 **왜**는 사람이 쓴다 — CHANGELOG의 사실 + `done-guard-evidence-artifact.md`의
  리뷰 기록(P1 1건·P2 4건)에서 근거를 끌어온다.
- `latest`는 스냅샷의 사본이다. 두 파일을 각각 편집하지 않고 스냅샷을 정본으로 쓴 뒤 복사한다 —
  손편집 2회는 완전 일치 계약을 깨는 가장 흔한 경로다.
- 패치 릴리스이므로 hero 태그는 `0.18.0 → 0.18.1` / `patch release`로 두고,
  0.18.0이 선언한 전환 창(0.18.x) 안이라는 사실을 callout으로 남긴다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **what-changes 스냅샷**: `docs/what-changes-X.Y.Z.html`. 릴리스 시점의 변경 설명을 고정 보존하는
  버전별 기록. 생성물이 아니라 사람이 쓴 산출물이다.
- **latest 문서**: `docs/what-changes-latest-version.html`. 현재 `package.json` 버전을 설명하는
  소비자용 진입점. 현재 버전 스냅샷과 **완전히 같은 내용**이어야 한다(테스트가 강제).
- **릴리스 한 커밋 계약**: 범프 + CHANGELOG 이동 + what-changes 갱신은 한 커밋이어야 한다
  (`MAINTAINING.md` 7단계). 태그가 가리키는 **단일 커밋**에서 세 검사가 모두 돌기 때문이다.
  이번 사고는 이 계약이 깨진 결과다.
- **release 워크플로우**: `v*` 태그 push가 트리거. 태그↔`package.json` 버전 일치 검사 → `npm test`
  → `scripts/changelog-section.mjs`로 노트 추출 → `gh release create`.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 빠진 스냅샷 문서를 채워 CI를 녹색으로 되돌리고 v0.18.1을 발행한다.
- [x] **Constraint 명확도** (30%) — 자립형 정적 HTML(런타임 JS 금지), 두 파일 완전 일치,
  태그 처리는 보고 후 실행.
- [x] **Success 기준** (30%) — `npm run test` 388/388 · `docs:check` 그린 · PR CI 그린 ·
  GitHub 릴리스 v0.18.1 발행.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일: `docs/what-changes-0.18.1.html`(신규),
  `docs/what-changes-latest-version.html`. 계약 근거: `tests/what-changes-latest-version.test.mjs`,
  `MAINTAINING.md`, `.github/workflows/release.yml`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 = 1.0

## Done evidence
```json
{ "version": 1, "tests": "required", "review": "required" }
```

## 참고
- `CHANGELOG.md` `## [0.18.1] - 2026-08-22`
- `docs/chad/done-guard-evidence/done-guard-evidence-artifact.md` (0.18.1 내용의 근거·리뷰 기록)
- `MAINTAINING.md` 릴리스 절차 4~9단계 / "최신 변경 설명 문서의 최신성 보장"
- 실패한 워크플로우 run: test `32512104918`, release `32512107402`
