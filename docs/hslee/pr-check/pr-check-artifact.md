# pr-check — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `harness-team pr-check [--base <ref>] [--pre-push] [--json]` — `base...rev` diff가 건드린 task(spec 마커)마다 spec·plan·handoff·artifact가
  **커밋에** 있고 템플릿이 아닌지 판정(exit 1). 다이어그램은 권장 안내(`· 권장: 다이어그램 없음`)만. base는 `resolveScope({scope:'diff'})` 사다리.
- git pre-push 훅 — init·sync가 `installGitHook`(post-commit과 같은 설치기)으로 설치. 기본 브랜치·태그·삭제 push는 검사하지 않고, PATH CLI 부재·구버전은 건너뜀(fail-open),
  base 판정 실패는 차단 + `git remote set-head origin -a`·`--no-verify` 안내. doctor `checkHookCli`가 `pr-check`까지 요구.
- ship 8번 — 문서 커밋 후 `pr-check --base "$BASE"`, exit 1이면 준비 완료 미선언(command·Codex skill 둘 다, pin 테스트).
- 결정 정정(사용자, 2026-10-06): **PR 다이어그램은 권장.** 구현 중 `diagram record --skipped`가 plan 옵트인 없으면 거부하는 것을 발견 —
  "필수 + 생략 기록"이면 옵트인하지 않은 task는 통과 불가. D11·`docs/harness-cycle.md` §1·§2·§4-6·§5 정정. `diagram record` 동작은 바꾸지 않음(생략 줄 머리만 export).
- 범위 밖 결정: git pre-commit에 `gate commit` 연결하지 않음(preset-gates·preset-repo-shape 이월 open 닫음).

### 검증 증거 (2026-10-06)
- `npm run test` → `ℹ tests 1155 · pass 1154 · fail 0 · skipped 1` (+ perf 1/1), exit 0 — codex·새 컨텍스트 리뷰 조치 후 최종 실행. `npm run docs:check` → "생성 상태가 최신입니다".
- 신규 `tests/pr-check.test.mjs` 13건 — 그중 실측 1건: bare remote에 실제 `git push`로 빈 원격 첫 push 통과 / 앞선 훅이 stdin 소비·`exit 0`이어도 피처 브랜치 차단
  (`t-plan.md 가 템플릿 그대로`, `--no-verify` 안내) / `--no-verify`·태그·기본 브랜치 push 통과 / CLI 부재·구버전 건너뜀 / 문서 채운 뒤 통과. `git-hooks` +3건(맨 위 삽입·rc 보존·비-셸 훅).
- 이 저장소 최근 merge 8건을 PR별(`m^1...m^2`)로 판정: task 식별 8/8 정확(preset-repo-shape·preset-gates·harness-version-stamp 등). 당시엔 다이어그램이 없던
  5건이 처음 설계에서 실패했고, 이것이 권장 정정의 실측 근거다.

### 남은 리스크·후속
- 훅 관리자(husky·lefthook)가 pre-push 파일을 다시 생성하면 블록이 사라진다 — init·sync 재실행으로 복구(post-commit과 같음).
- origin이 아닌 원격으로 push해도 base는 origin 기준이다.
- 구버전 템플릿으로 만들어 손대지 않은 문서는 현재 템플릿과 달라 통과할 수 있다.
- PR이 옛 task 문서를 부수적으로 건드리면 그 task도 검사된다(4문서는 대개 채워져 있어 실영향은 작을 것으로 추정 — 미검증).
- 기존 설치본은 사용자가 init·sync를 다시 돌릴 때 pre-push를 받는다(migrate는 설치하지 않음).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-05T16:16:48.254Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: f7c6432425796c557a7ccfaf4ed0ab5912c93547 · exit 0 · 1010 B

```text
전하, **P2 결함 3건**을 발견했습니다.

- **P2 — `src/git-hooks.mjs:86`**: 기존 훅 뒤에 검사 본문을 append하면 기존 마지막 명령의 실패 상태가 덮입니다. `false` 뒤에 실제 본문을 실행했을 때 exit 0으로 바뀌는 것을 재현했습니다.
- **P2 — `src/git-hooks.mjs:49`**: 기존 pre-push 훅이 stdin을 소비하면 `pr-check`에는 빈 입력이 전달되어, 필수 문서가 빠진 브랜치도 검사 없이 통과합니다.
- **P2 — `src/commands/pr-check.mjs:48`**: rev에 spec이 없는 task를 검사 대상에서 제외하므로, 정상 task A와 spec이 누락·삭제된 task B가 함께 변경되면 A만 검사하고 전체를 통과시킵니다.

**최종 판정: 수정 필요.** 기존 훅과의 공존 및 누락 task 감지가 보완되어야 합니다.

파일은 변경하지 않았습니다. 구문 검사와 `git diff --check`는 통과했으며, 파일 쓰기가 필요한 테스트 스위트는 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=f7c6432425796c557a7ccfaf4ed0ab5912c93547 at=2026-10-05T16:16:48.254Z -->

판별·조치 (2026-10-06, 작성 세션이 재현 후 단일 스레드로 반영):
(아래 P2-1·P2-2 조치는 새 컨텍스트 리뷰 뒤 "훅을 맨 위에 넣기"로 대체됐다 — 다음 절.)
- P2-1 rc 덮어쓰기 — **진짜.** `#!/bin/sh\nfalse` + append 블록이 rc 1 → 0으로 바뀌는 것을 재현. 블록 첫 줄에 `harness_prev=$?; [ … -eq 0 ] || exit …` 추가.
  테스트: `git-hooks` "기존 훅의 마지막 명령이 실패하면 append 뒤에도 실패".
- P2-2 앞선 훅의 stdin 소비 — **진짜.** git-lfs의 pre-push가 stdin을 읽는다. 추가 실측: git은 push할 것이 없을 때도 훅을 빈 stdin으로 부른다 →
  빈 stdin은 두 경우를 구분할 수 없다. 빈 stdin이면 현재 브랜치(HEAD)를 판정하도록 변경(기본 브랜치·detached면 통과). 부작용: "Everything up-to-date" push에서도
  문서가 빠졌으면 안내가 뜬다(no-op push라 영향 작음). 명시 refspec으로 다른 브랜치를 push하면서 stdin이 소비된 경우는 여전히 HEAD를 본다(남은 한계).
- P2-3 spec 없는 task 누락 — **진짜.** 대상 판정을 "`<task>-` 접두 task 문서가 하나라도 있으면 task"로 넓힘(`docs/superpowers/plans/x.md` 같은 비-task는 여전히 제외,
  통째로 지운 task 디렉터리도 제외). 테스트: `pr-check` "spec 이 빠진 task 도 검사한다".
### 2026-10-06 — 새 컨텍스트 리뷰 (read-only 서브에이전트, D6)

- 범위: 미커밋 작업 트리 전체 + spec. codex 3건 조치 후 실행. P2 3건은 임시 저장소·bare remote·실제 `git push`로 재현, P3 3건은 추론.
- **P2-1 빈 원격으로의 첫 push 차단 — 진짜(재현).** origin에 ref가 없어 base 판정 실패 → 차단, `set-head -a`도 실패. init 직후의 정상 흐름이다.
  조치: stdin의 push 목록을 base 판정보다 먼저 보고(브랜치 push 없으면 통과), base 판정 실패 시 origin에 브랜치가 하나도 없으면 통과. 테스트: e2e 첫 push.
- **P2-2 빈 stdin → 현재 브랜치 폴백이 양방향으로 틀림 — 진짜(재현).** 피처 브랜치에서 main·태그 push가 막히고, main에서 문서 없는 피처 push가 통과.
  조치: 폴백 제거. 근본 원인(뒤에 붙인 블록이 stdin을 못 받음)을 고쳤다 — 블록을 기존 훅 **맨 위**에 넣고 stdin을 임시 파일로 받아 검사한 뒤 `exec <`로 되돌린다.
  이로써 codex P2-1(rc 덮어쓰기)·P2-2와 아래 P3-1(`exit 0` 뒤 도달 불가)도 함께 해결. 테스트: e2e "앞선 훅이 `cat >/dev/null; exit 0`"에서도 차단, 태그 push 통과.
- **P2-3 비-셸 훅에 셸 줄 삽입 → 모든 push 차단 — 진짜(재현).** 조치: shebang이 sh 계열이 아니면 설치를 건너뛰고 안내. 테스트: python 훅 무변경.
- P3-1 앞선 `exit 0`·`exec` 뒤 도달 불가 — 진짜(추론). 맨 위 삽입으로 해결(위 e2e가 `exit 0`을 포함).
- P3-2 `--pre-push --base origin/main`이 main push를 검사 — 진짜(추론 → 테스트로 확인). 조치: base를 `rev-parse --symbolic-full-name`으로 풀어 비교.
- P3-3 문서 불일치(help 요약의 "diagram or skip record", spec R3 JSON 형태, doctor 경고 문구) — 진짜. 셋 다 고침.
- 남긴 것: post-commit 설치는 여전히 append이고 비-셸 훅에도 붙는다 — 실패해도 커밋을 막지 않아 이번 범위 밖(후속 후보).

## Learnings
- 기존 git 훅에 줄을 더할 때는 "끝에 append"가 기본값처럼 보이지만, 앞선 줄의 stdin 소비·`exit`·rc가 뒤 줄의 의미를 바꾼다. 판정이 필요한 훅은 맨 위에서 입력을 받아 두고 되돌린다.
