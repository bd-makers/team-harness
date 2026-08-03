# th-capsule-grammar — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 하위 제목을 capsule 본문 범위로 인정하되 제목 자체는 실질 내용에서 제외해 예산 판정을 바로잡는다.
- Current atomic step: feature branch 커밋 완료; task 완료 확인을 대기한다.
- Stop / human-decision condition: 반대되는 기존 코드 계약, 외부 의존성 필요, 또는 세 번째 독립 카운터 결함이 확인되면 중단한다.

## Constraints and settled decisions
- `#`/`##`만 종결자이며 `####` 이하는 capsule 본문 범위다.
- 모든 ATX 제목 줄 자체는 실질 본문이 아니다.
- 줄 단위 스캔 유지, 외부 의존성 추가 금지, 루트/템플릿 문서 동기화.

## JIT retrieval map
- 완료 전 검증 기록은 `<name>-artifact.md`의 `## 검증`을 참조한다.

## Failure capsules (max 3 unresolved)
- 없음

## Resume checklist
- task 완료 신호가 있으면 `harness-team done`으로 종결한다.
