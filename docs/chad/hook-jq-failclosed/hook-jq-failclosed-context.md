# hook-jq-failclosed — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: jq가 없어도 훅 4개가 jq 있을 때와 같은 차단/허용 판정을 내리게 한다(fail-open → fail-closed).
- Current atomic step: 구현·테스트·문서 완료 → 커밋 후 main 대상 PR 생성(머지 금지).
- Stop / human-decision condition: 판정 기준(정규식·exit 코드) 변경이 필요해 보이면 멈추고 확인.

## Constraints and settled decisions
- "jq 없으면 무조건 exit 2" 금지 — 훅은 매 도구 호출마다 돈다.
- payload 전체 스캔 **기각**: description 필드가 `.*`를 완성시켜 안전한 명령을 차단(실측).
- 채택: `"key": "value"` 문자열만 grep 추출 → 같은 패턴 적용. 추출 실패 시에만 payload 전체(fail-closed).
- 공유 lib 파일 **미사용**: copyTree는 skipExisting이라 파일 단위 배달 → source 실패가 곧 fail-open 재발.
  대신 4개 훅에 동일 블록 + 동일성 테스트로 드리프트 방지.
- auto-format은 보안 통제가 아니므로 판정(항상 exit 0) 유지, 파서만 공유.
- doctor: jq만 optional → warning (fail++ 없음).
- 잔여 리스크(커밋 메시지 오탐, `git -C` 우회)는 범위 밖 — 현재 동작을 테스트로 고정만.
- W7의 `docs/prerequisites.md`는 건드리지 않는다.

## JIT retrieval map
- Identifiers / symbols: `json_field`, `jq_missing`, `harness:jq-fallback`, `EXTERNAL_TOOLS`, `missingDetail`
- Narrow globs: `templates/.claude/hooks/*.sh`, `tests/hooks-jq-fallback.test.mjs`, `src/commands/doctor.mjs`
- Read next: PR 리뷰 코멘트 / CI 결과
- Verification command: `node --test tests/hooks-jq-fallback.test.mjs` · `npm run test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none — 착수 시 재현했던 fail-open은 해소됨)

## Resume checklist
- PR 번호 확인 후 CI 결과 확인, 실패 시 수정·재푸시.
- W7 PR이 먼저 머지되면 리베이스하며 prerequisites.md 문구 정합(문서 수정은 W7 소유).
