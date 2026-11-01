#!/usr/bin/env bash
# Seeds a harness project whose active task has only the skeleton spec that `harness-team task` creates.
set -euo pipefail

mkdir -p .harness docs/hslee/csv-export src/admin

cat > .harness/active.json <<'EOF'
{
  "user": "hslee",
  "task": "csv-export"
}
EOF

cat > AGENTS.md <<'EOF'
# admin-console — AI Team Contract
모든 작업은 `docs/<user>/<name>/` 아래 spec·plan·handoff·artifact 네 파일로 관리한다.
활성 task는 `.harness/active.json`에 있다.
EOF

cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: csv-export (docs/hslee/csv-export/)
EOF

cat > src/admin/OrdersPage.tsx <<'EOF'
export function OrdersPage() {
  return null;
}
EOF

cat > src/admin/api.ts <<'EOF'
export async function fetchOrders(filters: Record<string, string>) {
  const qs = new URLSearchParams(filters);
  return fetch(`/admin/orders?${qs}`).then((r) => r.json());
}
EOF

cat > docs/hslee/csv-export/csv-export-spec.md <<'EOF'
# csv-export — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*


## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다.*


## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
원천이 없으면 `- 없음 — <사유>` 한 줄.*

### 원천

### 발견


## 설계 / 접근


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **개념 A**:
- **개념 B**:

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

## 참고
EOF

cat > docs/hslee/csv-export/csv-export-plan.md <<'EOF'
# csv-export — plan

## 단계
- [ ] spec 초안
- [ ] spec 인터뷰
- [ ] 구현

## Ontology 변경 로그
EOF
