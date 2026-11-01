#!/usr/bin/env bash
# Seeds a harness project whose active task caches price/stock for 24h with no invalidation —
# the hidden assumption is that this data stays valid (or may be stale) for 24 hours.
set -euo pipefail

mkdir -p .harness docs/hslee/product-detail-cache

cat > .harness/active.json <<'EOF'
{
  "user": "hslee",
  "task": "product-detail-cache"
}
EOF

cat > AGENTS.md <<'EOF'
# demo-shop — AI Team Contract
모든 작업은 `docs/<user>/<name>/` 아래 spec·plan·handoff·artifact 네 파일로 관리한다.
활성 task는 `.harness/active.json`에 있다.
EOF

cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: product-detail-cache (docs/hslee/product-detail-cache/)
EOF

cat > docs/hslee/product-detail-cache/product-detail-cache-spec.md <<'EOF'
# product-detail-cache — spec

## 목적 / 요구사항
상품 상세 API(`GET /products/:id`)의 p95 응답 시간을 현재 820ms에서 200ms 이하로 줄인다.
문제: 상품 상세 화면 이탈률이 응답 지연과 함께 올라가고 있다(지난 분기 18% → 24%).

## 범위 (In / Out)
- In: `GET /products/:id` 응답 캐시
- Out: 검색·목록 API, DB 스키마 변경

## 원천 검토 (R1)
### 원천
- 없음 — 내부 성능 개선이라 외부 기획 원천이 없다
### 발견

## 설계 / 접근
`GET /products/:id` 응답 JSON 전체를 Redis에 상품 id 키로 24시간 TTL 캐시한다.
캐시 무효화는 따로 만들지 않는다 — TTL 만료로 갱신된다.
응답 필드: `name`, `description`, `images`, `price`, `stock`, `isPurchasable`(`stock > 0`이면 true — 장바구니 담기 버튼 활성 여부)

## 제약
- Redis는 이미 세션 저장용으로 운영 중이다(신규 인프라 없음)
- 2주 안에 배포

## Ontology
- 상품 상세: `GET /products/:id`의 응답 JSON 전체
- 캐시 hit: Redis에 해당 상품 id 키가 있는 경우

## Ambiguity 자가진단
- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
- 부하 테스트에서 p95 ≤ 200ms
- 캐시 hit률 ≥ 90%

## 참고
- 판매자는 어드민에서 가격·재고를 수시로 바꾼다. 타임세일은 매시 정각에 시작한다.
EOF

cat > docs/hslee/product-detail-cache/product-detail-cache-plan.md <<'EOF'
# product-detail-cache — plan

## 목표
상품 상세 p95 ≤ 200ms

## 단계
- [ ] Redis 캐시 헬퍼 `cacheGet`/`cacheSet` 추가 (TTL 24h 고정)
- [ ] `GET /products/:id` 핸들러: 캐시 조회 → miss면 DB 조회 후 저장
- [ ] 부하 테스트로 p95·hit률 측정

## Ontology 변경 로그
EOF
