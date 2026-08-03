# th-overview-mermaid — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `docs/harness-overview.html`을 세 정규 소스에서 만드는 생성 산출물로 전환한다.
- Current atomic step: 검증 완료 상태를 확인하고 feature branch에 커밋한다.
- Stop / human-decision condition: 외부 Mermaid 렌더러 의존성 또는 하루 이상 규모의 새 생성 계층이 필요하면 needs-decision으로 중단한다.

## Constraints and settled decisions
- Node.js 표준 라이브러리만 사용하며 숫자 문구를 소스 밖에 하드코딩하지 않는다.
- PR #8의 수동 복제 방지 가드는 약화하지 않는다.
- 문서는 한국어, 코드는 영어, 코드 주석은 한국어로 작성한다.
- 커밋되는 HTML은 표준 Node 생성기로 만들고 Mermaid 원본은 기존 vendored bundle이 브라우저에서 렌더링한다.
- 버전 스냅샷과 workflow simulation 문서는 역사 보존/별도 산출물로 이번 생성 범위에서 제외한다.

## JIT retrieval map
- Identifiers / symbols: `generateOverview`, `buildCommandRows`, `data-generated`, `OPENCODE_A`
- Narrow globs: `docs/harness-overview*.html`, `docs/harness-workflow-simulation*.html`, `commands/*.md`, `tests/*documentation*`
- Read next: 생성기 diff, 브라우저 snapshot, pre-commit hook
- Verification command: `npm run test:unit`, `npm run test`, pre-commit hook 명령

## Failure capsules (max 3 unresolved)
- 없음

## Resume checklist
- 전체 변경과 검증 기록을 커밋하고 Firstmate 상태를 갱신한다.
