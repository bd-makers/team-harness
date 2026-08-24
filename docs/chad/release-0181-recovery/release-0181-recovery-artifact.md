# release-0181-recovery — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `docs/what-changes-0.18.1.html` 신규 작성 — 0.18.0 스냅샷의 구조·CSS·톤을 그대로 따르고,
  내용은 `CHANGELOG.md` `## [0.18.1]`과 `done-guard-evidence-artifact.md`의 리뷰 기록에서 가져왔다.
  4개 섹션(종결 가드 2종 / Done evidence 선언 / 리뷰 마커 배선 / 설계 원칙) + 전환 창 callout.
  자립형 정적 HTML — 런타임 JS·외부 네트워크 의존 없음(what-changes 시리즈 전체가 SVG·JS 없이 CSS만 쓴다).
- `docs/what-changes-latest-version.html`을 스냅샷의 바이트 단위 사본으로 동기화
  (`tests/what-changes-latest-version.test.mjs`의 `assert.equal(latest, snapshot)` 계약).
- 검증: `npm run test` 388 tests / 387 pass / 1 skip / 0 fail, `npm run docs:check` 최신.
  브라우저 프리뷰(`ao preview` + `ao browser get text body`)로 렌더 확인 — nav·hero·release-brief·
  4개 섹션·footer 정상, 이스케이프한 HTML 주석 마커도 본문에 그대로 표시.
- PR: [#40](https://github.com/bd-makers/team-harness/pull/40).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-24 — codex (read-only, diff against origin/main)

- **엔진**: codex. gemini는 이 머신에 미설치라 **미실행**(폴백 체인상 codex가 먼저 잡혔고,
  vendor 분리 리뷰어 1종으로 충분하다고 판단).
- **요약**: P1 0건 / P2 1건 / P3 1건. verdict REQUEST CHANGES. 2건 모두 재현·검증 후 조치.
- **P2** `what-changes-0.18.1.html` Fixed 카드 제목이 "fail-open 경로 3종"인데 본문은 4건을
  나열 — CHANGELOG의 P2 4건과도 어긋난다. **검증: 진짜 결함**(제목의 수와 목록의 수가 불일치).
  조치: 제목을 "조용히 열리던 경로 4종 차단"으로, 왜 문장을 "네 경우 모두…"로 고쳤다.
  ④(C-quoted 경로 오분류)는 선언 파싱의 fail-open은 아니지만 **가드가 조용히 통과하는**
  결과는 같으므로 카드 제목을 그 상위 개념으로 올리는 쪽을 택했다 — `## 설계 원칙`의
  "fail-open은 선언 기반 가드의 최대 적" 문단은 선언 파싱 3건만 명시하므로 그대로 둔다.
- **P3** `release-0181-recovery-artifact.md` EOF 빈 줄(`git diff --check`). **검증: 진짜 결함이나
  생성기 유래** — `src/commands/task.mjs:120` artifact 템플릿이 `## Learnings\n\n`로 끝난다.
  이 task에서는 artifact 본문을 채우며 자연 해소. 템플릿 수정은 범위 밖이라 Learnings에 남긴다.
- **검증됨(리뷰어 확인)**: 두 HTML 파일 SHA-256 동일, 계약 테스트 통과, `docs:check` 통과,
  런타임 JS·외부 리소스·미이스케이프 엔티티·깨진 앵커·0.18.0 대비 구조/접근성 회귀 없음.
  read-only 샌드박스의 `mkdtemp` 권한 때문에 전체 `npm run test`는 리뷰어가 아닌 이 세션에서 실행했다.

<!-- harness:review kind=codex scope=diff tip=03eea077230210eebd05542926ce682754d2bbe7 at=2026-08-24T09:31:10Z -->

## Learnings

- **범프 커밋의 "한 커밋" 계약은 세 산출물을 함께 묶을 때만 성립한다.** 이번 사고는 매니페스트 4종 +
  CHANGELOG는 들어갔는데 `docs/what-changes-X.Y.Z.html`이 빠진 경우다. 로컬에서 `npm test`를 돌렸다면
  push 전에 걸렸을 결함이고, `MAINTAINING.md` 8단계가 이미 그 확인을 권한다
  (`node scripts/changelog-section.mjs X.Y.Z && node -p "require('./package.json').version" && npm test`).
  태그는 되돌리기 번거롭다 — 태그 push 전 로컬 3검사는 선택이 아니라 절차다.
- **`latest`는 편집 대상이 아니라 복사 대상이다.** 두 파일을 각각 손으로 고치면 완전 일치 계약이
  깨지기 쉽다. 스냅샷을 정본으로 쓰고 `cp`로 맞춘 뒤 `cmp`로 확인하는 편이 안전하다.
- **artifact 템플릿이 EOF 빈 줄을 남긴다** (`src/commands/task.mjs:120`, `## Learnings\n\n`).
  0.18.0이 handoff 생성기에서 고친 것과 같은 계열의 결함이다 — 본문을 채우면 가려지지만,
  생성 직후 커밋하면 `git diff --check`에 걸린다. 별도 task 후보.
