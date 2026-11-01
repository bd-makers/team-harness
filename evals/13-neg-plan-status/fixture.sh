#!/usr/bin/env bash
# Seeds a harness project whose active task needs one CSV download but whose plan builds an
# exporter plugin registry, three unrequested formats, a job queue and an always-on flag.
set -euo pipefail

mkdir -p .harness docs/hslee/order-csv-export

cat > .harness/active.json <<'EOF'
{
  "user": "hslee",
  "task": "order-csv-export"
}
EOF

cat > AGENTS.md <<'EOF'
# demo-admin — AI Team Contract
모든 작업은 `docs/<user>/<name>/` 아래 spec·plan·handoff·artifact 네 파일로 관리한다.
활성 task는 `.harness/active.json`에 있다.
EOF

cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: order-csv-export (docs/hslee/order-csv-export/)
EOF

cat > docs/hslee/order-csv-export/order-csv-export-spec.md <<'EOF'
# order-csv-export — spec

## 목적 / 요구사항
관리자 주문 목록 화면에서 지금 걸린 필터 결과를 CSV 파일 하나로 내려받는다.
문제: 정산 담당자가 매주 주문 목록을 화면에서 복사해 엑셀에 붙여넣고 있다(주 2시간).

## 범위 (In / Out)
- In: 관리자 주문 목록 화면의 CSV 다운로드 버튼 1개
- Out: 다른 화면의 내보내기, CSV 외 포맷, 예약·백그라운드 내보내기

## 원천 검토 (R1)
### 원천
- 없음 — 정산 담당자 요청 1건, 별도 기획서 없음
### 발견

## 제약
- 필터 결과는 최대 5,000행이다(주문 목록 화면의 기존 페이지 상한)
- 새 의존성 없음

## Ontology
- 필터 결과: 주문 목록 화면에 현재 적용된 필터로 조회되는 주문 전체

## Ambiguity 자가진단
- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
- 필터 결과가 3행이면 헤더 1행 + 데이터 3행짜리 CSV가 내려받아진다

## 참고
EOF

cat > docs/hslee/order-csv-export/order-csv-export-plan.md <<'EOF'
# order-csv-export — plan

## 목표
관리자 주문 목록 CSV 다운로드

## 단계
- [ ] `Exporter` 인터페이스와 `ExporterRegistry` 플러그인 레지스트리 설계 (포맷별 exporter를 런타임에 등록·조회)
- [ ] `ExportFormat` enum 정의: CSV, XLSX, PDF, JSON
- [ ] `CsvExporter` 구현 후 레지스트리에 등록
- [ ] XLSX·PDF·JSON exporter 스텁 구현 (나중에 쓸 수 있게)
- [ ] 설정 플래그 `export.streaming.enabled` 추가 (기본값 true — 5,000행 이하라 끄는 경우 없음)
- [ ] 내보내기 작업 큐(job queue)와 진행률 폴링 API 추가
- [ ] 현재 필터로 주문을 조회해 CSV로 응답하는 다운로드 엔드포인트와 주문 목록 화면의 CSV 다운로드 버튼 추가
- [ ] CSV 출력 단위 테스트

## Ontology 변경 로그
EOF
