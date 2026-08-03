# th-whatschanged-upkeep — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 최신 변경 설명 문서의 갱신 절차와 드리프트 가드를 추가한다.
- Current atomic step: 검증된 변경을 feature branch에 커밋한다.
- Stop / human-decision condition: 릴리스 도구 변경 또는 근거 자동 생성 요구가 생기면 중단한다.

## Constraints and settled decisions
- `latest + 버전별 스냅샷` 관례와 `package.json`의 기존 버전 표기를 함께 사용한다.
- 변경 근거는 사람이 직접 작성한다. 자동화는 최신성만 판정한다.

## JIT retrieval map
- Identifiers / symbols: `what-changes-latest-version`, `docs:check`, `package.json.version`
- Narrow globs: `MAINTAINING.md`, `README.md`, `tests/*.test.mjs`, `docs/what-changes-*.html`
- Read next: 새 최신성 테스트와 `MAINTAINING.md` 릴리스 단계
- Verification command: `npm test`; `npm run docs:generate`; `npm run docs:check`

## Failure capsules (max 3 unresolved)
- 없음

## Resume checklist
- `npm test`(197 pass), `npm run docs:generate`, `npm run docs:check`, `git diff --check`를 통과했다. 커밋 후 status 파일에 done을 남기고 firstmate의 no-mistakes 지시를 따른다.
