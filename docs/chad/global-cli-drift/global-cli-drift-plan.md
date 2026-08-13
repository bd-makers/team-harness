# global-cli-drift — Plan

- [x] plugin-dev skip 분기 실측 — `SessionStart/post-commit hook CLI`가 이 저장소에서 `skip`임을 확인
      (드리프트 검사를 같은 분기에 넣으면 사고가 난 바로 그 머신 상태를 못 잡는다)
- [x] `doctor`: `readPathCliVersion` — missing / legacy / version 세 상태 구분
- [x] `doctor`: `installedHarnessVersion` — `<plugin>@<marketplace>` 키의 marketplace 절반으로 매칭
- [x] `doctor`: `cliDriftWarning` — 불일치(낮음이 아니라 다름)로 판정, legacy는 `VERSION_FLAG_SINCE`
      기준으로만 결론
- [x] `doctor`: `checkCliDrift` 배선 — **plugin-dev 게이트 없이** 실행, 근거를 주석으로 남김
- [x] `release`: marketplace clone의 `package.json` 버전을 새 버전과 대조해 `marketplaceStaleDir` 기록
- [x] `release`: `marketplaceStaleHints`로 `⚠️` + `next:` 출력, JSON envelope `next_actions`에도 반영
- [x] 테스트 `tests/cli-drift.test.mjs` — 순수 함수 + PATH shim + `release()` 직접 호출 (CLI 실행 금지)
- [x] 실측: PATH shim으로 plugin-dev 저장소에서 `warning` 방출 확인
- [x] mutation 검증 — 드리프트 비교 제거 → 3건 실패, clone 버전 비교 제거 → 1건 실패, 각각 복원
- [x] `MAINTAINING.md`: 설치본 세 곳과 갱신 주체 표, 릴리스 10단계(`harness-team --version` 확인) 추가
- [x] `CHANGELOG.md` `[Unreleased]` 기록
- [x] 전체 스위트 270 pass, `docs:check` 최신
- [x] Codex 외부 리뷰 → artifact.md `## Reviews` (P2 3건 + P3 1건, 전부 반영)
- [x] 리뷰 반영분 mutation 재검증 4건 (C는 1차에 안 잡혀 테스트를 `exit 127`로 교체 후 재확인)
- [x] CI 실패 대응 — e2e 테스트가 개발 머신의 실제 `~/.claude`를 읽던 것을 fixture로 교체
- [x] main push, CI green (Node 18·20)
- [x] 릴리스는 별도 판단으로 남김 — `[Unreleased]`에 기록만, 태깅은 사용자 결정
