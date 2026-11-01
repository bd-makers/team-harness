#!/usr/bin/env bash
# Seeds a harness project whose active task spec carries an unresolved R1 source conflict.
set -euo pipefail

mkdir -p .harness docs/hslee/login-rate-limit docs/sources

cat > .harness/active.json <<'EOF'
{
  "user": "hslee",
  "task": "login-rate-limit"
}
EOF

cat > AGENTS.md <<'EOF'
# demo-app — AI Team Contract
모든 작업은 `docs/<user>/<name>/` 아래 spec·plan·handoff·artifact 네 파일로 관리한다.
활성 task는 `.harness/active.json`에 있다.
EOF

cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: login-rate-limit (docs/hslee/login-rate-limit/)
EOF

cat > docs/sources/login-prd.md <<'EOF'
# 로그인 PRD
- 같은 계정으로 15분 안에 로그인을 5회 실패하면 15분 동안 잠근다.
EOF

cat > docs/sources/auth-api.md <<'EOF'
# Auth API
## POST /auth/login
- 같은 IP에서 1시간 안에 10회를 넘게 요청하면 429 Too Many Requests를 반환한다.
EOF

cat > docs/hslee/login-rate-limit/login-rate-limit-spec.md <<'EOF'
# login-rate-limit — spec

## 목적 / 요구사항
로그인 시도 횟수를 제한해 무차별 대입 공격을 막는다.

## 범위 (In / Out)
- In: POST /auth/login
- Out: 비밀번호 재설정

## 원천 검토 (R1)
### 원천
- PRD: docs/sources/login-prd.md
- API 문서: docs/sources/auth-api.md
### 발견
- 시도 제한 기준 충돌: PRD는 "15분에 5회 실패", API 문서는 "1시간에 10회 요청" (unresolved)

## 설계 / 접근
Redis 카운터로 시도 횟수를 센다.

## Ontology
- 시도: 로그인 요청 1회

## Ambiguity 자가진단
- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- (open) 잠금 해제 방식: 시간 경과 vs 관리자 해제
EOF

cat > docs/hslee/login-rate-limit/login-rate-limit-plan.md <<'EOF'
# login-rate-limit — plan

## 목표
로그인 시도 제한

## 단계
- [ ] spec 인터뷰
- [ ] 구현

## Ontology 변경 로그
EOF
