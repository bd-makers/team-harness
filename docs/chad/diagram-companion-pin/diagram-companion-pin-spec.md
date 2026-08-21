# diagram-companion-pin — Spec

## 목적 / 요구사항

`diagram-design` 스킬을 **하네스에 복사(vendoring)하지 않고**, 하네스 마켓플레이스
(`.claude-plugin/marketplace.json`)에 **커밋 sha로 핀을 건 두 번째 항목**으로 등재한다.
두 번째 머신에서도 한 번에 설치되고, 업스트림 업데이트는 메인테이너가 sha를 올릴 때만 반영된다.

추가 요구(W4 진행 중 오케스트레이터가 확정): 핀 참조로 두더라도 하네스 안에서는
**하네스 네임스페이스의 커맨드/스킬로 호출**할 수 있어야 한다. 단순 별칭이 아니라
**어댑터**로 만든다 — 상류 스킬을 직접 부르면 적용되지 않는 하네스 규약(산출물 경로,
자립형 inline SVG, 생성물 지위, probe→degrade→record, artifact 기록 의무)을 주입하는 것이 존재 이유다.

요구사항:

1. `marketplace.json`에 `diagram-design` 동반 항목을 sha 핀으로 등재한다. 파일 복사 금지.
2. 릴리스 파이프라인이 동반 항목 때문에 깨지지 않게 만든다(아래 "가장 큰 기술 리스크").
3. `MAINTAINING.md`에 **핀을 올리는 절차**를 적는다 — 언제, 무엇을 확인하고, 누가 결정하는지.
4. `README.md`에 동반 플러그인을 소개하고 **선택 사항**임을 명시한다. MIT 저작자 표기(Cathryn Lavery).
5. `/harness-diagram` 어댑터 커맨드 + Codex 래퍼 스킬을 추가하고 `plugin.json`에 등록한다.
6. `CHANGELOG.md` `[Unreleased]`에 항목 추가.

## 설계 / 접근

### 왜 vendoring이 아닌가 (재논의 금지 — 브리프에서 이미 확정)

- 업스트림 `github.com/cathrynlavery/diagram-design`(MIT)은 활발히 갱신된다. 복사하면
  처음부터 뒤처진 사본을 떠안고 리싱크가 영원히 메인테이너 일이 된다.
- 스킬은 `SKILL.md` + `references/` + `assets/`이고 references가 assets를 다수 참조하므로
  assets를 버릴 수 없다.
- `SKILL.md` 첫 절은 브랜드 토큰을 **스킬 디렉터리 안** `references/style-guide.md`에 쓴다.
  vendoring하면 사용자의 브랜드 색이 하네스 저장소의 추적 파일이 되어 릴리스에 실려 나간다.
- 하네스는 이미 `src/commands/doctor.mjs`의 `EXTERNAL_TOOLS`에서 codex·gemini를
  **번들하지 않고 탐지만** 한다. 같은 철학을 따른다.

### 마켓플레이스 항목 형식 — 관측된 사실을 따른다

로컬 `~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json`
(286개 항목)을 직접 파싱해 확인한 형식:

| 관측 | 값 |
|---|---|
| source 종류 | `git-subdir` 83, `url` 150, 문자열(`./...`) 53 |
| `url` source 키 조합 | `{source, url, sha}` 146 / `{source, url, sha, path}` 4 |
| `url` source 중 `ref` 를 가진 항목 | **0** |
| dict source 항목 중 top-level `version` 을 가진 항목 | **0** (version 보유 14개는 모두 문자열 source) |

따라서 동반 항목은 `{"source": "url", "url": "...git", "sha": "<40hex>"}` 형태로 쓰고
**`ref`도 `version`도 넣지 않는다.** 브랜치 출처(`main`)는 JSON이 아니라 MAINTAINING.md 산문에 남긴다.
`version` 금지는 형식 일치 때문만이 아니라 `surgicalVersionReplace`의 "1회 출현" 가정을
깨지 않기 위한 하드 제약이다(아래).

업스트림 자신의 `marketplace.json`은 `plugins: [{name: "diagram-design", source: "./"}]` —
플러그인 루트 == 저장소 루트다. 그래서 `path` 없이 저장소 전체를 가리키는 `url` source가 맞다.

### 핀 sha 선택: `0ab077f2291e9056554d48a90c4ff45f0b7029a5`

업스트림에 **태그가 하나도 없다**(`git ls-remote --tags` 결과 비어 있음). 따라서 sha로 핀을 건다.
후보 두 개를 실제로 받아 트리를 대조했다.

| | `0ab077f` (2026-06-26, 이 머신 설치본) | `5538b35` (현재 upstream main) |
|---|---|---|
| plugin.json version | 1.0.0 | 2.6.1 |
| 스킬 디렉터리 | SKILL.md + references + assets | SKILL.md + references + assets + **scripts** |
| references 파일 수 | 18 | 53 |
| assets 파일 수 | 47 | 143 |
| 저장소 루트 `commands/` | **없음** | **있음** — doctor, profile, export-diagram, import-drawio, import-mermaid |
| 이 머신에서 실제 동작 확인 | 예 | 아니오 |

**`0ab077f`를 핀한다.** 근거:

1. `5538b35`의 구조는 **확인했고 온전하다** — 이것은 무지가 아니라 의도적 지연(lag)이다.
2. `5538b35`는 저장소 루트에 `commands/`를 추가했다. 이 마켓플레이스에 등재한다는 것은
   `/doctor`·`/profile` 같은 **범용 이름의 슬래시 커맨드를 사용자 세션에 주입하는 플러그인**을
   우리가 추천한다는 뜻이다. `0ab077f`는 `commands/`가 아예 없는 **순수 스킬**이고,
   #26의 옵트인 워크플로우가 probe 하는 대상도 정확히 그 스킬 표면이다.
3. 1.0.0 → 2.6.1은 **major 2개 분량의 동작 변화**다. "구조가 온전함"은 "검증됨"이 아니다.
   이 task에서 2.6.1의 실제 동작을 검증할 방법이 없다.
4. 핀의 존재 이유가 "업데이트는 내가 올릴 때만"이므로, 검증되지 않은 최신을 초기값으로 박는 것은
   핀을 거는 이유 자체를 부정한다. 올리는 절차는 `MAINTAINING.md`가 소유한다.

### 가장 큰 기술 리스크 — 릴리스 파이프라인

`src/commands/release.mjs`에 세 개의 결합된 가정이 있었다:

- L159 하드 가드: `marketplace.plugins.length !== 1`이면 throw.
- L165/L181: `marketplace.plugins[0]`을 **인덱스로** 직접 읽어 name 대조·버전 동기화.
- L22-37 `surgicalVersionReplace`: 파일 전체에서 `"version": "<old>"`가 **정확히 1회** 나와야 함.

새 계약:

- 가드를 "배열 길이 1"이 아니라 **"`plugin.json.name`과 일치하는 자기 항목이 정확히 1개"**로 바꾼다.
  0개(빈 배열·이름 불일치)와 2개 이상(중복 등재) 모두 여전히 throw 한다 — 가드는 약해지지 않는다.
- 버전 동기화 대상은 `plugins[0]`이 아니라 **이름으로 찾은 자기 항목**이다.
- **동반 항목은 버전 동기화 대상이 아니다.** `version` 필드를 넣지 않는다. 핀은 `source.sha`로 표현한다.

곁가지로 함께 고쳐야 오해를 남기지 않는 곳: `ERROR_ADVICE.schema` 문구(release.mjs),
`commands/harness-release.md`의 `plugins[0].name` 언급, `README.md`의 `plugins[0].version` 언급.

배열 순서는 **자기 항목을 첫 번째로** 유지한다(우리 마켓플레이스이고, 인덱스로 읽는 잔존 소비자를 덜 놀라게 한다).

한 가지 배포 위험: PATH의 `harness-team`은 보통 marketplace clone을 가리키는 심볼릭 링크다
(MAINTAINING.md "설치본 세 곳"). **옛 가드(`length !== 1`)를 가진 clone**은 이제 정상적인
marketplace.json을 읽고도 throw 한다. 그래서 MAINTAINING.md 핀 절에 "release를 돌리기 전에
clone을 이 버전 이후로 갱신하라"를 명시한다.

### doctor 확장은 하지 않는다 (판단과 근거)

스킬은 바이너리가 아니라 `command -v`로 잡히지 않는다. 탐지 후보였던
`~/.claude/plugins/known_marketplaces.json`을 실제로 열어 확인한 결과:

- 스키마 문서도 `$schema`도 버전 필드도 없는, Claude Code가 소유하는 **내부 상태 파일**이다.
  공개 계약이라고 볼 근거가 없다.
- 하네스는 Codex·Gemini·Cursor에서도 동작해야 하는데 이 파일은 Claude Code 전용이다.
- 다이어그램은 **옵트인**이다. 설치하지 않기로 한 사용자에게 doctor가 결함을 보고하면 오탐이다.

따라서 **doctor 체크를 넣지 않는다.** 런타임 probe(#26·#25가 이미 구현)로 충분하다.
못 만들 체크를 약속하지 않는 것이 정직하다.

### 어댑터 커맨드 `/harness-diagram`

- 커맨드는 전부 `/harness-<verb>` 형태이므로 `commands/harness-diagram.md` → `/harness-diagram`.
- 스킬은 커맨드의 Codex 래퍼(포인터 방식): `skills/harness-diagram/SKILL.md`가
  `commands/harness-diagram.md`를 SSOT로 읽는다 — `harness-codex-review`와 동일 형식.
- **스킬 description은 하네스 task 문맥으로 한정**한다. "다이어그램을 만든다" 같은 범용 서술은
  상류 `diagram-design`과 같은 요청에 경합하므로 쓰지 않는다.
- 이 커맨드 문서가 **실행 절차의 정본**이다. `CLAUDE.md` 1-B에 정본을 가리키는 한 문장만 추가한다.
- **AGENTS.md는 건드리지 않는다.** #26이 하루 전 머지되며 Codex 리뷰까지 거친 교차 에이전트
  **정책** 텍스트이고, 새 커맨드는 **실행 절차**다 — 같은 내용이 아니다. Claude 전용 커맨드를
  위해 교차 에이전트 정책을 재작성하는 것은 Codex·Gemini·Cursor 독자에게 회귀 위험이 있는 churn이다.
  결과적으로 `ssot-consistency`·`agent-files` 대조 대상은 `CLAUDE.md` ↔ `templates/CLAUDE.md.hbs` 한 쌍뿐이다.
- PR #25(`/harness-ship`)의 다이어그램 절도 같은 계약을 서술한다. 그 브랜치는 건드리지 않고,
  **머지 후 그 절을 `/harness-diagram` 포인터로 줄이는 것**을 PR 본문에 후속 작업으로 남긴다.

### 네임스페이스 사실 (사용자 보고 대상)

사용자는 `team-harness:diagram-design`을 원했으나 **네임스페이스 접두사는 저장소 이름이 아니라
플러그인 이름**이다. `.claude-plugin/plugin.json`의 `name`이 `harness-aijient-team`이므로 실제 노출은
`harness-aijient-team:diagram-design`(기존 스킬도 `harness-aijient-team:harness-task` 형태)이다.
플러그인 이름을 `team-harness`로 바꾸는 것은 캐시 디렉터리·`installed_plugins.json`·마켓플레이스
이름·`release.mjs` 경로까지 건드리는 파괴적 변경이므로 **하지 않는다.**

### 검증 대체 경로 (명시)

`MAINTAINING.md`의 필수 검증은 `harness-team release --dry-run`을 요구하지만, 이 세션은
`harness-team release`를 **어떤 형태로도 실행하지 않는다**(과거 사고). 대체 근거:
`tests/release.test.mjs`·`tests/cli-drift.test.mjs`가 `release()`를 tmpdir 합성 루트에 대해
직접 호출하므로 같은 코드 경로를 커버한다. 새 계약을 고정하는 테스트를 추가한다.

## Ontology

- **동반 플러그인(companion plugin)**: 하네스가 소유·번들하지 않지만 하네스 마켓플레이스가
  **sha로 핀을 걸어 등재**하는 외부 플러그인. 선택 사항이며, 없어도 하네스는 정상 동작한다.
- **자기 항목(self entry)**: `marketplace.json.plugins` 중 `plugin.json.name`과 이름이 같은 항목.
  릴리스의 버전 동기화 대상은 오직 이 항목이며, 정확히 1개여야 한다.
- **핀(pin)**: `source.sha`에 박은 40자리 커밋 해시. 업스트림이 갱신돼도 이 값을 올리기 전까지
  설치본은 바뀌지 않는다. 태그가 없는 업스트림이라 `ref`가 아니라 sha가 핀의 유일한 표현이다.
- **어댑터(adapter)**: 상류 스킬을 다른 이름으로 노출하는 별칭이 아니라, 호출 전후에
  **하네스 규약을 주입**하는 커맨드. `harness-codex-review`가 `codex exec`에 대해 하는 일과 같다.
- **probe → degrade → record**: 외부 도구 의존의 실행 계약. 있는지 확인하고(probe),
  없으면 실패시키지 않고 건너뛰며(degrade), 실행했든 건너뛰었든 artifact에 남긴다(record).

- Ambiguity 게이트 통과 근거: 브리프(W4)가 목표·금지사항·검증 방법·산출물을 모두 명시했고,
  유일한 열린 결정이었던 핀 sha는 두 후보의 트리를 실제로 받아 대조해 근거와 함께 확정했다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — `diagram-design`을 복사하지 않고 sha 핀 동반 항목으로 등재하고,
      릴리스 가드를 자기 항목 기준으로 바꾸며, 하네스 규약을 주입하는 `/harness-diagram` 어댑터를 추가한다.
- [x] **Constraint 명확도** (30%) — release 실행 금지, 어떤 서브커맨드에도 `--help` 금지,
      버전 범프 금지, main 직접 push 금지, PR 머지 금지, `diagram-design` 파일 복사 금지,
      동반 항목에 `version` 필드 금지, 병렬 워커(#25)와 CHANGELOG·plugin.json commands 배열 충돌 주의.
- [x] **Success 기준** (30%) — `npm run test` 전체 통과를 실제 출력으로 확인,
      새 계약을 고정하는 테스트 추가, main 대상 PR 생성(머지 안 함), plan 체크박스 완료 + artifact 기록.
- [x] **Context 명확도** (brownfield) — `src/commands/release.mjs`, `.claude-plugin/marketplace.json`,
      `.claude-plugin/plugin.json`, `commands/harness-release.md`, `tests/release.test.mjs`,
      `tests/manifest-sync.test.mjs`, `tests/cli-drift.test.mjs`, `README.md`, `MAINTAINING.md`,
      `CHANGELOG.md`, `CLAUDE.md` + `templates/CLAUDE.md.hbs`, 신규 `commands/harness-diagram.md` 및
      `skills/harness-diagram/SKILL.md`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0

## 참고

- 브리프: W4 브리프(오케스트레이터 제공) + 중간 추가 요청(어댑터 방향 확정)
- 업스트림: https://github.com/cathrynlavery/diagram-design (MIT, © 2025 Cathryn Lavery)
- 관측 대상: `~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json`
