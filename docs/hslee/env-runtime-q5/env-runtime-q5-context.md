# env-runtime-q5 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: D12 Q5 런타임 축 go/no-go 판단 — 결론 no-go(spec D-5).
- Current atomic step: 판단 기록·검증 완료. 종결(`done`)은 main에서.
- Stop / human-decision condition: D12에 이 판단을 가리키는 한 줄을 둘지(spec `## 참고` open).

## Constraints and settled decisions
- 코드·프리셋·decisions.md·eager 문서 무변경. 다시 열 신호는 capsule 원인 `environment`의 런타임 불일치 반복.

## JIT retrieval map
- Identifiers / symbols: `holds`, `detectInstallTrace`, `detectDeclarations` (src/presets.mjs)
- Narrow globs: templates/presets/{node,python}.json
- Read next: spec `## 원천 검토` D-4 실측표
- Verification command: `npm test`, `npm run docs:check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- 재개 시 spec D-5와 `## 설계 / 접근`의 반증 조건부터 읽는다.
