# ship-command — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과 (2026-08-20)

`/harness-ship` — PR/MR 직전 최종 갱신 커맨드를 추가했다. PR #25 (base: main, 머지하지 않음).

- `commands/harness-ship.md` (신규) — 핵심 제약 → 실행 절차 7단계 → 예시.
  `commands/harness-codex-review.md`의 구조·문체를 따랐다.
- `skills/harness-ship/SKILL.md` (신규) — Codex 래퍼. `skills/harness-task/SKILL.md` 형식대로
  command 문서를 SSOT로 읽고 Claude 전용 참조(`AskUserQuestion`, `diagram-design`)를 번역한다.
- `.claude-plugin/plugin.json` commands 배열 등록 (version 필드 불변, 21 → 22개).
- `AGENTS.md` ↔ `templates/AGENTS.md.hbs` — task 워크플로우에 **도구 중립 한 줄**만 추가(쌍 동일).
- `README.md` — 커맨드 수 21 → 22, 빠른 시작에 ship 단계, `/harness-ship` 절 추가.
- `CHANGELOG.md` `[Unreleased]` → Added (버전 범프 없음).
- `docs/harness-overview.html` — `npm run docs:generate` 재생성(생성물).
- 다이어그램: 미실행 (이 task 자체는 다이어그램 산출물이 필요 없는 문서·커맨드 변경 —
  `diagram-design` 스킬 호출 없음).

### 검증 (실제 출력)

```
$ npm run docs:check
harness overview 생성 상태가 최신입니다.

$ npm run test
ℹ tests 290 / pass 290 / fail 0        (tests/*.test.mjs + tests/e2e/*.test.mjs)
ℹ tests 1   / pass 1   / fail 0        (tests/perf/*.test.mjs)
```

샌드박스(`tests/e2e/sandbox.mjs`의 `appliedSandbox`)로 실제 scaffold 결과도 확인:
새로 apply 된 프로젝트의 `AGENTS.md`에 ship 한 줄이 들어가고, Claude 전용 `diagram-design`
호출은 들어가지 않으며, `CLAUDE.md`가 protocol 절을 복제하지 않는다.

### 하지 않은 것 (의도적)

- `harness-team done`·릴리스 플로우 무변경. `harness-team release` 미실행, main 직접 푸시 없음.
- 새 CLI 서브커맨드 없음(근거는 spec.md 설계 절).
- 다이어그램 옵트인 응답을 저장하는 상태 저장소(`.harness/config.json` 스키마·전용 doctor 체크) 없음.
- PR은 열기만 하고 머지하지 않았다.


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- **생성물은 `git add` 다음에 생성한다.** `scripts/generate-harness-overview.mjs`는 source tree를
  `git ls-files`로 열거하므로, 새 파일이 untracked인 채로 `npm run docs:generate`를 돌리면 새 행이
  빠진 HTML이 생성되고 커밋 후(추적 상태) 테스트가 깨진다. 순서: 파일 작성 → `git add` →
  `docs:generate` → `git add` 재생성물 → commit.
- **문서 규칙은 항상 쌍으로 존재한다.** `AGENTS.md`↔`templates/AGENTS.md.hbs`,
  `CLAUDE.md`↔`templates/CLAUDE.md.hbs`. `tests/agent-files.test.mjs`가 마커 절을 `assert.equal`로
  비교하므로 공백·줄바꿈까지 바이트 동일해야 한다.
- **커맨드 추가는 4곳을 동시에 건드린다**: `commands/<name>.md`, `skills/<name>/SKILL.md`(같은
  `name:` + `commands/<name>.md` 참조 필수), `.claude-plugin/plugin.json` commands 배열,
  `docs/harness-overview.html`(생성물). manifest-sync가 네 방향을 모두 강제한다.
- **skills frontmatter는 allowlist다** — `name`/`description`/`license`/`allowed-tools`/`metadata`만
  허용되고 description에 꺾쇠(`<`, `>`)를 쓸 수 없다. command 쪽 `phase:`·`argument-hint:`를 그대로
  복사하면 즉시 실패한다.
- **command 문서에 존재하지 않는 `harness-team <sub>`를 쓰면 CI가 막는다.** manifest-sync가 백틱·
  줄머리 표기를 모두 스캔해 router case와 대조하므로, 예시 코드펜스 안이라도 안 된다. 이것이
  "새 CLI를 만들지 않는다"는 결정의 실제 강제 지점이었다.
- **probe 대상이 바이너리가 아니면 `command -v`를 쓸 수 없다.** `diagram-design`은 Claude Code
  플러그인 스킬이라 존재 확인이 "스킬이 노출되는가 / 호출이 성공하는가"로 표현되어야 한다.
  codex-review에서 가져올 것은 문구가 아니라 **구조**(probe → 단정적 설치 안내 금지 → degrade →
  '미실행' 기록)였다.

