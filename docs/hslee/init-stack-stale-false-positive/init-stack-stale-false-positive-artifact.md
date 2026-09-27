# init-stack-stale-false-positive — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`init --stack X`(감지와 다른 X)를 `.harness/render-state.json`의 선택 필드 `stack`에 고정한다. `init`(플래그 없음)·
`doctor findStaleManagedSections`·`migrate migrateManagedSectionBackup`이 모두 `resolveStack(dir, state.stack)`로 렌더한다.
`--stack <감지 id>`는 고정을 푼다. 로더는 `KNOWN_STACK_IDS` 밖의 값을 버린다. 필드가 없으면 감지를 쓰므로 기존 설치본은 동작이 그대로다.
플래그 없는 init은 고정 사실을 한 줄로 알린다(`— pinned by an earlier --stack; --stack <감지 id> to unpin`).
문서: `commands/harness-init.md`·README `--stack` 절, CHANGELOG Unreleased `### Fixed`.

검증: `npm test` → tests 1051 · pass 1050 · fail 0(+ perf 1/1) · `docs:check` 최신. 새 테스트 4종 —
doctor 재현(수정 전 `['AGENTS.md#stack']`로 실패 확인), init 고정·유지·해제(CLI 실행), 로더의 모르는 id 버림,
migrate 고정 스택 렌더(수정 전 코드에서 fail 확인).
재현 실측(수정 전): `node` 프로젝트에 `--stack next` → `Runtime: Next.js` → 플래그 없는 init → `Runtime: Node.js`.
남은 리스크: 구버전 CLI로 init하면 로더가 `stack`을 모르고 저장 시 빠진다 → 수정 전 동작으로 퇴행(악화 없음).
`harness-team stack`은 여전히 감지값만 보여준다(고정값 미표시) — 범위 밖, 후속 후보.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-27T01:38:56.495Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0cfdc57986dcb6e2ab2d37a79859bc84d2516bd6 · exit 0 · 635 B

```text
전하, **유의미한 결함은 발견하지 못했습니다.** 변경된 경로에서는 `init`이 render-state의 `stack` pin을 사용하고, `doctor`와 `migrate`도 같은 pin으로 렌더합니다. 감지된 id로 pin을 해제하는 경로와 필드가 없는 기존 설치본의 감지 경로도 코드상 일치합니다.

**최종 판정: 승인 가능.** `git diff --check`와 변경된 명령 파일의 문법 검사는 통과했습니다. 읽기 전용 리뷰 범위를 지키기 위해 임시 파일을 생성하는 테스트는 실행하지 않았으므로, 실제 CLI 동작까지 재검증한 판정은 아닙니다.
```

<!-- harness:review kind=codex scope=worktree tip=0cfdc57986dcb6e2ab2d37a79859bc84d2516bd6 at=2026-09-27T01:38:56.495Z -->

판별: 발견 0건 — 조치 없음. 리뷰어가 실행하지 않은 CLI 동작(고정·유지·해제)은 작성 세션이 `tests/detect-stack.test.mjs`로 실제 실행해 검증했다.

## Learnings
