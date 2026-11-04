# tcc-removal — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

TCC를 폐지했다. `context` 명령과 `<name>-context.md` 생성을 지우고, SessionStart가 plan의 첫 미완 단계를 주입한다. 실패 기록은 artifact `## Failures`로 옮겼고 D12를 정정했다. eager 소계는 17,256 B에서 15,832 B로 줄었다(-1,424 B).
검증: `npm test` 실패 0, `npm run docs:check` 통과, 임시 저장소에서 실제 CLI로 task 생성·주입·Codex 봉투·unknown command를 확인했다.
미검증: 실제 소비자 저장소의 migrate·init(사용자 요청 시에만 실행), 재개 세션에서 현재 단계 한 줄의 효용.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-04T15:01:12.683Z — codex (harness-team review)

- engine: codex · scope: diff · base: main · mergeBase: 706c3178055c6a592b04e7b2fbceb3e5c6d7caba · tip: a5c2b030ceb36f5dcb9f651ce0bc0ba4f8ca9b0c · exit 0 · 705 B

```text
전하, **P1/P2에 해당하는 유의미한 결함은 발견하지 못했습니다.**

- **P3 nit** — `templates/.claude/skills/fix-bug/SKILL.md:18`, `templates/.claude/skills/new-feature/SKILL.md:21`: 생성 파일 목록에 `<name>-context.md`가 남아 있어, TCC 생성을 제거한 실제 동작과 불일치합니다. 두 목록에서 제거하면 됩니다.

`git status`, `git diff main`, `git diff --check main`을 확인했으며 diff 형식 검사는 통과했습니다. 파일은 수정하지 않았고 기존 미커밋 변경을 보존했습니다. 테스트·빌드·실제 훅 실행은 하지 않았으며, 추가 범위 판단도 없습니다.

**최종 판정: Approve with nit.**
```

<!-- harness:review kind=codex scope=diff tip=a5c2b030ceb36f5dcb9f651ce0bc0ba4f8ca9b0c at=2026-11-04T15:01:12.683Z -->

**판별.** P3 nit 1건, 진짜 결함이다. `fix-bug:18`·`new-feature:21`의 `{…,<name>-context}.md` 목록에 항목이 남아 있었다. 재현: 해당 줄을 직접 읽어 확인했다.
**조치.** 두 목록에서 제거했다. 새 커밋으로 고치면 중간 판이 git 이력에 남아 stock 완전성 테스트가 sha 등록을 요구하므로, 푸시 전 로컬 커밋을 하나로 합쳤다.

## Learnings

- 표면 제거의 전수 검색은 파일명 정규식만으로 부족하다. `{a,b,<name>-context}.md`처럼 묶인 목록은 `context\.md`에 안 걸린다. 지우는 개념의 어간(`-context`)으로 다시 훑는다.
- 사용량으로 장치를 평가할 때는 도입일을 먼저 본다. capsule `Cause`는 측정 전날 도입돼 "채운 사례 0건"이 근거가 될 수 없었다.
