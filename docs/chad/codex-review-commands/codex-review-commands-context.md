# codex-review-commands — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: Codex 리뷰 2종(harness-codex-review / harness-codex-adversarial-review)을 command+skill로 추가
- Current atomic step: §4 종결 — Codex 리뷰(백그라운드) 결과 검증 → artifact 기록 → 커밋 → done
- Stop / human-decision condition: push/PR 여부는 사용자 승인 필요

## Constraints and settled decisions
- 이름은 서술형 채택 (-review1/2 대신) — spec 설계/접근 참조
- commands/<name>.md = 절차 SSOT, skills/<name>/SKILL.md = Codex 래퍼 (harness-retro 패턴)
- codex CLI 설치 명령을 단정하지 않음 (#17 재발 방지)
- docs/harness-overview.html은 생성 파일 — plugin.json 변경 시 scripts/generate-harness-overview.mjs 재실행

## JIT retrieval map
- Identifiers / symbols: commandNames, manifestNames (tests/manifest-sync.test.mjs)
- Narrow globs: commands/harness-codex-*.md, skills/harness-codex-*/SKILL.md
- Read next: docs/chad/codex-review-commands/codex-review-commands-plan.md
- Verification command: npm run test (209+1 pass 기준)

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 백그라운드 Codex 리뷰 결과 확인 → 발견 검증 → artifact ## Reviews 기록
- plan §4 잔여 체크 → 커밋 → harness-team done
