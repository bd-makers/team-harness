# ship-command — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `/harness-ship`(PR/MR 직전 spec·plan·artifact 최종 갱신 + 준비 완료 보고, 다이어그램 옵트인) 추가
- Current atomic step: 완료 — #26 머지 후 main 리베이스·충돌 해소·force-push. 머지는 사용자 몫
- Stop / human-decision condition: PR 머지, `harness-team release` 실행, 버전 범프는 사용자 지시 없이 금지

## Constraints and settled decisions
- `harness-team done`과 릴리스 플로우(PR 없이 main 직접 범프 → 태그)는 건드리지 않는다.
- ship은 PR/MR을 만들지 않는다 — 준비 완료 보고에서 멈춘다.
- 새 CLI 서브커맨드 없음. manifest-sync가 command 문서의 `harness-team <sub>`를 router case와 대조한다.
- 다이어그램: 옵트인 + probe → degrade → record. `diagram-design`은 외부 플러그인·머신별 설치라 하드 의존 금지.
- Claude 전용 호출은 commands/CLAUDE 쪽에만. AGENTS.md는 도구 중립 한 줄.
- 산출물 `<name>-diagram.html`은 SSOT 4파일이 아닌 생성물, 자립형 inline SVG(Obsidian이 script 제거).

## JIT retrieval map
- Identifiers / symbols: `buildCommandRows`, `data-command-source`, `extractSections`
- Narrow globs: `commands/harness-ship.md`, `skills/harness-ship/SKILL.md`, `templates/AGENTS.md.hbs`
- Read next: `tests/manifest-sync.test.mjs`, `tests/documentation-inventory-pointers.test.mjs`
- Verification command: `npm run docs:check && npm run test`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 새 파일 추가 시 `git add` → `npm run docs:generate` 순서 (overview는 git ls-files 기반)
- W2(다이어그램 옵트인)와 AGENTS.md·CHANGELOG.md 충돌 시 rebase로 해결하고 상대 변경을 지우지 않는다
- 새 커맨드 추가 절차의 정본은 MAINTAINING.md '작업 규칙' 표(이번에 정정)
