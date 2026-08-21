# diagram-companion-pin — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**PR: https://github.com/bd-makers/team-harness/pull/28 (open, 머지하지 않음)**

### 1. `diagram-design`을 sha 핀 동반 플러그인으로 등재

`.claude-plugin/marketplace.json`의 `plugins`가 **자기 항목 1개 + 동반 항목 N개** 구조가 됐다.
파일은 한 줄도 복사하지 않았다.

```json
{ "name": "diagram-design",
  "source": { "source": "url",
              "url": "https://github.com/cathrynlavery/diagram-design.git",
              "sha": "0ab077f2291e9056554d48a90c4ff45f0b7029a5" },
  "author": { "name": "Cathryn Lavery" } }
```

**형식 근거(관측):** 로컬 `claude-plugins-official` 카탈로그 286개 항목을 파싱한 결과
`url` source 150개 중 146개가 정확히 `{source, url, sha}`만 쓰고 **`ref`를 쓰는 항목은 0개**,
dict source 항목 중 top-level `version`을 가진 항목도 **0개**였다. 그대로 따랐다.

**핀 선택 근거:** 업스트림에 태그가 하나도 없어 sha가 유일한 핀 표현이다. 후보 두 개의 트리를
실제로 받아 대조했다 — `0ab077f`(1.0.0, 이 머신 설치본)와 `5538b35`(upstream main, 2.6.1).
main도 구조는 온전했으나 (a) 저장소 루트에 `commands/`가 추가돼 `/doctor`·`/profile` 같은
**범용 이름 슬래시 커맨드를 사용자 세션에 주입**하게 되고, (b) major 2개 분량 동작 변화가
미검증이라 **검증된 `0ab077f`를 핀했다.** "구조가 온전함"은 "검증됨"이 아니다.

### 2. 릴리스 파이프라인 수리 (동반 항목을 넣는 순간 깨졌을 지점)

`src/commands/release.mjs`:

| 이전 | 이후 |
|---|---|
| `plugins.length !== 1` 이면 throw | `plugin.json.name`과 같은 이름의 **자기 항목이 정확히 1개**가 아니면 throw |
| `plugins[0].name` 대조 | 자기 항목 조회로 흡수(0개면 throw) |
| `plugins[0].version` 동기화 | 이름으로 찾은 자기 항목의 version 동기화 |
| `ERROR_ADVICE.schema` "길이가 1이 아니거나" | 자기 항목 기준 문구 + 동반 항목 version 금지 안내 |

가드는 **약해지지 않았다** — 0개(빈 배열·이름 불일치)와 중복(2개 이상) 모두 여전히 `schema`로
throw 하며 등재된 이름 목록을 메시지에 싣는다. 동반 항목 개수를 하드코딩하지 않아 항목이 늘어도
코드는 그대로다. **동반 항목에 `version` 금지**는 `surgicalVersionReplace`의 1회 출현 가정 때문이다.

### 3. `/harness-diagram` 어댑터

`commands/harness-diagram.md` + `skills/harness-diagram/SKILL.md`(Codex 래퍼) 추가, plugin.json 등록.
별칭이 아니라 어댑터다 — 상류 스킬을 직접 부르면 산출물 경로·자립형 inline SVG 제약·생성물 지위·
artifact 기록 의무가 하나도 적용되지 않으므로, 이 커맨드가 그 규약을 상류 호출 프롬프트에 실어 준다.

**계약을 복붙하지 않았다.** 조사해 보니 옵트인 계약의 정본은 이미 `commands/harness-task.md`의
"spec/plan 다이어그램 옵트인" 절이었고, `tests/agent-files.test.mjs`가 그 문구(종결 규칙·산출물
경로)를 회귀 가드로 고정하고 있었다. #25가 머지되며 `commands/harness-ship.md`도
`tests/ship-command.test.mjs`로 Probe/Degrade/Record 문구가 고정됐다. 두 곳을 포인터로 줄이려면
방금 머지된 가드를 약화시켜야 하므로 그렇게 하지 않았다. 대신 **역할을 분할**했다:

| 문서 | 소유 |
|---|---|
| `AGENTS.md` | 도구 중립 정책 (건드리지 않음 — `ship-command.test.mjs`가 도구 이름·Claude 전용 호출을 금지) |
| `CLAUDE.md` §1-B | Claude 옵트인 정책 + 실행 정본 포인터 1줄(신규) |
| `commands/harness-task.md` | **옵트인 게이트 정본** + 실행 위임 1줄(신규) |
| `commands/harness-ship.md` | PR 직전 흐름에서의 다이어그램 계약 + 실행 위임 1줄(신규) |
| `commands/harness-diagram.md` | **실행 정본**(신규) — probe·상류 호출·규약 주입·기록 |

### 4. doctor 체크는 넣지 않았다

`~/.claude/plugins/known_marketplaces.json`을 실제로 열어 확인한 결과 스키마도 `$schema`도 버전
필드도 없는 Claude Code **내부 상태 파일**이었다. 공개 계약으로 볼 근거가 없고, 하네스는 Codex·
Gemini·Cursor에서도 동작해야 하며, 다이어그램은 옵트인이라 미설치를 결함으로 보고하면 오탐이다.
런타임 probe로 충분하다. 못 만들 체크를 약속하지 않는 편이 정직하다.

### 5. 문서

- `MAINTAINING.md` — "동반 플러그인 — 핀을 올리는 절차": 언제 올리나("최신이니까"는 이유가 아니다),
  올리기 전 확인 4가지, 형식 규칙(`ref`·`version` 금지), **옛 clone으로 release 금지** 경고.
- `README.md` — "동반 플러그인 (선택)" 절: 선택 사항임, 설치 명령, MIT 저작자 표기, 핀이 자동으로
  따라가지 않는다는 사실, vendoring 하지 않는 이유, `/harness-diagram`으로 부른다는 사실.
- `CHANGELOG.md` `[Unreleased]` — #27이 재편한 Added/Changed/Fixed 3절 **끝에 이어 붙였다**(새 헤더 없음).

### 검증 (실제 출력)

```
$ npm run test
ℹ tests 305   ℹ pass 305   ℹ fail 0      (unit + e2e)
ℹ tests 1     ℹ pass 1     ℹ fail 0      (perf)

$ npm run docs:check
harness overview 생성 상태가 최신입니다.
```

`harness-team release`는 **어떤 형태로도 실행하지 않았다**(과거 `--help`가 진짜 릴리스를 수행한
사고). 대체 검증으로 `release()`를 실제 저장소 루트에 `dryRun: true`로 직접 호출해 새 가드가
실제 `marketplace.json`을 통과하는지 확인했다:

```
guard passed: 0.16.1 -> 0.16.2 | dryRun: true
marketplace.json unchanged: true
```

새 계약을 고정하는 테스트: `tests/release.test.mjs` 4건 추가(동반 항목이 있어도 자기 항목만 범프·
자기 항목이 첫 번째가 아니어도 이름으로 찾음·자기 항목 중복은 throw·동반 항목이 `version`을 들면
`manifest-format` throw), `tests/manifest-sync.test.mjs`는 `plugins[0]` 인덱스 접근을 이름 조회로
강화하고 저장소 불변식(동반 항목은 40hex sha 핀·version 없음·저작자 표기)을 새로 고정했다.

## Reviews

*(외부 리뷰 미실행 — 실행 시 여기에 날짜와 함께 요약·발견·조치를 남긴다.)*

## Learnings

- **네임스페이스 접두사는 저장소 이름이 아니라 플러그인 이름이다.** 사용자가 원한
  `team-harness:diagram-design`은 성립하지 않는다 — `.claude-plugin/plugin.json`의 `name`이
  `harness-aijient-team`이므로 실제 노출은 `harness-aijient-team:diagram-design`이다(기존 스킬도
  `harness-aijient-team:harness-task` 형태). 플러그인 이름 변경은 캐시 디렉터리·
  `installed_plugins.json`·마켓플레이스 이름·`release.mjs` 경로까지 건드리는 파괴적 변경이라
  하지 않았다.
- **"중복이니 정본 하나로 합쳐라"는 무조건 옳지 않다.** 합치려던 두 문서의 문구가 이미 회귀
  테스트로 고정돼 있었다(하나는 하루 전 Codex 리뷰 P2 조치로 추가된 것). 합치려면 그 가드를
  약화시켜야 했다. 대신 **역할을 분할**하고 각 문서에 위임 한 줄씩만 더했다 — 중복 제거가 가드
  약화의 대가로 와서는 안 된다.
- **"최신 sha"는 기본값이 아니다.** 핀을 거는 이유가 "내가 올릴 때만 반영"인데 검증되지 않은
  최신을 초기값으로 박으면 핀의 의미가 사라진다. 두 후보의 트리를 실제로 받아 대조한 것이
  결정을 갈랐다 — main에 `commands/`가 생겨 범용 이름 슬래시 커맨드를 주입한다는 사실은
  버전 번호만 봐서는 보이지 않았다.
- **못 만들 체크는 약속하지 않는다.** doctor에 스킬 탐지를 넣으려면 Claude Code 내부 상태 파일에
  의존해야 했다. 안 넣기로 하고 그 판단과 이유를 spec에 남기는 편이 정직하다.
- **generated 파일은 `git add` 뒤에 재생성한다.** `docs/harness-overview.html`은 `git ls-files`
  기반이라 새 파일을 스테이징하기 전에 `docs:generate`를 돌리면 새 커맨드가 빠진다
  (`MAINTAINING.md`가 이 함정을 이미 적어 두었다).
