# guide-docs-current — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `tests` 기본값(0.52.0 `optional`) 정정: `docs/harness-cheatsheet.html`(Done evidence 표), `docs/harness-task-guide.html`(설명 목록·트러블슈팅 표 788),
  `docs/harness-onboarding-checklist.html`(실패 안내), `docs/harness-operations-playground.html`(초기 상태 `optional`, 선택지에 `optional` 추가, 허용값 안내).
- 훅 목록에 `block-dangerous-bash.sh`(0.51.0): `docs/prerequisites.md`(jq 파싱 셸 훅 다섯 개), task-guide·playground의 PreToolUse Bash 행, `docs/harness-workflow-diagrams.html`.
- task-guide spec 골격에 `## 범위 (In / Out)`(0.51.0).
- 회귀: `tests/docs-retired-phrases.json` `tests-default-required` — 옛 문구 5개. 이전 HEAD의 네 문서를 패턴이 실제로 잡는 것을 확인했다.
- 검증: `npm test` 1468건 실패 0, `npm run docs:check` 통과, playground를 브라우저로 열어 콘솔 오류 0·`tests: optional`·`block-dangerous-bash.sh` 표시 확인.
- 묻지 않고 내린 결정: `docs/harness-cycle.md:47`(2026-10-05 사이클 헌장의 "안전 가드" 목록)은 승인된 범위(문서 6개) 밖이라 두었다.
  playground 프리셋들의 `tests:'required'`는 명시 선언이라 그대로 두었다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

판별(2026-11-23, 작성 세션 재현):
- P2 task-guide:788 — 진짜 결함. 트러블슈팅 표가 기본값을 `tests: required`로 적었다 → 세 키 모두 `optional`로 고쳤다.
- P2 retired phrases — 진짜 결함. 패턴이 공백 사이 태그만 허용해 `<code>required</code>(기본)`·`기본값(<code>tests: required</code>`를 못 잡았다 → 두 문구를 HTML 그대로 등록했고 이전 HEAD 문서에서 일치를 확인했다.
- P3 spec의 "jq 훅 6개" — 진짜 결함(spec 문장만). `boundary-checkpoint.sh`는 JSON 파싱을 Node CLI에 맡긴다 → spec을 5개로 고치고 brief를 다시 렌더했다. 문서(prerequisites)는 원래 5개로 고쳤었다.

### 2026-11-23T06:34:22.697Z — codex (harness-team review)

- engine: codex · model: default · scope: worktree · base: refs/remotes/origin/main · mergeBase: 68941d655a1515cff6898e7c0168d2b936e38a7f · tip: 68941d655a1515cff6898e7c0168d2b936e38a7f · exit 0 · 1261 B

```text
- **P2** [docs/harness-task-guide.html:788](docs/harness-task-guide.html#L788) — The troubleshooting table still says removing the Done evidence declaration restores `tests: required`, contradicting the CLI default of `optional` and the corrected guidance earlier on the same page.
- **P2** [tests/docs-retired-phrases.json:58](tests/docs-retired-phrases.json#L58) — The new patterns miss both the original `<code>required</code>(기본)` wording and the stale `기본값(<code>tests: required</code>` wording, so the regression check passes with the error still present.
- **P3** [guide-docs-current-spec.md:10](docs/chad/guide-docs-current/guide-docs-current-spec.md#L10) — The spec and generated brief count `boundary-checkpoint.sh` as a sixth jq hook, but it delegates JSON parsing to the Node CLI. The prerequisites guide correctly lists five.

Reviewed all 13 changed files with `git status` and `git diff` against the supplied merge base. There were no untracked files. `git diff --check`, the overview check, and 46 focused tests passed. The full suite requires filesystem writes and was outside this read-only review.

**Verdict** — No P1 blockers. Fix the contradictory default and cover both phrasings in the regression check before merging.
```

<!-- harness:review kind=codex scope=worktree tip=68941d655a1515cff6898e7c0168d2b936e38a7f at=2026-11-23T06:34:22.697Z -->

## Learnings
