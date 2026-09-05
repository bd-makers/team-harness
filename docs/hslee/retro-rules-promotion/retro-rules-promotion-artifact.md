# retro-rules-promotion — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### 2026-09-05 — 구현 완료 (브랜치 `claude/retro-rules-promotion`, PR 전)

**만든 것**
- `harness-team rules promote [<n>] [--name <slug>] [--paths <a,b>]` — 활성 task artifact의 `## Learnings` 항목을 번호 목록으로 보여 주고(read-only),
  사용자가 고른 항목을 `.claude/rules/<slug>.md`로 복사(유래 마커 `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`) → artifact 원 항목 끝에
  `(→ rules/<slug>.md, <날짜>)` 표기 → cursor 미러 재생성. 거부 6종(`no-active-task` exit 1 · `no-artifact`·`invalid-index`·`already-promoted`·`invalid-name`·`rule-exists` exit 2)은 모두 파일 무변경.
- `src/commands/rules.mjs` 한 모듈(순수: `parseLearnings`·`parseRuleMarker`·`renderRule`·`annotatePromoted` / I/O: `checkRuleProvenance`·`runRulesPromote`·`runRules`). `harness.mjs`는 `collectRuleFiles` export 한 단어만 변경.
- doctor `rule provenance` warning(마커 없는 규칙 나열, exit 영향 없음, plugin-dev 게이트 없음). 규칙 템플릿 4종에 `origin=harness-aijient-team/templates since=2026-09-05` 마커.
- 표면: `cli-args`(`rules` 행, `name`·`paths` 값 플래그) · `bin` 라우터 · `commands/harness-promote.md` · `skills/harness-promote/{SKILL.md,agents/openai.yaml}` · `plugin.json` · README 절 · CHANGELOG `[Unreleased]` · `templates/CLAUDE.md.hbs`§3 + 저장소 `CLAUDE.md`§3 한 줄 · overview 재생성.

**검증**
- `npm test` → unit+e2e 572 / pass 571 / fail 0 / skipped 1(CI 전용 게이트), perf 1/1. `npm run docs:check` → 최신.
- `tests/rules.test.mjs` 25건(파서·렌더 왕복·러너 12분기·provenance 4·템플릿 계약·doctor 배선), `tests/cli-args.test.mjs` +1. 모든 Task에서 RED를 먼저 관찰했다(모듈 없음 → ESM export 없음 → unknown command → 마커 없음/export 없음 → manifest·agent-files 드리프트 3건).
- 커밋: 7e17a8e(순수) → 646197e(러너) → d279791(CLI) → 3c11ba6(doctor·템플릿) → 57e3de6(표면) → 2a3c2fa(plan).

**실제 실행 증거** — 임시 소비자 프로젝트(`tester/demo`, Learnings 3개), `node bin/harness-team.mjs … --target <tmp>`:

```text
$ harness-team rules promote
✓ rules promote: docs/tester/demo/demo-artifact.md — Learnings 3개
  1. [날짜 없음] API 핸들러는 입력 검증 없이 DB에 닿으면 안 된다 — zod 스키마를 핸들러 첫 줄에 둔다
  2. [날짜 없음] 테스트 fixture는 mkdtemp로 만들고 finally에서 rm 한다
  3. [2026-09-05] 경계 테스트는 임계값 그 자체를 친다 — 2.5배가 아니라 정확히 2배
next: 승격할 항목을 골라 `harness-team rules promote [<n>] [--name <slug>] [--paths <a,b>]` 실행 — 선택은 사용자 승인

$ harness-team rules promote 1 --name api-input-validation --paths "src/api/**/*.ts"
✓ rules promote: .claude/rules/api-input-validation.md 승격 (origin=tester/demo since=2026-09-05, paths=src/api/**/*.ts)
✓ artifact: docs/tester/demo/demo-artifact.md #1 에 승격 표기
✓ cursor mirror: 1 rule(s)

$ cat .claude/rules/api-input-validation.md
---
paths:
  - "src/api/**/*.ts"
---
<!-- harness:rule origin=tester/demo since=2026-09-05 -->
# api-input-validation

- API 핸들러는 입력 검증 없이 DB에 닿으면 안 된다 — zod 스키마를 핸들러 첫 줄에 둔다

$ cat .cursor/rules/api-input-validation.mdc      # frontmatter → globs 번역, 마커는 본문에 그대로
---
description: api-input-validation rules
globs: src/api/**/*.ts
alwaysApply: false
---

<!-- harness:mirror -->

<!-- harness:rule origin=tester/demo since=2026-09-05 -->
# api-input-validation
…

$ tail docs/tester/demo/demo-artifact.md          # 원 항목은 남고 표기만 붙는다
- API 핸들러는 입력 검증 없이 DB에 닿으면 안 된다 — zod 스키마를 핸들러 첫 줄에 둔다 (→ rules/api-input-validation.md, 2026-09-05)

$ harness-team rules promote 1 --name again        # 재승격
✗ rules promote: already-promoted
cause: #1 은(는) 이미 rules/api-input-validation.md 로 승격됨 (2026-09-05)
exit=2

$ harness-team rules promote 2 --name api-input-validation   # 파일 존재
✗ rules promote: rule-exists
cause: .claude/rules/api-input-validation.md 이(가) 이미 있음 — 덮어쓰지 않는다
exit=2

$ harness-team rules promote 3 --name threshold-tests --json
{ "schema": "harness/observation/v1", "command": "rules", "status": "success",
  "summary": ".claude/rules/threshold-tests.md 승격 (origin=tester/demo since=2026-09-05)",
  "artifacts": [".claude/rules/threshold-tests.md", "docs/tester/demo/demo-artifact.md"], "error": null,
  "action": "promote", "index": 3, "paths": [], "mirrored": 2 }

$ harness-team rules promote                       # 승격 후 목록
  1. … [promoted → rules/api-input-validation.md, 2026-09-05]
  2. [날짜 없음] 테스트 fixture는 mkdtemp로 만들고 finally에서 rm 한다
  3. … [promoted → rules/threshold-tests.md, 2026-09-05]

$ printf "# 유래 없는 규칙\n" > .claude/rules/legacy.md; harness-team doctor --json | checks[label="rule provenance"]
{ "label": "rule provenance", "status": "warning",
  "detail": ".claude/rules에 유래 없는 규칙 1개: legacy.md — 각 파일 본문 첫 줄(frontmatter 뒤)에 `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`를 추가하거나 `harness-team rules promote`로 승격한 규칙만 두라" }
```

이 저장소 자체: retro 전에는 `rules promote` → `no-data`(exit 0, retro 안내), retro로 이 task의 Learnings 5개를 기록한 뒤에는 같은 명령이 5개를 번호 목록으로 나열했다(승격은 하지 않음 — 이 저장소는 `.claude/rules`를 두지 않는다, D7). `doctor` → `.claude/rules` 부재라 `rule provenance` 항목 없음(0건).

**리스크·미검증**
- Claude Code가 `.claude/rules` 파일의 block-level HTML 주석도 컨텍스트 주입 전에 제거하는지는 문서가 "CLAUDE.md files"라고만 말해 미확인. 제거되지 않아도 마커 한 줄이 실릴 뿐 동작은 같다.
- 기존 소비자 설치의 템플릿 사본(마커 없음)은 doctor 경고 대상 — 브레인스토밍에서 수용한 트레이드오프. 안내문에 수동 스탬프 방법을 넣었다.
- `annotatePromoted`는 줄 단위로 다시 합치므로 CRLF artifact는 LF로 정규화된다(주석·spec에 명시). 사용자 Learnings 항목이 `paths` 없이 승격되면 항상 로드되는 규칙이 된다 — 슬래시 명령 2단계가 이를 알린다.
- codex read-only 샌드박스는 `mkdtemp EPERM`이라 통합 테스트를 못 돌린다 — 리뷰는 정적 대조이며 `npm test`는 이 세션의 출력이 증거다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


## Learnings (2026-09-05)

- cli-args의 '선언된 플래그는 읽힌다' 가드는 `flags.<key>`·`flags['<key>']` 리터럴만 인정한다 — `ctx.flags?.name` 같은 optional chaining은 불일치. 값 플래그는 `const flags = ctx.flags ?? {}` 뒤 리터럴로 읽는다.
- ESM에서 아직 없는 named export를 import하는 테스트는 그 파일 전체가 link 오류로 죽는다(개별 케이스 fail이 아님). RED로는 유효하지만 "기존 N건 pass + 신규 M건 fail" 모양을 기대하면 틀린다 — plan에 RED 형태를 적을 때 이 차이를 쓴다.
- macOS perl `-0pi`로 소스를 스플라이스할 때 `─+`처럼 멀티바이트 문자에 양화사를 걸면 바이트 단위로 매칭돼 조용히 실패한다(치환 0건, exit 0). 유니코드 앵커는 node 스크립트로 `includes` 확인 후 치환하고, 앵커 부재는 throw로 드러낸다.
- zsh는 `CLI="node bin/x.mjs"; $CLI args`를 단어 분리하지 않아 `no such file or directory: node bin/x.mjs`가 난다 — 스크립트에서는 함수(`cli() { node bin/x.mjs "$@"; }`)로 감싼다.
- 문서상 `.claude/rules` frontmatter 공인 키는 `paths`뿐이라 유래 같은 메타는 frontmatter 키가 아니라 저장소 마커 관례(HTML 주석 `harness:*`)로 싣는 편이 안전했다 — `splitRulePaths`가 frontmatter만 벗기므로 마커는 cursor 미러에도 그대로 실린다.
