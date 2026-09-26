# done-guard-subdir-paths — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `repoPrefix`(`git rev-parse --show-prefix`)로 done 가드의 handoff 제외·체크박스 면제와 post-commit `commitTouchesOnlyHandoff`의
  비교 집합을 저장소 루트 기준으로 올렸다. dirty 범위는 불변(설치 밖 변경도 차단 — 회귀 테스트로 고정).
- 테스트 +3(하위 디렉터리 통과·밖 dirty 차단·훅 sweep). `npm test` 1041/0 fail. 문서: harness-task.md 한계 문장 제거, CHANGELOG Fixed.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-26T00:49:07.669Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: f0e5cbe75fda11ede7c9f9be3f31371b9c342be1 · exit 0 · 1463 B

```text
전하, **P1·P2에 해당하는 중대한 결함은 발견하지 못했습니다.**

- **P3 — 테스트 보강:** [tests/done-guard.test.mjs:335](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/tests/done-guard.test.mjs:335>), [tests/handoff-hook-churn.test.mjs:73](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/tests/handoff-hook-churn.test.mjs:73>) — 신규 fixture가 `packages/app`에 한정되어 특수문자·비ASCII prefix와 symlink targetDir의 통합 동작을 회귀 테스트로 보장하지 않습니다.

구현은 루트 설치본의 빈 prefix 동작을 보존하며, dirty 조회 범위를 축소하지 않습니다. plan의 HEAD·index·작업 트리 비교도 유지됩니다. 문자열 연결과 마지막 개행 하나만 제거하는 처리에서 특수문자 손상은 발견하지 못했습니다.

검증: 읽기 전용 단위 테스트 **16개 통과**, `git diff HEAD --check` 통과. 실제 Git으로 루트·하위 경로·공백·symlink의 prefix를 확인했고, 특수문자·비ASCII 출력 처리는 메모리 내 검사로 확인했습니다. 임시 저장소 생성이 필요한 통합·전체 테스트는 재실행하지 않았습니다. 파일 변경은 없습니다.

**최종 판정: 승인 가능 — 테스트 보강 권고(Approve with nits).**
```

<!-- harness:review kind=codex scope=worktree tip=f0e5cbe75fda11ede7c9f9be3f31371b9c342be1 at=2026-09-26T00:49:07.669Z -->

판별(작성 세션, 2026-09-26) — codex 인증 통과, P1·P2 없음:
- P3 비ASCII·특수문자 접두 통합 테스트 부재 — **수용.** 통과 테스트의 하위 디렉터리를 `packages/앱 a`(비ASCII+공백)로 바꿔
  `--show-prefix`와 porcelain `-z`의 원문 바이트 일치를 통합 경로로 고정했다(수정 전 실측: 둘 다 raw UTF-8, 인용 없음).
- P3 symlink targetDir — **이미 커버됨.** macOS `os.tmpdir()`가 `/var/folders/…`이고 `/var`는 `private/var` symlink라 모든
  git fixture가 symlink 경유 targetDir로 돈다. `--show-prefix`는 git이 계산하므로 realpath 차이를 타지 않는다(별도 실측 확인).
- 재리뷰는 하지 않았다(테스트 입력만 바뀜). `npm test` 재실행으로 대체.

## Learnings
