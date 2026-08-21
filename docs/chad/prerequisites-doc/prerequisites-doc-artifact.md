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
