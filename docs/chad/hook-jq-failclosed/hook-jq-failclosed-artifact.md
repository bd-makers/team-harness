# hook-jq-failclosed — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

jq가 PATH에 없으면 **조용히 무력화되던 훅 4개**를 fail-closed로 고치고, 이 훅들에 대한
**첫 자동화 테스트**를 만들었다.

### 고친 것
| 파일 | 변경 |
|---|---|
| `templates/.claude/hooks/block-dangerous-git.sh` | jq 부재 감지 + 폴백 파서, 차단 메시지에 저정밀 모드 명기 |
| `templates/.claude/hooks/protect-files.sh` | 동일 (file_path → command → payload 순 폴백) |
| `templates/.claude/hooks/pre-commit-check.sh` | 동일 + `.scripts.test` 판정을 jq → **node** 폴백, 실행 배너에 명기 |
| `templates/.claude/hooks/auto-format.sh` | 폴백 파서만 공유(판정 변경 없음 — 보안 통제가 아님) |
| `src/commands/doctor.mjs` | jq를 `optional` → `warning`으로 승격 (`fail++` 없음 → exit code 계약 유지) |
| `tests/hooks-jq-fallback.test.mjs` | **신규** — 차단/허용 매트릭스 × {jq 있음, jq 없음} |
| `tests/doctor.test.mjs` | jq warning 회귀 가드 |
| `docs/harness-overview.html` | 생성물 재생성(`npm run docs:generate` — 신규 테스트 파일이 인벤토리에 잡힌다) |
| `CHANGELOG.md` | `[Unreleased] ### Fixed` 3항목 추가 |

`boundary-checkpoint.sh`(sh → `harness-team boundary checkpoint` 위임)와 `observe-tools.mjs`(node)는
jq를 쓰지 않아 대상이 아니다 — 소스 직접 확인.

### 검증 (실제 출력)

**1. 결함 재현 → 수정 확인** (통제된 PATH: `cat`·`grep`(·`node`)만, jq만 제거)

```
수정 전:  git push --force  → jq있음 exit=2 / jq없음 exit=0   (+ "jq: command not found" stderr 유출)
수정 후:  git push --force  → jq있음 exit=2 / jq없음 exit=2   (+ "⚠ jq가 PATH에 없어 저정밀 모드로 판정했습니다")
```

**2. 테스트가 결함을 실제로 잡는지**(vacuous test 방지) — 새 테스트를 **구 훅**에 돌린 결과:

```
ℹ tests 32 / pass 20 / fail 11 / skipped 1
✖ block-dangerous-git [nojq]: 파괴적 명령 10종을 차단한다
✖ protect-files [nojq]: 보호 대상 편집을 차단한다
✖ pre-commit-check [nojq]: test 스크립트가 있으면 커밋 게이트가 돈다
✖ auto-format [nojq]: 포맷 대상 경로를 그대로 prettier에 넘긴다
… (총 11개, 전부 [nojq] 계열 + 드리프트 가드)
```

**핵심**: 구 훅에서도 `[withjq]` 매트릭스는 **실패 0** 이었다 — 이번 변경이 기존 차단/허용
판정 기준을 건드리지 않았다는 직접 증거다. 실패 11개는 전부 `[nojq]` 계열과 드리프트 가드다.
신 훅에서는 `[withjq]`·`[nojq]` 모두 통과(31 pass / 1 skip = CI 전용 가드).

**3. 드리프트 가드가 무는지** — 훅 하나의 공통 블록에서 주석 한 글자를 바꾼 뒤:

```
✖ protect-files.sh의 폴백 블록이 auto-format.sh와 다르다 (복붙 드리프트)   (pass 28 / fail 1)
```

**4. 전체**

```
bash -n            → 훅 5개 전부 OK
npm run test       → tests 333 / pass 332 / fail 0 / skipped 1  (+ perf 1/1)
npm run docs:check → harness overview 생성 상태가 최신입니다.
doctor(jq 없는 PATH) → ⚠️ jq (JSON processor)  (not found — Claude 훅이 저정밀 모드로 판정합니다 …)
```

**5. `pre-commit-check` 시연** — 오케스트레이터가 이 저장소에서는 시연하지 못한 항목.
`package.json`에 `scripts.test`가 있는 임시 프로젝트 + npm 없는 PATH로 게이트가 **실제로 막는**
상태를 만들었다: 구 훅은 배너조차 찍지 않고 exit 0, 신 훅은 `🔍 커밋 전 검증 실행 중… — jq 없음(저정밀 모드)`
후 `❌ 테스트 실패` exit 2. **시연 확보**(메커니즘 동일 추정이 아님).

## Reviews

### 2026-08-21 — 셀프 리뷰 (하네스 코드 리뷰 기준)
- **정확성**: 차단 10종·허용 12종을 jq 있음/없음 양쪽에서 자동 검증. 구 훅 대조로 jq 모드 판정 불변 입증.
- **엣지 케이스**: description 문구 오탐(5종), JSON 이스케이프가 든 명령, payload 흉내 문자열
  (`description` 안의 `\"command\":\"git push --force\"`), non-Bash 도구, 빈 payload, 확장자 미대상.
- **회귀**: 기존 330개 테스트 전부 통과. 훅 파일 모드(755) 유지, `boundary-checkpoint.sh`는 미변경(644 복원).
- **보안**: fail-open → fail-closed. 훅은 여전히 판정만 하고 명령 실행·네트워크 없음.
  차단 메시지가 payload 전체를 덤프하지 않고 추출한 명령만 보여준다.
- **단순성**: 공통 블록 15줄 + 훅별 3~6줄. 정규식·패턴·exit 코드 의미는 한 글자도 바꾸지 않았다.
- **테스트**: 신규 32개(이 훅들에 대한 최초의 자동화 테스트) + doctor 회귀 1개.
  `skip: !process.env.CI` 가드 하나는 CI에서 jq가 사라지면 매트릭스 절반이 조용히 빠지는 것을 막는다.
- **advisor**: 착수 전 1회 — "payload 전체 스캔"안의 description 오탐을 지적받아 **실측으로 재현하고
  기각**했다(아래 Learnings). 그 지적이 없었으면 조건 2를 위반한 채 머지될 뻔했다.

## Learnings

- **`.*`가 든 정규식을 더 넓은 문자열에 재사용하면 판정이 바뀐다.** `git checkout[[:space:]]+(.*[[:space:]])?(--|\.)`
  를 command 대신 payload 전체에 적용하면 `.*`가 뒤따르는 `description` 필드까지 삼켜,
  `git checkout -b feat/x` + `"…main -- do not touch"`가 차단된다. 같은 명령이 설명 문구에 따라
  다르게 판정되는 것은 보안 훅에서 허용 불가. **"패턴은 그대로, 적용 대상만 넓히면 안전"은 거짓이다.**
- **fail-closed ≠ 전부 차단.** 매 도구 호출마다 도는 훅에서 "의존성 없으면 exit 2"는 사용자를
  벽돌 상태로 만든다. 올바른 형태는 "판정 가능한 것은 판정하고, 판정 불가능한 것만 보수적으로".
- **폴백 파서는 fail-open 경로를 새로 만들지 않아야 한다.** `grep` 추출이 실패했을 때 빈 문자열로
  두면 지금 고치는 결함이 그대로 재현된다 → 추출 실패 시 payload 전체 스캔(정밀도↓, 통과 없음).
- **공유 라이브러리가 항상 DRY의 정답은 아니다.** 훅은 `copyTree(..., { skipExisting: true })`
  (`src/harness.mjs:232`)로 **파일 단위** 배달되고 기존 파일은 덮어쓰지 않는다. 즉 기존 사용자의
  실질 업그레이드 경로는 "바뀐 훅 파일만 복사"다. `source lib/*.sh`에 의존하면 그 경로에서 훅이
  죽고, 죽은 훅은 exit 2가 아니므로 **다시 fail-open**이 된다. 자체 완결형 + 동일성 테스트가 답.
- **테스트는 구 코드에 돌려 실패를 확인해야 테스트다.** 새 훅에서 29/29 초록은 아무것도 증명하지
  않는다. 구 훅에서 11개가 빨갛게 뜨는 것을 본 뒤에야 매트릭스가 결함을 잡는다고 말할 수 있다.

## 잔여 리스크 (의식적 수용, 이번 범위 밖)

- **JSON 이스케이프 미디코드**: 폴백은 `\"`·`\\`·`\n`·`\t`를 두 글자로 둔다. `git push\t--force`처럼
  구분자가 인코딩된 명령은 jq 모드에서 차단되지만 폴백에서는 통과한다(잔여 fail-open).
  정규식을 손대지 않기로 한 제약과 충돌하므로 문서화만 한다.
- **같은 키 다중 등장**: 첫 매치만 읽는다. (단, JSON 문자열 안의 `\"command\"`는 이스케이프 때문에
  매치되지 않는다 — 테스트로 고정.)
- **상류 병합 때 수용한 리스크 2건은 그대로**: 커밋 메시지 안의 `git reset --hard` 오탐,
  `git -C dir push --force` 프리픽스 우회. 두 케이스 모두 **현재 동작을 테스트로 고정**만 했다.
- **배달 경로**: `skipExisting: true` 때문에 이미 훅 파일이 있는 기존 소비자 프로젝트는
  `harness-team apply`로 이 수정을 받지 못한다(훅 파일 갱신 정책 자체의 문제 — 범위 밖).
  이번 변경으로 `doctor`가 jq 부재를 경고하므로 최소한 저정밀 상태는 드러난다.
- **GNU grep 이식성 — 해소됨**: 폴백 추출은 로컬(BSD grep, macOS)에서만 실증했었다. `[^"\\]` 는
  POSIX bracket expression이라 GNU grep도 동일 해석이지만(브래킷 안에서 `\` 는 리터럴) 이 머신에
  GNU grep·docker가 없어 직접 돌리지 못했다 → **PR #29 CI(ubuntu-latest, Node 18·20) 통과로 확인**.
- **W7 문서와의 정합**: `docs/prerequisites.md`가 jq fail-open을 표로 기술한다. 어느 쪽이 먼저
  머지되든 **나중 것이 리베이스하며 문구를 맞춘다**(이 PR은 W7 문서를 건드리지 않았다).

## PR
- **#29** — https://github.com/bd-makers/team-harness/pull/29 (base `main`, 머지하지 않음)
- CI: `test (18)` pass · `test (20)` pass (2026-08-21)
- **PR #28 머지 후 리베이스 1회**(main이 앞서감). 충돌 2건 — `CHANGELOG.md`(양쪽 항목 모두 보존),
  `docs/chad/chad-handoff.md`(생성물, 이 브랜치의 활성 task 쪽 채택). `src/commands/doctor.mjs`는
  자동 병합됐고 W4의 `EXTERNAL_TOOLS` 변경과 충돌하지 않았다. 리베이스 후 재검증:
  `npm run test` 342 tests / 341 pass / 0 fail / 1 skip · `docs:check` 최신 ·
  CI 재실행 Node 18·20 pass · `mergeable=MERGEABLE / CLEAN`.
