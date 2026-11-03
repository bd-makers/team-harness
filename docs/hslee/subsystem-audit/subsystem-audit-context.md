# subsystem-audit — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 지시·도구·상태·피드백 감사표·판정·후보를 spec·artifact에 남기고 커밋한다(코드 무변경).
- Current atomic step: 검증(`npm test`, `npm run docs:check`) 후 감사 문서 커밋.
- Stop / human-decision condition: 후보 A–E 착수·`docs/decisions.md` 기록은 메인테이너 승인 뒤. push·PR 없음.

## Constraints and settled decisions
- 강의 02(@`a9342ff`)가 정본, README의 다른 5분류는 보조(spec R1).
- eager 여유 233 B(실측) — 후보는 모두 eager 0 B, A의 대안만 약 +50 B.
- `.env.*` 읽기 deny 유지, chadonpro·`ao/*` 손대지 않음.

## JIT retrieval map
- Identifiers / symbols: `gateCommit`(src/commands/gate.mjs:29), `buildProfile`(src/detect-stack.mjs:103), `stackPermissions`(src/settings-permissions.mjs:22)
- Narrow globs: `docs/hslee/subsystem-audit/*`, `templates/.claude/settings.json`, `templates/AGENTS.md.hbs`
- Read next: spec `### 후보 task`
- Verification command: `npm test`, `npm run docs:check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- spec 표의 판정·후보가 artifact 요약과 일치하는지 본다.
- 커밋 전 `git status`로 이 task 폴더만 stage되는지 확인한다.
