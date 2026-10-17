# agent-failure-hardening — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### R1 done 가드 — red → green (2026-10-17)
- 무엇을: tests 검사를 `git log --since --reverse --name-status -M`으로 바꾸고 `foldNameStatus`로 경로별 창 끝 상태를 접는다.
  창 이전부터 있던 테스트가 창 끝에 삭제 상태면 `기존 테스트 파일이 삭제됨: …` issue로 차단한다. 왜: `--name-only`가 삭제 경로도
  내놓아 "소스 변경 + 실패 테스트 삭제"가 `tests: required`를 통과했다.
- red (수정 전 코드에 패치 역적용, `node --test --test-name-pattern="삭제|이름 변경|만들고 지운" tests/done-guard.test.mjs`, exit 1):
  - `✖ 소스 변경 + 기존 테스트 파일 삭제 → 차단 (삭제는 테스트 증거가 아니다)` — `undefined !== 1` (done이 통과함)
  - `✖ 테스트를 고친 뒤 다음 커밋에서 삭제 → 차단 (경로별 최종 상태로 판정)`
  - `✖ 기존 테스트 삭제 + 다른 테스트 추가 → 삭제만으로 차단`
  - `✔ 테스트 파일 이름 변경 + 소스 변경 → 통과` · `✔ 창 안에서 만들고 지운 테스트는 삭제로 세지 않는다` (정직한 경우는 원래 통과)
- green (수정 후 `node --test tests/done-guard.test.mjs`, exit 0): `ℹ tests 76 · pass 76 · fail 0`, 위 5건 모두 `✔`.
- 알려진 한계: 지운 테스트와 내용이 50% 이상 같은 새 파일은 `-M`이 이름 변경으로 짝지어 삭제로 세지 않는다 —
  제자리 assert 약화와 같은 부류라 결정론적 가드가 아니라 testcritic 루브릭(R2) 몫이다. 첫 green에서 픽스처 내용이 같아
  실제로 그렇게 짝지어진 것을 보고 확인했다.
- 알려진 한계 2: 판정 창은 종전처럼 `git log --since`라 창 안에 병합된 다른 PR의 테스트 삭제도 이 task의 done을 막는다
  (종전엔 그런 경로가 증거를 늘리기만 했다). main에서 done할 때 드물게 걸린다 — 동작은 바꾸지 않고 CHANGELOG에 명시, 탈출은 `--force`.

### R2–R5 (2026-10-17)
- R2 루브릭 `T7`·`C7`·`I7 [BLOCKER]` 덧붙임 — 번호를 밀지 않은 이유는 spec 설계 2(rubric 가이드·`docs/refresh-v0.50` 충돌). review pin 40/40.
- R3 loop "진전 없음" 문장 + pin 5/5. R5 principles 2줄·spec `## 범위 (In / Out)`·`/harness-spec` 골격 목록, golden 재생성(새 절 줄만 추가 확인).
- R4 `block-dangerous-bash.sh` + 별도 Bash group. 구 템플릿 settings → 새 템플릿 `mergeClaudeSettings` 시뮬레이션: 훅마다 1회, 재실행 멱등.

### release dry-run (2026-10-17, 백그라운드, 본 실행 없음)
- `node bin/harness-team.mjs release patch --dry-run` exit 0: `0.50.0 → 0.50.1 — 변경 없음`, manifests 4종(package.json·
  .claude-plugin/plugin.json·marketplace.json·.codex-plugin/plugin.json), cache `…/harness-aijient-team/0.50.1`, `installed_plugins.json: 스킵`
  (dry-run의 스킵은 본 실행 예고가 아니다 — 메모리 release-icloud-gotchas). Claude Code 실행 중 경고는 정상.
- 참고: 이 변경은 CHANGELOG에 `Added`(새 훅·원칙·spec 절)가 있어, 관례상(0.50.0의 `Added`=minor) `release minor`(0.51.0)가 맞을 수 있다 — 결정은 사람.
- `267520f`(cacheFilter의 `.claude/worktrees` 제외)는 이 브랜치에 없다 — 본 실행 전에 main 병합 여부를 먼저 정할 것.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-17T04:02:14.729Z — codex (harness-team review)

- engine: codex · scope: worktree · base: origin/main · mergeBase: ad02b09379ae395e959879cd3174097fdee72d2e · tip: ad02b09379ae395e959879cd3174097fdee72d2e · exit 0 · 1777 B

```text
전하, **P2 수정 필요 6건**입니다. P1은 발견하지 못했습니다.

- **P2 — `src/commands/task.mjs:1054`**: 삭제된 소스도 `live`에서 제외해, `D src/app.mjs`만 있는 작업은 `source=false`가 되어 기존의 테스트 변경 요구를 우회합니다.
- **P2 — `src/commands/task.mjs:762`**: rename 시 최초 `A` 상태를 새 경로로 전달하지 않아, 창 안에서 생성→rename→삭제한 테스트를 “기존 테스트 삭제”로 오인합니다.
- **P2 — `templates/.claude/hooks/block-dangerous-bash.sh:75`**: 두 정규식이 명령 전체에서 독립적으로 옵션을 찾아, 허용 대상인 `rm -r a; rm -f b`도 재귀+강제 삭제로 차단합니다.
- **P2 — `templates/.claude/hooks/block-dangerous-bash.sh:66`**: 따옴표 안의 구분자를 명령 경계로 취급해, 안전한 `git commit -m "docs; rm -rf example"`도 차단합니다.
- **P2 — `templates/.claude/hooks/block-dangerous-bash.sh:53`**: nojq에서는 JSON의 `\n`을 복원하지 않아, `echo ok` 다음 줄의 `rm -fr build`가 통과합니다. 동일 입력은 jq 모드에서 차단됩니다.
- **P2 — `commands/harness-loop.md:120`**: `git diff --name-status HEAD`에는 추가된 skip이나 제거된 assert 줄이 없으므로, 명시한 명령만으로 테스트 후퇴를 판정할 수 없습니다.

기본 설치 settings 병합은 중복 없이 유지되며 재실행도 동일했습니다. 루브릭 미러 검사 3개, 템플릿 검사 9개, loop 검사 5개와 `docs:check`, `git diff --check`는 통과했습니다. fixture 테스트 9개는 sandbox의 `mkdtemp` 제한으로 실패했으며 전체 테스트는 미검증입니다.

파일 변경은 없으며, **최종 판정은 수정 후 재검토 필요**입니다.
```

<!-- harness:review kind=codex scope=worktree tip=ad02b09379ae395e959879cd3174097fdee72d2e at=2026-10-17T04:02:14.729Z -->

**판별·조치 (작성 세션, 2026-10-17, D6)** — 6건 중 5건 유효·반영, 1건 수용.
1. 소스 삭제가 소스 판정에서 빠짐 — 유효(종전 `--name-only`는 삭제한 소스도 소스 변경으로 셌다, 의도 밖 동작 변화). 소스 판정은
   live+deleted, 테스트 증거만 live로 분리. 테스트 `소스 파일만 삭제 → 종전대로 테스트 변경을 요구한다`.
2. 생성→이름 변경→삭제 오탐 — 유효. 이름 변경이 출신(창 안 생성 여부)을 물려주고 복사본은 새 파일로. 테스트 `창 안에서 만들고 옮긴 뒤 지운 테스트도 삭제로 세지 않는다`.
3. `rm -r a; rm -f b` 오탐 — 유효. 한 정규식이 같은 명령(구분자 전) 안에서 재귀·강제를 함께 요구. 허용 매트릭스에 추가, `rm -r a -f`는 차단 매트릭스에.
4. 따옴표 안 `;` 오탐 — **수용(미반영)**. block-dangerous-git.sh의 커밋 메시지 오탐과 같은 fail-closed 잔여 리스크이고 인용 인식은 셸 파서가 필요하다.
   훅 머리 주석에 명시하고 현재 동작을 테스트로 고정(`알려진 잔여 리스크(따옴표 안 구분자 오탐)를 고정한다`).
5. 저정밀 모드 `\n` 미복원으로 둘째 줄 rm 통과(fail-open) — 유효. 저정밀 분기에서만 `\n`을 줄바꿈으로 푼다(공유 블록은 불변). 차단 매트릭스 `줄바꿈 뒤 rm -fr`(양 모드).
6. loop 판정 명령이 줄을 못 봄 — 유효. `git diff --name-status HEAD` → `git diff HEAD`로 정정, pin 갱신.
- codex 쪽 "fixture 테스트 9개 실패"는 codex sandbox의 `mkdtemp` 제한이다 — 로컬 `npm test`로 따로 검증한다.

### 2026-10-17T04:13:50.133Z — codex (harness-team review)

- engine: codex · scope: worktree · base: origin/main · mergeBase: ad02b09379ae395e959879cd3174097fdee72d2e · tip: ad02b09379ae395e959879cd3174097fdee72d2e · exit 0 · 1762 B

```text
전하, **P2 수정 필요 2건**입니다. P1은 발견하지 못했습니다.

- **P2 — `src/commands/task.mjs:757`**: `A tmp → D tmp → R existing.test→tmp → D tmp`에서 목적지의 기존 `born=true`가 유지돼, 실제 기존 테스트 삭제가 `deletedTests`에서 누락됩니다. 다른 테스트 변경이 있으면 done 가드를 통과할 수 있습니다.
- **P2 — `templates/.claude/hooks/block-dangerous-bash.sh:85`**: `END`가 `;`까지 소비하므로 `rm -r; rm -f b`에서 `REST`가 다음 명령까지 연결됩니다. 서로 다른 rm의 옵션을 합쳐 차단하는 이전 3번 문제가 일부 남습니다.

이전 6건의 재검토 결과는 다음과 같습니다.

| 이전 지적 | 확인 결과 |
|---|---|
| 1. 소스 삭제 판정 | 수정 확인: `live + deleted`로 판정 |
| 2. 생성→rename→삭제 | 단순 경로는 수정됨. 경로 재사용 결함은 위 P2 |
| 3. 서로 다른 rm 옵션 결합 | 기존 재현은 수정됨. 구분자 경계 결함은 위 P2 |
| 4. 인용된 구분자 오탐 | 승인된 잔여 위험으로 유지, 재지적하지 않음 |
| 5. nojq newline 복원 | 수정 확인: 저정밀 분기의 `\\n` 복원 |
| 6. loop 판정 명령 | 수정 확인: `git diff HEAD`로 변경 |

읽기 기반 테스트 **16개**, `docs:check`, `git diff --check`, Bash 구문 검사는 통과했습니다. fixture 테스트 9개는 sandbox의 `mkdtemp` 제한으로 실패했고, 추가 probe도 임시파일 생성 제한으로 실행되지 않았습니다. 위 두 발견은 정적 상태 추적 결과이며 전체 테스트는 미검증입니다.

파일 변경은 없으며, 별도 범위 확대 없이 검토했습니다. **최종 판정: 두 P2 수정 후 재검토 필요**입니다.
```

<!-- harness:review kind=codex scope=worktree tip=ad02b09379ae395e959879cd3174097fdee72d2e at=2026-10-17T04:13:50.133Z -->

**판별·조치 (작성 세션, 2026-10-17, R3 재검 1회째)** — 2건 모두 유효·반영. 이전 6건은 codex가 반영 확인(4번은 수용 유지).
- a. 경로 이름 재사용으로 기존 테스트 삭제 누락 — 유효. 출신을 경로 이름이 아니라 이름 변경을 따라가는 내용 계보(`carries`)로 추적하도록
  `foldNameStatus`를 다시 썼다. 테스트 `기존 테스트가 창 안에서 지운 이름으로 옮겨진 뒤 삭제 → 차단 (출신은 내용을 따라간다)`.
- b. `END`가 `;`를 먹어 `rm -r; rm -f b`를 잇는 것 — 유효. 앞 플래그 뒤는 공백만 허용. 허용 매트릭스에 그 케이스 추가.
- 재검은 프로토콜상 1회까지라(`/harness-loop` R3 기준과 같은 이유 — 엣지 케이스가 열린 산출물은 끝없이 P2가 나온다) 3차 codex 리뷰는
  돌리지 않았다. 대신 위 회귀 테스트와 로컬 `npm test` 전체로 검증한다.

## Learnings
- `git grep -E`는 `\b`를 지원하지 않아 "참조 0건"이 거짓으로 나왔다 — 단어 경계 검색은 `-w`나 명시적 문자 클래스로 한다.
- `git log -M`은 내용이 같은 삭제+추가를 이름 변경으로 짝짓는다 — 삭제 시나리오 픽스처는 새 파일 내용을 다르게 둔다.
- 저정밀(jq 없음) 훅은 JSON 원문을 보므로 `\n`이 두 글자로 남는다 — 줄 시작을 명령 위치로 보는 검사는 풀어서 봐야 jq 모드와 판정이 같다.
