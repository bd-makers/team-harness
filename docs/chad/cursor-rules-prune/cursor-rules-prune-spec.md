# cursor-rules-prune — Spec

## 목적 / 요구사항

`mirrorCursorRules`가 쓰기만 하고 지우지 않아, 원본이 사라진 `.mdc` 사본이 `.cursor/rules`에
영구히 남는다. Cursor는 그 사본을 계속 로드하므로 규칙 하나가 옛 스코프와 새 스코프로 **두 번**
적용된다. 미러가 더 이상 생산하지 않는 산출물을 제거하게 만든다.

- 원본(`.claude/rules/**/*.md`)이 없는 미러 산출물을 제거
- **손으로 쓴 `.cursor/rules/*.mdc`는 절대 지우지 않는다**
- 비게 된 디렉터리도 함께 제거하되, 다른 내용이 남아 있으면 보존
- `sync`가 prune 건수를 보고

## 설계 / 접근

생성한 `.mdc`에 마커 `<!-- harness:mirror -->`(마크다운 주석 — Cursor 렌더링에 보이지 않음)를
찍고, **마커가 있는 orphan만** 제거한다. 미러가 자기 산출물을 식별할 다른 방법이 없다 —
파일명 규칙만으로는 사용자가 손으로 만든 동명 규칙과 구분되지 않는다.

구버전 하네스가 만든 `.mdc`에는 마커가 없어 prune 대상이 아니다. 보수적 실패는 "낡은 규칙이
남는 것"이지 "사용자 파일이 지워지는 것"이 아니어야 한다.

빈 디렉터리는 walk 후 `rmdir`을 시도하고 실패는 무시한다 — 다른 내용이 있으면 rmdir이 실패하므로
별도 판정 로직이 필요 없다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **미러 산출물(mirror artifact)**: `mirrorCursorRules`가 생성한 `.cursor/rules/**/*.mdc`.
  `<!-- harness:mirror -->` 마커로 식별된다. 하네스가 소유하므로 덮어쓰기·삭제 대상이다.
- **orphan**: 대응하는 `.claude/rules/<rel>.md`가 없는 미러 산출물. 원본이 이름이 바뀌었거나
  삭제됐다는 뜻이며, Cursor에는 여전히 살아 있는 규칙이다.
- **prune**: orphan 제거. `mirror`와 함께 `mirrorCursorRules` 반환값의 action으로 보고된다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 미러가 더 이상 생산하지 않는 `.mdc`를 제거한다.
- [x] **Constraint 명확도** (30%) — 사용자 소유 파일 불가침, 구버전 산출물은 보존, Node 18 호환.
- [x] **Success 기준** (30%) — 규칙을 하위 폴더로 옮기면 옛 `.mdc`가 사라지고 새 위치에 생긴다. 손으로 쓴 `.mdc`와 마커 없는 산출물은 남는다. 빈 디렉터리는 사라진다.
- [x] **Context 명확도** (brownfield 한정) — `src/harness.mjs:mirrorCursorRules`, `src/commands/sync.mjs`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

**게이트 통과 근거**: 유일한 설계 판단(자기 산출물 식별 방법)이 마커로 확정됐고, 나머지는 결정론적
파일 연산이다. [[cursor-rules-mirror]]의 재귀 미러링이 이 결함을 실제 시나리오로 만들었다.

## 참고
- 선행 task: `docs/chad/cursor-rules-mirror/` — `paths:` → `globs:` 번역 + 재귀 미러링
- 모든 기존 테스트가 새 `mkdtemp` 샌드박스를 쓰므로 이 결함을 관측할 수 있는 테스트가 없었다.
