# prerequisites-doc — Artifact

## 결과

사전 준비를 **능력 매트릭스**로 문서화하고 `doctor`의 `EXTERNAL_TOOLS`와 양방향 테스트로 고정했다.

| 파일 | 변경 |
|---|---|
| `docs/prerequisites.md` | **신규** — 8절(하드 요구사항 / 능력 매트릭스 / jq fail-open / git / 에이전트별 연동 / 설치 확인 / 호환성 주의 / 개발자용) |
| `README.md` | **3지점만** — 목차 1줄, `## 설치` 앞 요약 절, 기존 `### 요구사항`을 포인터 1줄로 축약 |
| `src/commands/doctor.mjs` | `EXTERNAL_TOOLS` export + 이유 주석 3줄 (동작 변경 없음) |
| `tests/prerequisites-doc.test.mjs` | **신규** — 문서↔`EXTERNAL_TOOLS` 양방향 드리프트 가드 |
| `docs/harness-overview.html` | 재생성 (신규 테스트 파일 1행 추가) |
| `CHANGELOG.md` | `[Unreleased]`의 기존 Added·Changed 절에 이어붙임 (새 헤더 없음, 버전 범프 없음) |

## 브리프 대비 정정한 사실

브리프가 "직접 확인한 뒤 써라. 틀린 게 있으면 고쳐서 보고하라"고 했고, 실제로 두 곳이 달랐다.

### 1. jq fail-open 범위 — 1개가 아니라 3개(+무해 1)

jq만 제거한 PATH(`cat`·`grep` 등은 정상 → jq가 유일한 변수)로 실측:

| 훅 | jq 있을 때 | jq 없을 때 |
|---|---|---|
| `block-dangerous-git.sh` | exit 2 | **exit 0** — `git push --force` 통과 |
| `protect-files.sh` | exit 2 | **exit 0** — `.env` 편집 통과 |
| `pre-commit-check.sh` | typecheck·test 게이트 | **exit 0** — 게이트 스킵 |
| `auto-format.sh` | 포맷 실행 | exit 0 — 무해 |

원인은 넷 다 동일: `INPUT`을 `jq -r`로 파싱 → jq 부재 시 `TOOL_NAME`/`FILE_PATH`가 빈 문자열
→ 조기 `exit 0` 분기. **보안 훅이 하나가 아니라 둘이다.**

W8 remit이 "block-dangerous-git.sh fail-closed 수정"으로 읽혀, 한 파일만 고치면 나머지 둘이
fail-open으로 남고 이 문서가 머지 직후 틀려진다 →
`ao send --session harness-aijient-team-plugin-1`로 범위 확대 요청 전달 완료. **훅 코드는 손대지
않았다.**

### 2. git은 하드 필수가 아니다

브리프 표는 git을 Node와 함께 "아무것도 안 됨"에 뒀지만 소스상 git 실패는 전부 catch된다:

- `src/member.mjs` `detectMember` — `git config user.name` 실패 시 `$USER` → `'unknown'` 폴백
- `src/commands/task.mjs` `handoff` — git 실패를 catch하고 빈 `commitMsg`로 계속
- `src/git-hooks.mjs` `installPostCommitHook` — `.git/hooks` 없으면 조용히 return

→ **하드 요구사항은 Node ≥18 하나뿐**이고, git은 "post-commit handoff·summary 브랜치 감지·task
전환 diff가 no-op"인 degrade 대상이다.

### 3. gh·gemini·opencode는 하네스가 호출하지 않는다

`grep`으로 대조한 결과 셋 다 `EXTERNAL_TOOLS` 외에는 등장하지 않는다.
- `gh` — 소스 어디서도 호출 안 함. `/harness-ship`은 **PR을 만들지 않고 멈추므로**, gh는 그 다음에
  사용자가 직접 여는 PR 단계용이다. "하네스 명령이 필요로 한다"고 쓰면 거짓이다.
- `gemini` — `src/commands/migrate.mjs`의 히트는 CLI가 아니라 `GEMINI.md` **파일** 생성이다.
  CLI는 규범 수준(리뷰어를 사람이 직접 돌리고, 없으면 artifact에 "미실행" 기록).
- `opencode` — 하네스는 `.opencode/opencode.json`을 **쓰기만** 한다.

## 드리프트 가드 설계

`doctor`가 이미 런타임 체커이므로 문서가 `EXTERNAL_TOOLS`와 어긋나면 문서가 거짓말이 된다.
`tests/prerequisites-doc.test.mjs`가 **양방향**으로 검사한다:

1. `EXTERNAL_TOOLS`의 모든 `cmd`가 문서 표에 있다 — doctor에만 도구를 추가하는 드리프트 차단
2. 문서 표의 모든 도구가 `EXTERNAL_TOOLS`에 있다 — doctor가 검사하지 않는 도구를 "확인된다"고
   말하는 역방향 드리프트 차단

**방향 1만으로는 영원히 통과한다.** 실제로 잡아 주는 쪽은 방향 2다.

표는 한국어 제목이 아니라 `<!-- prerequisites:external-tools -->` 주석 마커로 찾는다 —
절 제목 문구를 다듬어도 테스트가 깨지지 않는다.

**가드가 진짜 무는지 3가지 방식으로 확인했다** (각각 주입 → 실패 확인 → 복구):

| 주입 | 결과 |
|---|---|
| `doctor`에 `rg` 추가 (문서엔 없음) | ✗ ``doctor는 `rg`를 검사하는데 … 행이 없습니다`` |
| 문서에 `rg` 행 추가 (doctor엔 없음) | ✗ ``… `rg`를 나열하지만 doctor의 EXTERNAL_TOOLS에 없습니다`` |
| 닫는 마커 삭제 | ✗ `prerequisites:external-tools 마커 블록을 찾지 못했습니다` |

테스트는 `tests/documentation-inventory-pointers.test.mjs`에 끼우지 않고 **새 파일**로 뒀다 —
그 파일은 README↔overview 포인터에 대한 단일 `test()` 블록이고 병렬 워커 W4가 만질 수 있어,
새 파일이 충돌 표면 0이다.

## 검증 (실제 출력)

```
$ npm run test
ℹ tests 302
ℹ pass 302
ℹ fail 0
(perf) ℹ tests 1  ℹ pass 1  ℹ fail 0

$ npm run docs:check
harness overview 생성 상태가 최신입니다.
```

## 함정 · 학습

- **`docs:check`는 `git add` 전후로 결과가 다르다.** `scripts/generate-harness-overview.mjs`의
  source tree는 `git ls-files` 기반이라 **untracked 파일은 보이지 않는다.** 새 테스트 파일을
  만든 직후 `docs:check`는 green이었고, `git add` 한 뒤에야 red가 됐다. 신규 파일 추가 시
  **`git add` → `docs:generate` → 커밋** 순서를 지켜야 CI에서만 깨지는 사고를 피한다.
  (`MAINTAINING.md`에 이미 적혀 있는 함정 — 실제로 밟아 확인했다.)
- **doctor green ≠ 훅 정상.** `EXTERNAL_TOOLS`는 전부 `optional`로 보고되고 **exit code에
  반영되지 않는다.** jq가 그 예외이며, 이 문서가 존재하는 이유다.
- **README 요약표에 "doctor 검사 목록과 1:1"이라고 썼다가 정정했다.** README 표에는 Node·git이
  섞여 있어 `EXTERNAL_TOOLS`와 1:1이 아니다. 1:1인 것은 `docs/prerequisites.md` §2 표뿐이다 —
  드리프트를 막겠다는 문장 자체가 부정확하면 안 된다.

## 범위 밖 (의도적)

- **훅 코드 미변경** — fail-closed 수정은 W8 담당. 이 task는 사실만 명시.
- **`templates/` 미변경** — prerequisites는 하네스 자체에 대한 것이지 소비자 프로젝트에 배달할
  내용이 아니다. 따라서 루트↔`.hbs` 쌍 수정도 불필요하다.
- **버전 범프 없음** — `[Unreleased]`에만 기록.
- **다이어그램 미실행** — 신규 task 옵트인 질문에 사용자가 "아니오"를 선택. plan에 단계 없음.

## Reviews

(외부 리뷰 미실행 — 이 변경은 문서 + 테스트 1개로, 코드 경로 변경은 `EXTERNAL_TOOLS` export
한 줄뿐이다. `npm run test` 302/302로 회귀 없음을 확인했다.)

## Rebase 기록 (2026-08-21)

- **W4(#28) 머지 후 rebase.** `CHANGELOG.md` 2곳 충돌 — **양쪽 다 보존**해 해결했다(상대 항목
  먼저). `README.md`·`docs/harness-overview.html`·`src/commands/doctor.mjs`는 auto-merge.
  W4의 `## 동반 플러그인 (선택)` 절, `/harness-diagram` 어댑터, sha 핀 표는 전부 그대로다.
- **diagram-design 표현을 W4 문서에 맞춰 정렬.** `docs/prerequisites.md` §5를 "옵트인 외부
  플러그인" → "동반 플러그인 (선택)"으로 바꾸고, 설치·핀 갱신의 정본을 README 절로 넘긴 뒤
  하네스 안에서는 `/harness-diagram` 어댑터로 실행한다는 사실을 추가했다. 계약(probe → degrade
  → record, 건너뛴 단계를 닫는 형식)은 그대로다.
- **핸드오프 churn 커밋 1개 drop.** post-commit 훅이 매 커밋마다 handoff를 재생성해 rebase가
  물리는데, 그 커밋 내용은 handoff 자기참조뿐이라 `--skip` 했다.
- **검증 재실행:** `npm run test` 311/311 pass(W4 테스트 9개 포함), `npm run docs:check` green.

## W8(PR #29) 의존성

PR #29 `fix(hooks): jq 부재 시 훅 4개가 조용히 무력화되던 fail-open 수정`이 **열려 있다** —
오케스트레이터에 보낸 범위 확대 요청이 반영돼 4개 훅 전부를 다룬다.

#29가 머지되면 이 문서에서 **다시 맞춰야 하는 곳**:
- `docs/prerequisites.md` §3 실측 표 — fail-open → 저정밀 폴백 파서 동작으로 교체
- `docs/prerequisites.md` §2 jq 행의 "doctor는 `optional`로 보고하지만" — #29가 jq를
  `optional` → `warning`으로 승격하므로 문구 수정 필요
- `README.md` 사전 준비 표의 jq 행 동일

두 PR 모두 `src/commands/doctor.mjs`를 건드리므로(이쪽은 `EXTERNAL_TOOLS` export 한 줄,
#29는 jq 표시 승격) 나중에 머지되는 쪽이 rebase한다. **결론은 어느 쪽이든 같다: jq를 설치하라.**
