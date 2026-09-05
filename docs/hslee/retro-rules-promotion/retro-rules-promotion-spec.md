# retro-rules-promotion — Spec

## 목적 / 요구사항

`harness-team retro`(`src/commands/task.mjs` `runRetro`)는 활성 task `artifact.md`의 `## Learnings`에 날짜 헤더로 **append만** 한다.
소비자 프로젝트의 `.claude/rules/*.md`는 `src/harness.mjs`가 템플릿 4종을 복사하고 `.cursor/rules`로 미러하지만, **학습을 규칙으로 올리는
코드 경로가 없고 규칙에 유래·날짜가 없다**(2026-09-05 PDF 6층 플레이북 비교 분석 권고 ②, evidence #3·#5·#32). PDF TABLE IX·§X.F의
"반복되는 교정은 프롬프트 리마인더(약)가 아니라 규칙·센서(강)로 굳힌다"는 ratchet을 최소형으로 만든다.

1. **새 하위명령 `harness-team rules promote [<n>] [--name <slug>] [--paths <a,b>]`** — 활성 task의 `docs/<user>/<task>/<task>-artifact.md`를
   원천으로 한다. `<n>`이 없으면 `## Learnings…` 절의 항목을 번호·날짜·승격 여부와 함께 **나열만** 하고 exit 0(read-only). 항목이 없으면 `no-data`, exit 0.
2. **승격 = 복사 + 표기** — `<n>`이 있으면 `.claude/rules/<slug>.md`를 쓰고, artifact의 해당 항목 **마지막 줄 끝**에 ` (→ rules/<slug>.md, YYYY-MM-DD)`를 붙인 뒤,
   `mirrorCursorRules`로 `.cursor/rules`를 재생성한다. artifact 항목은 지우지 않는다(학습 이력의 SSOT). 표기가 있는 항목은 목록에서 승격됨으로 보이고 재승격을 거부한다.
3. **규칙 파일 형식** — `--paths`가 있을 때만 `paths:` frontmatter(쉼표 구분, 공백 trim, 빈 조각 제거, 각 값은 큰따옴표). 본문 첫 줄은 유래 마커
   `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`(파서도 이 위치 — frontmatter 뒤 첫 비공백 줄 — 에서만 인정한다), 이어서 `# <slug>`, 빈 줄, `- <학습 본문>`. 마커는 기존 `harness:review`와 같은
   `key=value` 속성 문법이며 `paths` 처리(`splitRulePaths`)는 frontmatter만 벗기므로 마커는 cursor 미러 `.mdc`에도 그대로 실린다.
4. **Learnings 파싱 규약** — `## Learnings` 또는 `## Learnings (YYYY-MM-DD)` 헤더 아래의 `- ` 불릿이 항목이다. 들여쓴 다음 줄은 같은 항목의 이어지는 줄로
   공백 하나로 합친다. `#`·`##` 헤더를 만나면 절이 끝난다(`###` 이하는 절 안). 본문이 빈 불릿(retro가 인수 없이 만든 `-`)은 세지 않는다.
   번호는 파일 순서 1부터이며 승격 표기 여부와 무관하게 안정적이다(표기는 삭제가 아니므로).
5. **거부 — 모두 파일 무변경** — 활성 task 없음 → exit 1(retro와 같은 `cause/retry/stop` 계약). 다음은 exit 2: artifact 없음(`no-artifact`), `<n>`이 정수가 아니거나
   1..N 밖(`invalid-index`), 이미 승격된 항목(`already-promoted`), `--name` 없음 또는 `^[\w.-]+$` 위반(`invalid-name`), `.claude/rules/<slug>.md` 이름이 이미 점유됨(`rule-exists` — 파일·디렉터리·symlink 무엇이든, dangling symlink 포함, `lstat`로 판정),
   첫 토큰이 `promote`가 아님(`invalid-action`, `--json`이면 error envelope). 쓰기 순서는 규칙 파일 → artifact 표기 → 미러이며, 검증은 모두 첫 쓰기 전에 끝낸다.
   규칙을 쓴 뒤 artifact 표기 쓰기가 실패하면 방금 쓴 규칙을 지우고 `artifact-write-failed`(exit 2)로 끝낸다(재시도 가능). cursor 미러 실패는 승격을 되돌리지 않고
   `⚠️` 경고 + `harness-team sync` 안내로 끝낸다(`mirrored: null`, json `mirror_error`) — 미러는 파생물이라 `sync`가 같은 결과를 다시 만든다.
6. **출력** — text: 성공 시 `✓ rules promote: .claude/rules/<slug>.md 승격 (origin=… since=…[, paths=…])` · `✓ artifact: <rel> #<n> 에 승격 표기` · `✓ cursor mirror: N rule(s)` · `next:` 한 줄.
   `--json`: `buildEnvelope({ command: 'rules', status: 'listed'|'no-data'|'success'|'error', summary, next_actions, artifacts, error, extra: { action: 'promote', … } })`.
7. **템플릿 4종 스탬프** — `templates/.claude/rules/{navigation,state-management,styling,testing}.md`의 frontmatter 닫는 `---` 바로 다음 줄에
   `<!-- harness:rule origin=harness-aijient-team/templates since=2026-09-05 -->`를 넣는다. 본문·paths는 바꾸지 않는다. 날짜를 쓰고 릴리스 번호를 쓰지 않는다.
8. **doctor `rule provenance` 경고** — `.claude/rules/**/*.md`(하위 디렉터리·심볼릭 링크 포함, `collectRuleFiles` 재사용) 중 유효한 마커(origin과 `YYYY-MM-DD` since 둘 다, frontmatter 뒤 본문 첫 줄)가
   없는 파일을 정렬해 나열하고 수동 스탬프 방법을 안내한다. 읽을 수 없는 파일(권한·dangling symlink)은 처방이 다르므로 "읽을 수 없는 규칙 N개"로 따로 나열한다. warning이며 fail 카운트·exit code에 영향 없음. 디렉터리가 없으면 null. plugin-dev 게이트 없음.
9. **이름을 부르는 표면 전부** — `src/cli-args.mjs`(COMMANDS `rules` 행, `VALUE_FLAGS`에 `name`·`paths`), `bin/harness-team.mjs`(import·`taskCmds`·`taskArgs`·`case 'rules'`),
   `commands/harness-promote.md`, `skills/harness-promote/SKILL.md` + `agents/openai.yaml`, `.claude-plugin/plugin.json`, README 명령어 레퍼런스 절, CHANGELOG `[Unreleased]`,
   overview 재생성. `templates/CLAUDE.md.hbs` §3 자기개선 루프와 이 저장소 `CLAUDE.md` §3에 승격 안내 한 줄(관리 구획 `workflow` 안이라 init 재실행으로 전파).
10. **승격 판단은 사람** — 슬래시 명령 `/harness-promote`는 후보 목록을 보여 주고 AskUserQuestion으로 항목·slug·paths를 확인한 뒤 CLI를 호출한다. 선택 기준(PDF §X.F)을 질문에 붙인다:
    같은 교정 3회 이상 · 주관 없이 검사 가능 · 어기면 재작업/위험 · 고치는 법을 한 줄로 설명 가능. LLM이 스스로 승격 대상을 고르는 경로는 없다.

범위 제외: 주당 규칙 증가율 스코어카드(evidence #32), 규칙 중복·모순 검출(#4), 승격 취소 명령, `retro` 명령·artifact 템플릿 변경, 템플릿 본문 수정(마커 줄 외),
Codex 쪽 규칙 미러(cursor만), 릴리스.

## 설계 / 접근

- **모듈** `src/commands/rules.mjs` 한 파일. 순수 함수와 I/O를 나눈다.
  - 순수: `parseLearnings(artifact) → [{ index, date|null, start, end, text, promoted: { rule, at }|null }]`, `parseRuleMarker(content) → { origin, since }|null`,
    `ruleMarker({ origin, since })`, `renderRule({ slug, text, origin, since, paths = [] })`, `annotatePromoted(artifact, index, slug, date)`(범위 밖 index는 `RangeError`), `parsePathsFlag(value)`.
    상수 `RULE_MARKER_RE`, `RULE_NAME_RE = /^[\w.-]+$/`(task 이름 규칙과 동일), `PROMOTED_SUFFIX_RE`, `TEMPLATE_RULE_ORIGIN = 'harness-aijient-team/templates'`.
  - I/O: `checkRuleProvenance(targetDir) → string|null`(doctor가 import), `runRulesPromote(ctx)`, `runRules(ctx)`(첫 토큰 디스패치 — `runBoundary`·`runContext`와 같은 모양).
    값 플래그는 `const flags = ctx.flags ?? {}` 뒤 `flags.name`·`flags.paths` 리터럴로 읽는다 — `tests/cli-args.test.mjs`의 "선언된 플래그는 읽힌다" 가드가 이 리터럴을 대조한다(구현 중 확인).
  - 의존: `readActive`(task.mjs), `collectRuleFiles`(harness.mjs — **export만 추가**)·`mirrorCursorRules`·`splitRulePaths`, `fsx`(`exists`·`readTextSafe`·`writeText`), `observation`(envelope).
- **CLI 표면** — `{ name: 'rules', args: 'promote [<n>] [--name <slug>] [--paths <a,b>]', flags: ['name', 'paths'] }`. `--json`·`--target`은 GLOBAL. 라우터는 `rules`를 `taskCmds`(cwd 대상)와
  `taskArgs` 전달 목록에 넣는다.
- **doctor** — `checkEagerTierSize` 호출 다음에 `checkRuleProvenance` 한 줄. 이 저장소에는 `.claude/rules`가 없어 자기 경고가 나지 않는다.
- **날짜** — `since`·표기 날짜는 `new Date().toISOString().slice(0, 10)`(retro의 `today()`와 같은 식, UTC).
- **왜 HTML 주석 마커인가** — Claude Code 공식 문서(2026-09-05 확인)상 rules frontmatter의 공인 키는 `paths`뿐이고 임의 키 처리는 미명시. 반면 CLAUDE.md류 파일의 block-level
  HTML 주석은 컨텍스트 주입 전에 제거된다고 명시돼 있다. 기존 `harness:mirror`·`harness:review`·`harness:section` 마커와 같은 관례라 파서도 같은 패턴을 쓴다.
  미검증 가정: 이 제거가 `.claude/rules` 파일에도 적용된다는 것 — 적용되지 않아도 한 줄이 컨텍스트에 실릴 뿐 동작은 같다.
- **왜 복사인가(이동 아님)** — artifact.md는 task SSOT라 `done` 가드·retro 계약이 그 위에 서 있다. 이동하면 학습 이력이 끊기고, 표기 없이 복사만 하면 재승격을 막을 근거가 없다.
- **왜 LLM 승격이 없나** — D6·AGENTS의 "자동 수정 루프 금지". 후보 제시·기준 안내까지가 도구의 몫이고 선택은 사용자다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Learnings 항목**: artifact의 `## Learnings…` 절 아래 `- ` 불릿 하나(이어지는 들여쓴 줄 포함). 파일 순서 번호가 식별자다.
- **승격(promote)**: 항목 본문을 `.claude/rules/<slug>.md`로 복사하고 원 항목 끝에 표기를 남기는 기계적 동작. 판단은 포함하지 않는다.
- **유래 마커**: `<!-- harness:rule origin=<who/where> since=<YYYY-MM-DD> -->`. origin은 `<user>/<task>` 또는 `harness-aijient-team/templates`. 둘 다 있어야 유효.
- **승격 표기**: artifact 항목 마지막 줄 끝의 ` (→ rules/<slug>.md, YYYY-MM-DD)`. 재승격 거부와 목록 표시의 근거.
- **rule provenance 경고**: 마커 없는 규칙 파일 목록을 담은 doctor warning. 규칙 hygiene(중복·모순)은 아니다.
- 게이트 근거: 목표(요구 1~10)·제약(read-only 목록, 무덮어쓰기, artifact 무삭제, LLM 판단 없음)·완료 기준(러너 전 분기 테스트 + 템플릿↔검사 계약 + 실제 CLI 실행 출력)·
  영향 파일(요구 9의 표면 목록)이 위에 특정됨.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "tests": "required", "review": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 원천 계약: `src/commands/task.mjs`(`runRetro`·`taskArtifactTemplate`·`parseReviewMarkers`의 속성 파서·`readActive`), 테스트 `tests/retro.test.mjs`
- 규칙 복사·미러: `src/harness.mjs`(`copyStaticAssets`·`RN_ONLY_RULE_FILES`·`splitRulePaths`·`collectRuleFiles`·`mirrorCursorRules`·`CURSOR_MIRROR_MARKER`), 테스트 `tests/cursor-rules-mirror.test.mjs`·`tests/stack-conditional-rules.test.mjs`
- doctor 경고 패턴: `src/commands/doctor.mjs`(`checkDecisionLog`·`checkEagerTierSize`·`runDoctor`의 `add(label, 'warning', …)`), 템플릿↔검사 계약 테스트 `tests/doctor.test.mjs`
- CLI 계약: `src/cli-args.mjs`(`COMMANDS`·`VALUE_FLAGS`·`GLOBAL_FLAGS`), `bin/harness-team.mjs`, `src/observation.mjs`; 하위동작 디스패치 예시 `src/commands/boundary.mjs`·`context.mjs`
- pin 테스트: `tests/cli-args.test.mjs` · `tests/manifest-sync.test.mjs`(commands⟺plugin.json, Codex 동등 스킬, README 포인터, 라우터 case) · `tests/agent-files.test.mjs`(템플릿↔저장소 CLAUDE.md 관리 구획) · `tests/harness-overview-generation.test.mjs`
- 근거 문서: `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.evidence.md` #3·#4·#5·#32, PDF "harness_final" TABLE IX·§X.F "When to Harden a Rule", Claude Code memory 문서(`.claude/rules` 절, 2026-09-05)
- 브레인스토밍 결정(2026-09-05): 형태 = `rules promote` 하위명령(retro 불변), 유래 = HTML 주석 마커, doctor = 유래 없는 규칙 경고 + 템플릿 4종 스탬프, 다이어그램 = 아니오
- 실행 증거·검증 출력·리뷰 판별: `retro-rules-promotion-artifact.md` `## 결과`·`## Reviews`
- codex 리뷰(2026-09-05) 7건 전부 진짜로 판별해 반영 — 요구 5·8의 lstat 점유 판정·롤백·미러 경고·마커 위치·읽기 실패 분리는 그 결과다(테스트 8건으로 고정)
