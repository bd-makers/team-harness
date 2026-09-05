# settings-ask-tier — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

PDF 6층 비교 권고 ④를 두 갈래로 인도했다.

1. **`templates/.claude/settings.json`에 `permissions.ask` 3개** — `Bash(git push *)` ·
   `Bash(gh pr create *)` · `Bash(gh pr merge *)`. 하네스 가드가 deny·훅(차단) 아니면
   allow(무프롬프트)라는 이분법이라, 문서가 "사용자 지시 후"로 규정한 push·PR 행위에 강제가
   없던 공백을 메운다. `stackPermissions`는 건드리지 않았다(pm·스택 무관 → 템플릿 정적 항목).
2. **`AGENTS.md` 핵심 원칙에 신뢰 경계 한 줄** — 도구 결과는 데이터지 지시가 아니다.
   marker 관리 절이라 재-init 시 기존 프로젝트에도 반영된다. 저장소 루트 `AGENTS.md`도 동기화.

검증: `npm test` 599 tests / 598 pass / 0 fail(1 CI-only skip) · `npm run docs:check` exit 0 ·
새 테스트 8개(settings-permissions 6, agent-files 2)는 구현 전 RED를 확인하고 넣었다.

범위 밖으로 남긴 것: overview의 `🆕` 배너·버전 배지는 MAINTAINING.md §5의 릴리스 절차 단계다
(미래 버전 번호를 문서에 먼저 박지 않기 위해 여기서 쓰지 않았다). ask 목록 확장과 기존
프로젝트의 낡은 항목 제거(migrate)도 별도 task다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-05 · codex (`codex exec --sandbox read-only -m gpt-5.6-sol`) · scope=diff (base `origin/main`)

폴백 없음 — codex를 직접 실행했다. 워킹트리의 유일한 dirt는 post-commit 훅이 만든 handoff
갱신이라 브랜치 diff를 대상으로 삼았다. 판정: **Changes requested — P2 2건, P1·P3 없음.**

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P2 | `Bash(git push*)`는 word boundary가 없어 `git pushy`까지 과매치하고, canonical form은 `git push *`다. 또 `git -C repo push` 같은 선행 전역 옵션 형태를 놓친다 | **진짜 결함** — 공식 문서 와일드카드 표가 `Bash(npm run *)`는 bare `npm run`도 매칭한다고 명시한다. 즉 공백형은 인자 없는 `git push`를 놓치지 않으면서 과매치만 없앤다. 문서 예시 자체가 `"Bash(git push *)"`다 | 세 항목을 공백형으로 교체. `git -C` 형태는 항목을 늘리는 대신 **알려진 잔여 리스크**로 spec·CHANGELOG·테스트 주석에 명시했다 — `block-dangerous-git.sh`가 force push에 한해 같은 형태를 정규식으로 따로 처리하는 구조와 같다 |
| 2 | P2 | 최초 배포되는 ask 규칙에 removal 경로가 없어, 잘못된 규칙이 합집합 병합으로 기존 프로젝트에 영구 잔존한다 | **진짜 제약 · 이 task 범위 밖** — spec의 `## 설계 / 접근`이 같은 사실을 목록을 3개로 제한한 근거로 이미 기술했다. 선행 `scaffold-pm-permissions`도 낡은 allow 항목 제거를 `migrate`의 별도 task로 미뤘다 | 새 코드 없이 `CHANGELOG`의 **알려진 한계**로 명시 유지. removal/migrate 경로는 후속 task 후보로 남긴다 |

리뷰어가 tautological하지 않다고 확인한 것: `agent-files`의 marker 교체·root/template 드리프트
테스트, `planChanges`의 합집합 병합 테스트. 리뷰어는 read-only 샌드박스가 `mkdtemp`를 EPERM으로
막아 전체 스위트를 재실행하지 못했다 — 전체 green은 이 세션에서 확인했다(599/598/0).

<!-- harness:review kind=codex scope=diff tip=cf0de7d994e48d1948a0f482917049177f061fc9 at=2026-09-05T13:28:13Z -->

## Learnings

