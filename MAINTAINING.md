---
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-08-28
---

# MAINTAINING.md — harness-aijient-team 운영 가이드

이 레포를 수정하는 에이전트·메인테이너를 위한 실무 참조서입니다.

---

## 진실의 원천 (Source of Truth)

이 레포(`harness-aijient-team-plugin/`)가 **단일 진실의 원천(SSOT)**입니다.

- `~/.claude/plugins/cache/harness-aijient-team/` — 배포 캐시 복사본
- `~/.claude/plugins/marketplaces/.../harness-aijient-team/` — 마켓플레이스 배포 복사본
- Codex local marketplace/cache — Codex 설치 결과물

위 경로들은 릴리스/설치 도구가 생성하는 **배포 결과물**입니다. **절대 직접 편집하지 마세요.** 수동 편집은 다음 릴리스에서 덮어씌워집니다.

---

## 시작 순서 (Orientation)

새로운 에이전트·메인테이너가 이 레포를 파악하는 순서:

1. `README.md` — 플러그인 개요, 명령어 레퍼런스, 설치 방법
2. `.claude-plugin/plugin.json` — 슬래시 커맨드 목록 및 메타데이터
3. `.codex-plugin/plugin.json` / `skills/harness-team/SKILL.md` — Codex 플러그인 진입점
4. `npm test` — 현재 테스트 스위트 통과 여부 확인

---

## 작업 규칙

새 커맨드를 추가할 때 **반드시 아래를 함께 수정**하세요:

| 파일 | 역할 | 강제 |
|---|---|---|
| `commands/<name>.md` | 슬래시 커맨드 정의 (프롬프트). frontmatter에 `description`·`phase` 필수 | `manifest-sync`, `generate-harness-overview` |
| `skills/<name>/SKILL.md` | Codex command-equivalent 래퍼. `name: <name>` + `commands/<name>.md` 참조 필수 | `manifest-sync` |
| `.claude-plugin/plugin.json` | 플러그인 커맨드 목록 (양방향 일치) | `manifest-sync` |
| `docs/harness-overview.html` | `npm run docs:generate`로 재생성 — **새 파일을 `git add` 한 뒤에** 돌릴 것(`git ls-files` 기반) | `docs:check`, `documentation-inventory-pointers` |
| `README.md` | 명령어 레퍼런스 섹션 (전체 목록이 아니라 부분 안내) | — |
| `bin/harness-team.mjs` | **CLI를 감싸는 커맨드만.** 에이전트 판단만 하는 커맨드는 CLI 서브커맨드가 없다 | `manifest-sync` |

`bin` 등록은 선택이 아니라 **조건부**입니다: `commands/*.md`가 언급하는 모든
`harness-team <sub>`는 router에 case가 있어야 하고(`manifest-sync`), 반대로 CLI 없는 커맨드는
그런 표기를 문서에 쓰지 않으면 됩니다. `harness-interview`·`harness-ship`처럼 절차가 전부
에이전트 판단인 커맨드가 여기 해당합니다.

`templates/{AGENTS,CLAUDE,GEMINI}.md.hbs`의 managed 섹션(`<!-- harness:section="..." -->` 블록)을 수정할 때는 **이 레포 루트의 같은 파일**(`AGENTS.md`·`CLAUDE.md`·`GEMINI.md`)도 함께 갱신하세요 — `tests/agent-files.test.mjs`가 이 저장소 스택으로 렌더한 템플릿과 루트 적용본의 managed 섹션 내용 일치를 강제합니다. 마커 밖 텍스트(제목 등 저장소 고유 영역)는 검사 대상이 아닙니다.

**eager 계층 크기 예산**: 매 세션 무조건 컨텍스트에 로드되는 파일들이 **eager 계층**입니다 — 필요할 때만 로드되는 커맨드 문서·스킬 같은 **lazy 정본**과 다릅니다(어휘 정의는 `docs/chad/instruction-structure/instruction-structure-spec.md` 참조). `doctor`는 세 곳을 잽니다: 프로젝트 루트의 `AGENTS.md`+`CLAUDE.md`, 프로젝트 `.claude/CLAUDE.md`, 그리고 사용자 전역 `CLAUDE.md`(`CLAUDE_CONFIG_DIR ?? ~/.claude` 아래). **예산은 합계에 걸립니다** — 컨텍스트 윈도우는 바이트의 출처를 구분하지 않으므로, 파일마다 임계를 두면 "각 파일은 통과하는데 합계는 초과"가 green으로 빠져나갑니다. UTF-8 바이트 합을 `EAGER_TIER_MAX_BYTES`(24 KiB — 이 레포 자신의 프로젝트 계층 ~16 KB에 1.5배 여유)와 비교해 초과 시 경고하고, 경고 문구는 파일별 내역을 나눠 어느 계층이 주범인지 보여줍니다. 전역 파일은 **프로젝트 밖(사용자 소유)이라 읽기만** 합니다 — 하네스는 프로젝트 디렉터리 밖에 쓰지 않으므로 크기를 보고할 뿐 조치는 사용자 판단입니다. 새 규칙을 추가할 때 절차 본문은 eager 쪽에 두지 말고 lazy 정본으로 옮기고 트리거 한 줄만 남기세요.

**D6 검증 프레이밍 kind 접미사**(`-adversarial`·`-testcritic`·`-shipcheck`·`-contrarian`·`-simplifier`)를 추가·제거할 때는 열거의 정본인 `commands/harness-review.md` 5단계와 `src/commands/task.mjs`의 `VERIFY_KIND_SUFFIXES`를 **함께** 고치세요 — `tests/done-guard.test.mjs`의 allowlist↔문서 동기화 pin과 `tests/agent-files.test.mjs`의 소비 표면 pin이 한쪽만 바뀐 상태를 CI에서 잡습니다.

---

## 필수 검증

릴리스 전에 아래 두 명령이 반드시 통과해야 합니다:

```bash
npm test
harness-team release --dry-run
```

> `node --test tests/`로 디렉터리를 직접 글롭하지 마세요 — perf 스위트(`tests/perf/`)는
> `npm test`가 별도 단계에서 `--test-concurrency=1`로 격리 실행합니다. 함께 병렬로 돌리면
> 0.19.0에서 잡은 부하성 flake가 되살아납니다.

Codex manifest/skill을 수정했다면 Codex validator도 실행하세요. 로컬 Python에 `PyYAML`이 없으면 해당 validator는 실패할 수 있으므로, 먼저 Python 환경을 준비해야 합니다.

---

## 릴리스 크기 판단 — 특히 문서 전용 변경

이 저장소는 **semver 문자를 그대로 따르지 않고 blast radius로 릴리스 크기를 정합니다.**
기준은 "코드냐 문서냐"가 아니라 **무엇이 깨지느냐 · 소비자가 무엇을 새로 해야 하느냐**입니다.
문서 변경이 판단을 어렵게 하는 이유는, 이 저장소의 문서 일부가 **읽을거리가 아니라 제품**이기
때문입니다 — 에이전트가 그대로 실행합니다.

### 1단계: 어느 표면을 건드렸나

| 계층 | 경로 | 도달 경로 | 틀렸을 때 |
|---|---|---|---|
| **① 에이전트 행동 표면** | `templates/**`(`AGENTS.md.hbs`·`CLAUDE.md.hbs`·`GEMINI.md.hbs`·`.claude/hooks`·`rules`·`skills`·`.codex`·`.opencode`·`templates/docs/`) | `apply`/`init`이 **소비자 프로젝트에 복사** | 그 프로젝트의 에이전트가 잘못 동작 |
| **① 에이전트 행동 표면** | `commands/*.md` · `skills/*/SKILL.md` · `src/**` · `bin/**` | **플러그인 채널**(`/plugin install` → 버전별 캐시). `templates/`에 없습니다 | 슬래시 커맨드·CLI가 잘못 동작 |
| **② 소비자가 읽는 문서** | `docs/*.html` · `README.md` | 캐시에는 복사되지만(제외는 `tests`·`scripts`·`docs/superpowers`뿐) `apply`가 프로젝트에 쓰지는 않음 | 읽는 사람이 오해 — 실행은 그대로 |
| **③ 메인테이너 전용** | `MAINTAINING.md` | 캐시에는 복사되지만(트리 전체 복사) **읽는 소비자가 없음** — `apply`도 쓰지 않습니다 | 다음 릴리스를 하는 사람만 영향 |

> **계층을 가르는 것은 "배포되느냐"가 아닙니다.** 버전별 캐시는 `tests`·`scripts`·
> `docs/superpowers`를 뺀 **트리 전체**를 복사하므로 `MAINTAINING.md`까지 거기 들어갑니다.
> 실제 판별 기준은 **누가 읽고, 무엇이 그대로 동작하느냐**입니다 — ①은 기계가 실행하고,
> ②는 소비자가 읽고, ③은 메인테이너만 봅니다.

**①의 핵심 증거는 0.16.1입니다.** `commands/harness-codex-review.md`의 호출 예시에 `< /dev/null`이
빠져 있었고, 에이전트가 그대로 복사해 **이 하네스를 쓰는 모든 프로젝트에서 재발**했습니다
(리뷰 2건이 각각 38분·63분을 blocking으로 소모). 한 줄짜리 문서 수정이었지만 **patch 릴리스로
발행**했습니다 — 고쳐야 할 것이 사람의 이해가 아니라 **기계의 동작**이었기 때문입니다.

### 2단계: 어느 자리를 올리나

| 무엇을 | 크기 |
|---|---|
| ① 표면의 **수정**(잘못 동작하던 것을 고침) | **patch** — 0.16.1·0.15.1·0.15.2 |
| ① 표면의 **계약 변경·기능 추가**(커맨드 추가·이름 변경·새 가드) | **minor** — 0.17.0·0.18.0·0.20.0 |
| ① 표면의 **제거·호환성 파괴** | **minor**(0.x라 major를 쓰지 않습니다) — 0.19.0·0.21.0 |
| ② 문서만 — 사실이 **틀린** 것을 고침 | **patch** |
| ③ 메인테이너 전용 문서만 | **릴리스하지 않습니다.** main에 얹어 두고 다음 릴리스에 딸려 보냅니다 |

> **깔끔한 semver를 기대하지 마세요.** `0.18.1`은 patch인데 `### Added` 절을 담고 있습니다
> (done 가드 2종). 기존 명령에 대한 증분이라 blast radius가 작다고 판단한 것입니다.
> 크기는 **변경의 종류**가 아니라 **파급 범위**로 정합니다.

**호환성 파괴는 한 곳에 몰아 적으세요 — 아직 그러지 못하고 있습니다.** 0.19.0은 CHANGELOG 본문에
`BREAKING:`을 적었고, 0.21.0은 커밋 마커(`feat(review)!`)와 what-changes 문서에만 적어 **CHANGELOG
절에는 그 단어가 없습니다.** 소비자가 가장 먼저 보는 것은 CHANGELOG와 GitHub Release 본문
(= CHANGELOG 절)이므로, **파괴적 변경은 CHANGELOG 항목 첫 줄에 `BREAKING`을 적습니다.**
커밋 마커와 릴리스 노트는 그 위에 더하는 것이지 대체가 아닙니다.

### 3단계: 지금 발행할 것인가, 묶어 보낼 것인가

②에서 특히 갈립니다.

- **지금 patch로 발행** — 문서가 **틀린 사실**을 말하고 있을 때. 읽는 사람이 그 문장대로
  행동하면 틀리기 때문입니다(예: 종결 가드가 7종인데 "6종"이라고 적힌 상태).
- **다음 릴리스에 묶기** — 보강·다듬기·오타·설명 추가. 틀린 것이 없으면 급하지 않습니다.

### 모든 릴리스는 what-changes 문서를 요구합니다

크기와 무관합니다. `tests/what-changes-latest-version.test.mjs`가
`docs/what-changes-latest-version.html` ≡ `docs/what-changes-<version>.html` ≡
`package.json`의 version을 **세 방향으로** 강제하므로, 한 줄짜리 patch에도 릴리스 노트를
써야 합니다. 건너뛰면 **태그 push 시점**에 빨개집니다(릴리스 절차 5·9단계).

### 기록

`0.22.0`(소비자 HTML 문서 6종 정합화)은 이 기준이 생기기 전에 발행됐고, 이 기준을 적용하면
②에 해당해 patch였습니다. 선례로 인용하지 마세요.

---

## 릴리스 절차

> **주의:** `harness-team release`는 `installed_plugins.json`을 직접 수정합니다. Claude Code가 실행 중이면 경쟁 조건이 발생할 수 있으니, **가급적 Claude Code 종료 후** 실행하세요. 중단 시 복구는 명시적 버전으로 재실행하면 됩니다: `harness-team release X.Y.Z`.
>
> 결과를 미리 보려면 `--dry-run`을 붙입니다. `harness-team release --help`는 사용법만 출력하고 릴리스를 수행하지 않으며, 오탈자 플래그(`--dryrun` 등)는 실행되지 않고 exit 2로 거부됩니다 (`src/cli-args.mjs`).

1. 변경 작성 + `npm test` 통과 확인
2. `CHANGELOG.md`의 `## [Unreleased]` 항목 채우기
3. `harness-team release <minor|patch|major> --dry-run` 으로 결과 미리 확인
4. `harness-team release <minor|patch|major>` 실행
   - 4개 매니페스트(`package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`) 버전 일괄 bump
   - 캐시·마켓플레이스·`installed_plugins.json` 자동 동기화
5. `docs/what-changes-latest-version.html`을 새 버전의 변경·근거로 직접 갱신하고, 같은 내용을 `docs/what-changes-X.Y.Z.html` 스냅샷으로 남깁니다. 이어서 `npm test`, `npm run docs:generate`, `npm run docs:check`를 실행합니다.
   - 변경의 `왜`는 자동 생성하지 않습니다. 릴리스 범위를 검토해 사람이 작성합니다.
   - **`docs/harness-overview.template.html`의 버전 표기 3곳을 손으로 갱신한 뒤 재생성합니다** —
     hero 배지(`<span class="tag tag-purple">vX.Y.Z</span>`), 최신 그룹 배너 산문(`🆕 …` 블록),
     footer. `docs/harness-overview.html`은 생성물이지만 **자동 갱신되는 것은 커맨드·파일 인벤토리뿐**
     이고 이 셋은 템플릿에 하드코딩돼 있습니다. 그래서 `docs:check`가 green이어도 낡습니다 —
     **`docs:check`를 세대 확인 근거로 쓰지 마세요.** 확인은 `grep -n 'v\?0\.[0-9.]*' docs/harness-overview.template.html`로 합니다.
     생성물을 직접 고치면 다음 `docs:generate`가 되돌립니다. 템플릿을 고치고 재생성하세요.
   - **`docs/index.html`의 what-changes 목록에 새 버전을 등재합니다** — 등재하지 않으면 방금 쓴
     릴리스 노트가 문서 허브에서 도달 불가입니다. 이 목록에는 가드가 없어 빠뜨려도 아무것도 빨개지지 않습니다.
   - **왜 이 두 줄이 절차에 있나:** 0.22.0과 0.23.0이 **연속으로** overview 템플릿을 놓쳐 배지가
     두 세대(v0.21.0) 밀린 채 발행됐습니다. 가드 없는 표면은 절차에 적히지 않으면 반드시 밀립니다.
     결합 강도 순서를 기억하세요: `what-changes-*`(3방향 강제) > `harness-overview`(생성+pin, **산문은 무방비**)
     > `prerequisites.md`(doctor 양방향) > `index.html`·simulation·guide류(**가드 0**).
6. `CHANGELOG.md`의 `## [Unreleased]`를 새 버전 헤딩(`## [X.Y.Z] - YYYY-MM-DD`)으로 이동
7. main에서 4~6단계의 결과를 **한 커밋**으로 만들어 push합니다. 기능 변경은 PR로 들어오지만, 릴리스 준비 커밋 자체는 그 PR들이 이미 병합된 main 위에 얹는 범프·문서 커밋입니다.
   ```bash
   git commit -am "chore(release): 버전 X.Y.Z으로 범프"
   git push origin main
   ```
   - **한 커밋이어야 하는 이유:** 9단계의 세 검사는 모두 *태그가 가리키는 커밋* 하나에서 실행됩니다. 매니페스트 범프와 CHANGELOG 이동이 서로 다른 커밋에 있으면, 태그가 이미 공개된 뒤에 워크플로우가 실패합니다.
8. push된 main에서 태그를 만들고 push합니다. 태그 push 전에 커밋이 origin/main에 올라갔는지 확인하세요 — 원격에 없는 커밋을 가리키는 태그가 가장 정리하기 번거로운 실패입니다.
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
   - 태그는 되돌리기 번거로우므로, push 전에 9단계의 세 검사를 로컬에서 그대로 확인하는 편이 낫습니다:
     ```bash
     node scripts/changelog-section.mjs X.Y.Z && node -p "require('./package.json').version" && npm test
     ```
9. 태그 push가 `release` 워크플로우를 실행해 GitHub Release를 자동 발행합니다 — 수동 발행은 하지 마세요.
   본문은 `CHANGELOG.md`의 `## [X.Y.Z]` 절 **내용**입니다 — 헤딩 줄은 빠지고 앞뒤 공백은 정리됩니다
   (`scripts/changelog-section.mjs`).
   워크플로우는 세 경우에 실패하며, 실패하면 Release가 만들어지지 않습니다:
   - 태그 버전과 그 커밋의 `package.json` version이 다를 때 (6단계까지의 bump 누락)
   - 태그가 가리키는 커밋에서 `npm test`가 실패할 때 (태그는 main 외 커밋에도 붙을 수 있으므로 여기서 다시 확인합니다)
   - `CHANGELOG.md`에 해당 버전 절이 없거나 비어 있을 때 (2·6단계 누락)

   실패했다면 원인을 고쳐 main에 반영한 뒤, 태그를 다시 만들어 push합니다
   (`git tag -d vX.Y.Z && git push origin :vX.Y.Z` 후 8단계 재실행).

10. **전역 CLI가 새 코드로 바뀌었는지 확인합니다.** 아래 "설치본 세 곳" 참조 — `release`는 marketplace
    clone의 코드를 갱신하지 않으므로, 이 단계를 건너뛰면 훅과 터미널이 계속 옛 버전으로 실행됩니다.
    ```bash
    harness-team --version   # 새 버전이 나와야 합니다
    ```

---

## 설치본 세 곳과 갱신 주체

릴리스 뒤 이 플러그인은 서로 다른 세 곳에 존재하며, **갱신 주체가 각각 다릅니다.**

| 위치 | 무엇인가 | 누가 갱신하나 |
|---|---|---|
| `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` | 버전별 **설치본** — Claude Code가 커맨드·스킬을 읽는 곳 | `harness-team release` (저장소 트리 전체 복사) |
| `~/.claude/plugins/marketplaces/<marketplace>/` | 저장소의 git clone = **카탈로그** | `/plugin marketplace update`(= git pull). `release`는 `marketplace.json`과 `commands/`만 덮어씁니다 |
| PATH의 `harness-team` | 훅(SessionStart·post-commit)과 터미널이 실제로 실행하는 **바이너리** | 보통 위 clone을 가리키는 심볼릭 링크이므로 **clone을 갱신해야 바뀝니다** |

`release`가 clone의 카탈로그만 갱신하는 것은 의도된 동작입니다 — 남의 checkout을 대신 pull 하는 것은
이 명령의 일이 아닙니다. 대신 clone이 뒤처져 있으면 release가 `⚠️`와 `next:` 힌트로 알리고,
`doctor`의 `global CLI version drift` 검사가 PATH CLI 버전과 `installed_plugins.json`의 설치 버전이
다를 때 경고합니다. 이 검사는 **plugin-dev 저장소에서도 실행됩니다** — 다른 소비자 전용 검사와 달리,
전역 CLI와 소스 트리가 가장 크게 벌어지는 곳이 메인테이너 머신이기 때문입니다.

> **왜 cache가 아니라 clone에 링크하나:** cache 경로는 버전별(`.../0.15.1/`)이라 심볼릭 링크가 그 버전에
> 영구히 고정됩니다. clone이 안정적인 링크 대상인 게 맞고, 문제는 링크 대상이 아니라 clone의 코드를
> 아무도 갱신하지 않는다는 점이었습니다.

---

## 동반 플러그인 (companion plugins) — 핀을 올리는 절차

`.claude-plugin/marketplace.json`의 `plugins` 배열에는 **우리 항목(self entry)** 외에
**동반 항목(companion entry)** 이 들어갈 수 있습니다. 동반 항목은 이 저장소가 소유하지도,
번들하지도, 버전을 매기지도 않는 **외부 플러그인**이며, 카탈로그에 커밋 sha로 **핀을 걸어**
등재만 합니다. 사용자에게는 **선택 사항**입니다 — 설치하지 않아도 하네스는 정상 동작합니다.

현재 동반 항목:

| 이름 | 업스트림 | 라이선스 | 핀 |
|---|---|---|---|
| `diagram-design` | https://github.com/cathrynlavery/diagram-design | MIT © Cathryn Lavery | `0ab077f2291e9056554d48a90c4ff45f0b7029a5` (branch `main`) |

### 형식 규칙 (어기면 릴리스가 깨집니다)

- 항목 형식은 Anthropic 공식 카탈로그를 그대로 따릅니다:
  `{"source": "url", "url": "<repo>.git", "sha": "<40hex>"}`.
  공식 카탈로그의 `url` source 150개 중 146개가 정확히 이 세 키만 쓰고, **`ref`를 쓰는 항목은 0개**입니다.
  브랜치 출처는 JSON이 아니라 위 표에 남깁니다.
- **동반 항목에 `version` 필드를 넣지 마세요.** `release`의 `surgicalVersionReplace`는 매니페스트 텍스트에
  `"version": "<현재버전>"` 문자열이 **정확히 1회** 나온다고 가정합니다. 동반 항목이 version을 들고 있으면
  언젠가 값이 겹쳐 릴리스가 `manifest-format` 오류로 멈춥니다. 핀은 `source.sha`로만 표현합니다.
- 우리 항목은 배열 **첫 번째**로 유지합니다. `release`는 이름으로 자기 항목을 찾으므로 순서에 의존하지
  않지만(`tests/release.test.mjs`가 순서 무관을 고정합니다), 사람이 읽을 때 카탈로그 주인이 먼저 오는 편이 낫습니다.
- 위 규칙은 `tests/manifest-sync.test.mjs`의 `companion entries are sha-pinned and carry no version`이
  CI에서 강제합니다.

### 언제 올리나 (판단은 메인테이너가 합니다 — 자동 추적하지 않습니다)

핀은 **자동으로 따라가지 않습니다.** 그것이 핀을 거는 이유입니다. 다음 중 하나일 때만 올립니다:

- 업스트림에 이 하네스의 워크플로우가 실제로 필요로 하는 수정·기능이 들어왔을 때
- 보안 문제가 공지됐을 때
- 사용자가 특정 업스트림 기능을 요청했을 때

"최신이니까"는 올릴 이유가 아닙니다.

### 올리기 전에 확인할 것

1. 새 sha를 **실제로 받아** 트리를 확인합니다(설치본을 건드리지 말고 임시 디렉터리에서):
   ```bash
   git init /tmp/dd-probe && git -C /tmp/dd-probe remote add origin https://github.com/cathrynlavery/diagram-design.git
   git -C /tmp/dd-probe fetch --depth 1 --filter=blob:none origin <new-sha>
   git -C /tmp/dd-probe ls-tree -r --name-only <new-sha> -- skills/
   ```
2. 스킬 표면이 온전한지 — `skills/diagram-design/SKILL.md`와 `references/`·`assets/`가 그대로인지.
   references는 assets를 다수 참조하므로 assets가 사라지면 스킬이 깨집니다.
3. **저장소 루트에 `commands/`가 생겼는지.** 동반 항목을 등재한다는 것은 그 플러그인의 슬래시 커맨드를
   사용자 세션에 주입하는 것을 우리가 추천한다는 뜻입니다. 범용 이름(`/doctor`, `/profile` 등)이
   추가됐다면 올리기 전에 그 영향을 따져야 합니다.
4. major 버전이 올라갔다면 **동작을 직접 확인**합니다. "구조가 온전함"은 "검증됨"이 아닙니다.
5. 업스트림 `.claude-plugin/plugin.json`의 `version`이 올라갔는지 확인합니다. 설치본은 버전별
   디렉터리(`cache/<marketplace>/<plugin>/<version>/`)에 놓이므로, **sha만 바뀌고 version이 그대로면
   이미 설치한 사람은 캐시된 옛 사본을 계속 쓸 수 있습니다.** 그런 경우 재설치가 필요하다는 사실을
   릴리스 노트에 함께 적습니다.
6. 확인 결과와 올린 근거를 활성 task의 artifact에 남깁니다 — 기록 없는 판단은 다음 사람에게 전달되지 않습니다.

올릴 때 바꾸는 것은 `sha` 한 곳과 위 표의 값뿐입니다. 버전 범프와는 무관하며, `release`를 태우지 않아도 됩니다.

### ⚠️ 옛 clone으로 release를 돌리지 마세요

`release`는 "자기 항목이 정확히 1개" 가드를 쓰지만, **동반 항목 도입 이전(0.16.1까지)의 코드는
"배열 길이가 정확히 1"** 을 요구했습니다. 위 "설치본 세 곳"이 설명하듯 PATH의 `harness-team`은 보통 marketplace clone을 가리키는
심볼릭 링크이므로, **clone이 옛 코드에 머물러 있으면 정상적인 `marketplace.json`을 읽고도 릴리스가
`schema` 오류로 멈춥니다.** 동반 항목을 추가한 뒤 처음 릴리스를 돌리기 전에 clone을 갱신하세요:

**버전 비교로는 잡히지 않습니다** — 이 변경은 버전 범프 없이 들어왔으므로 옛 코드와 새 코드가 같은
`0.16.1`을 보고합니다. 코드 자체를 확인하세요:

```bash
CLONE="${CLAUDE_PLUGINS_ROOT:-$HOME/.claude/plugins}/marketplaces/harness-aijient-team-marketplace"
grep -c selfEntries "$CLONE/src/commands/release.mjs"   # 0 이면 옛 length-one 가드입니다
git -C "$CLONE" pull                                     # 또는 /plugin marketplace update
```

---

## 최신 변경 설명 문서의 최신성 보장

`what-changes-latest-version.html`은 현재 `package.json` 버전을 설명하는 소비자용 문서입니다. 릴리스마다 사람이 근거를 갱신한 뒤 같은 내용을 버전별 스냅샷으로 남깁니다. `tests/what-changes-latest-version.test.mjs`는 현재 문서의 제목·요약 버전 표기, 현재 버전 스냅샷의 존재, 두 파일의 완전한 일치를 검사합니다. 의도적으로 제목 버전을 어긋나게 한 입력도 이 테스트에서 실패하므로, 갱신 단계를 잊으면 PR 전 `npm test`가 실패합니다.

이 선택은 이미 쓰는 `latest + 버전별 스냅샷` 관례를 따르면서 현재 문서의 약속과 역사 기록을 함께 보존합니다. 스냅샷만 남기면 `latest`의 갱신 누락을 막지 못하고, 버전 일치 검사만 두면 릴리스별 기록이 남지 않습니다. 소스 생성은 변경의 근거를 신뢰성 있게 만들 수 없으며, 이 문서의 핵심인 사람이 검토한 `왜`를 자동화하지 않는 원칙에도 맞지 않습니다.

README에서 이 문서를 연결해 실제 독자가 도달할 수 있게 합니다. **재고 조건:** 릴리스마다 사람이 검토한 변경 근거를 보존하는 구조화된 정본이 생겨 문서를 손실 없이 생성할 수 있거나, 버전별 공개 기록을 더 이상 보존하지 않기로 결정하면 이 구조를 다시 검토합니다.

---

## 참고

- 테스트: `tests/` 디렉토리, Node.js 내장 `node:test` 사용
- 외부 의존성 없음 — Node.js 24+ 표준 라이브러리만 사용 (`package.json`의 `engines.node`와 일치)
- 커밋 메시지는 한국어 + Conventional Commits 형식 (`feat/fix/chore/docs/refactor`)
