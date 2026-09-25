# managed-section-refresh-path — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`doctor`에 `findStaleManagedSections`(export) + 경고 `stale managed sections`·`nextActions: harness-team init`. 판정은 init과 같은
`mergeMarkdown` 결과 비교라 편집된 절·부트스트랩(render-state 없음)·symlink·마커 깨진 파일은 보고하지 않는다. `commands/harness-migrate.md`
(description·본문 2곳)·`commands/harness-init.md` 문장 정정, CHANGELOG Unreleased `### Added`·`### Fixed`.

검증: `npm test` → tests 1033 · pass 1032 · fail 0(+ perf 1/1) · `docs:check` 최신 · 새 테스트 5종(stale·편집됨·최신·부트스트랩·마커 깨짐).
실측: deep-math 현행화 직전 커밋(`git archive HEAD~1`)에서 `AGENTS.md#protocol` 1건만 stale(사용자 편집 `stack`은 제외) ·
현행화된 소비자 3곳은 이 경고 0건.
남은 리스크: `init --stack X`로 강제한 스택은 저장되지 않아 `stack` 절이 stale로 보일 수 있다 — 플래그 없는 `init`도 같은 렌더를 하므로
처방 자체는 init 동작과 일치한다. 편집된 절의 템플릿 변경 알림은 범위 밖.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T17:09:28.503Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 6e00506443899ba2314926eeb11dbd0ca90aacd8 · exit 0 · 1754 B

```text
전하, **P2 1건, P3 1건**을 발견했습니다.

- **P2 — [src/commands/doctor.mjs:312](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/doctor.mjs:312>)**: 마커 유효성 검사 없이 해시만 비교하므로, 다른 절의 마커가 깨졌거나 같은 블록이 중복된 파일에도 `init`을 처방하지만 실제 `init`은 파일 전체를 건너뜁니다. `AGENTS.md`·`CLAUDE.md` 모두 재현했으며, stale 판정 전에 `mergeMarkdown`과 동일한 파일 단위 검증이 필요합니다.
- **P3 — [commands/harness-migrate.md:44](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/commands/harness-migrate.md:44>)**: “쓰기 전에 볼 수 있는 지점은 migrate뿐”이라는 정정도 부정확합니다. `init` 역시 적용 확인 전에 diff를 출력하므로, migrate의 차별점은 **원본을 누적 백업한다는 것**으로 한정해야 합니다.

정상·편집·symlink·CLAUDE 관리 절은 메모리 fixture로 실제 함수들을 대조했습니다. 부트스트랩 제외는 명시된 예외이므로 전체 교체 조건과 엄밀히 동치는 아닙니다. 기본 `init`과 렌더 컨텍스트는 일치하며, `pluginDev` 게이트에는 추가 결함을 발견하지 못했습니다. `nextActions`는 경고 상태에서는 정상이고, 필수 검사 실패 시 `sync`만 남기는 기존 동작은 유지됩니다.

`docs:check` 통과. 파일 변경은 없으며, 임시 파일을 쓰는 전체 테스트는 실행하지 않았습니다.

**최종 판정: 수정 필요 — P2 해결 후 재검토를 권고합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=6e00506443899ba2314926eeb11dbd0ca90aacd8 at=2026-09-25T17:09:28.503Z -->

### 2026-09-25T17:13:16.107Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 6e00506443899ba2314926eeb11dbd0ca90aacd8 · exit 0 · 575 B

```text
전하, **새로운 P1/P2/P3 지적 사항은 발견하지 못했습니다. 최종 판정: PASS.**

- `findStaleManagedSections`는 기록이 있는 기존 절의 교체 판정에서 기본 `init`과 일치합니다. 깨진 마커도 파일 전체를 건너뛰므로 기존 P2는 해소됐습니다.
- migrate 문장의 P3도 해소됐습니다.
- 실제 `planChanges`와 대조한 메모리 기반 20개 사례, `docs:check`, diff 공백 검사가 통과했습니다.

파일 변경은 없으며, 전체 테스트는 읽기 전용 제약으로 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=6e00506443899ba2314926eeb11dbd0ca90aacd8 at=2026-09-25T17:13:16.107Z -->

**판별·조치 (2026-09-26).** 1차(P2 1·P3 1) 모두 진짜 결함으로 판별해 반영했다.
- P2(진짜): 해시 판정을 복제해 마커가 깨진·중복 블록 파일에도 `init`을 처방했다 — init은 `HARNESS_MARKER_MISMATCH`로 그 파일을
  통째로 건너뛴다. 판정을 **init과 같은 `mergeMarkdown` 호출 결과 비교**로 바꾸고 마커 오류면 파일을 건너뛴다. 회귀 테스트 추가
  (중복 `roles` 블록 → `[]`, 수정 전 red 확인).
- P3(진짜): 내가 고쳐 쓴 migrate 문장("쓰기 전에 볼 수 있는 지점은 migrate뿐")도 틀렸다 — init도 적용 전 diff를 낸다.
  migrate의 차별점을 "교체 전에 원본을 남길 수 있는 지점"으로 한정했다.
2차 재검토: 새 발견 없음, PASS(리뷰어가 `planChanges`와 20개 사례를 대조).

## Learnings
