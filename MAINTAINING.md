---
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-08-13
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
4. `node --test tests/` — 현재 테스트 스위트 통과 여부 확인

---

## 작업 규칙

새 커맨드를 추가할 때 **반드시 아래 네 파일을 함께 수정**하세요:

| 파일 | 역할 |
|---|---|
| `commands/<name>.md` | 슬래시 커맨드 정의 (프롬프트) |
| `bin/harness-team.mjs` | CLI 서브커맨드 등록 |
| `.claude-plugin/plugin.json` | 플러그인 커맨드 목록 |
| `README.md` | 명령어 레퍼런스 섹션 |

네 파일 중 하나라도 누락되면 커맨드가 일부 컨텍스트에서 인식되지 않습니다.

`templates/{AGENTS,CLAUDE,GEMINI}.md.hbs`의 managed 섹션(`<!-- harness:section="..." -->` 블록)을 수정할 때는 **이 레포 루트의 같은 파일**(`AGENTS.md`·`CLAUDE.md`·`GEMINI.md`)도 함께 갱신하세요 — `tests/agent-files.test.mjs`가 이 저장소 스택으로 렌더한 템플릿과 루트 적용본의 managed 섹션 내용 일치를 강제합니다. 마커 밖 텍스트(제목 등 저장소 고유 영역)는 검사 대상이 아닙니다.

---

## 필수 검증

릴리스 전에 아래 두 명령이 반드시 통과해야 합니다:

```bash
node --test tests/
harness-team release --dry-run
```

Codex manifest/skill을 수정했다면 Codex validator도 실행하세요. 로컬 Python에 `PyYAML`이 없으면 해당 validator는 실패할 수 있으므로, 먼저 Python 환경을 준비해야 합니다.

---

## 릴리스 절차

> **주의:** `harness-team release`는 `installed_plugins.json`을 직접 수정합니다. Claude Code가 실행 중이면 경쟁 조건이 발생할 수 있으니, **가급적 Claude Code 종료 후** 실행하세요. 중단 시 복구는 명시적 버전으로 재실행하면 됩니다: `harness-team release X.Y.Z`.
>
> 결과를 미리 보려면 `--dry-run`을 붙입니다. `harness-team release --help`는 사용법만 출력하고 릴리스를 수행하지 않으며, 오탈자 플래그(`--dryrun` 등)는 실행되지 않고 exit 2로 거부됩니다 (`src/cli-args.mjs`).

1. 변경 작성 + `node --test tests/` 통과 확인
2. `CHANGELOG.md`의 `## [Unreleased]` 항목 채우기
3. `harness-team release <minor|patch|major> --dry-run` 으로 결과 미리 확인
4. `harness-team release <minor|patch|major>` 실행
   - 4개 매니페스트(`package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`) 버전 일괄 bump
   - 캐시·마켓플레이스·`installed_plugins.json` 자동 동기화
5. `docs/what-changes-latest-version.html`을 새 버전의 변경·근거로 직접 갱신하고, 같은 내용을 `docs/what-changes-X.Y.Z.html` 스냅샷으로 남깁니다. 이어서 `npm test`, `npm run docs:generate`, `npm run docs:check`를 실행합니다.
   - 변경의 `왜`는 자동 생성하지 않습니다. 릴리스 범위를 검토해 사람이 작성합니다.
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

## 최신 변경 설명 문서의 최신성 보장

`what-changes-latest-version.html`은 현재 `package.json` 버전을 설명하는 소비자용 문서입니다. 릴리스마다 사람이 근거를 갱신한 뒤 같은 내용을 버전별 스냅샷으로 남깁니다. `tests/what-changes-latest-version.test.mjs`는 현재 문서의 제목·요약 버전 표기, 현재 버전 스냅샷의 존재, 두 파일의 완전한 일치를 검사합니다. 의도적으로 제목 버전을 어긋나게 한 입력도 이 테스트에서 실패하므로, 갱신 단계를 잊으면 PR 전 `npm test`가 실패합니다.

이 선택은 이미 쓰는 `latest + 버전별 스냅샷` 관례를 따르면서 현재 문서의 약속과 역사 기록을 함께 보존합니다. 스냅샷만 남기면 `latest`의 갱신 누락을 막지 못하고, 버전 일치 검사만 두면 릴리스별 기록이 남지 않습니다. 소스 생성은 변경의 근거를 신뢰성 있게 만들 수 없으며, 이 문서의 핵심인 사람이 검토한 `왜`를 자동화하지 않는 원칙에도 맞지 않습니다.

README에서 이 문서를 연결해 실제 독자가 도달할 수 있게 합니다. **재고 조건:** 릴리스마다 사람이 검토한 변경 근거를 보존하는 구조화된 정본이 생겨 문서를 손실 없이 생성할 수 있거나, 버전별 공개 기록을 더 이상 보존하지 않기로 결정하면 이 구조를 다시 검토합니다.

---

## 참고

- 테스트: `tests/` 디렉토리, Node.js 내장 `node:test` 사용
- 외부 의존성 없음 — Node.js 18+ 표준 라이브러리만 사용
- 커밋 메시지는 한국어 + Conventional Commits 형식 (`feat/fix/chore/docs/refactor`)
