# hook-jq-fallback-delivery — Plan

## 목표

PR #29 리뷰 후속 6건(P1-1·P1-2·P2-1·P2-2·P2-3·P3-1)을 우선순위 순으로 수정하고
mutation 검증까지 통과시킨다.

## 단계
- [x] P1-1: `refreshClaudeHooks` 훅 4개 확장 (stock sha256 대조, 커스터마이즈 보존, confirm/`--yes` 유지)
- [x] P1-1 테스트: 구버전 fixture(4훅) refresh + 커스터마이즈 skip + refresh 후 jq 없는 PATH에서 exit 2 실측 (`tests/migrate-hooks.test.mjs` 7개)
- [x] P1-2: doctor `jqFallbackGaps` 분기 — 마커 부재 시 무방비 경고 + migrate 안내
- [x] P2-3: jq 경고 대응 `warnActions` push (jq 설치 명령, gaps 시 migrate) + Set 중복 제거
- [x] P1-2/P2-3 테스트: doctor.test.mjs 신규 분기 커버 (무방비/저정밀/next_actions 비어있지 않음, 7개 추가)
- [x] P2-1: 폴백 블록 주석 일반화 (4개 훅 바이트 동일 유지) + P3-1 `json_input_field` 스코프
- [x] P2-2: extraction-failure 테스트 (tool_name 부재·command 추출 실패 → nojq에서 차단, 훅 3종 커버)
- [x] P2-1 테스트: `\uXXXX` 우회 잔여 리스크 핀 (nojq exit 0 / withjq exit 2)
- [x] mutation 검증: 게이트 `&&`→`;` → 신규 테스트 1 fail, `COMMAND=""` → 2 fail — 각각 실측 후 원복 확인
- [x] `npm run test` 전체 green + CHANGELOG 갱신 — 361/365 pass; 실패 3건은 전부 선재 환경 문제
      (e2e apply-smoke: 이 머신의 installed_plugins.json 0.15.2 vs 리포 0.16.1 drift 경고 —
      CLAUDE_PLUGINS_ROOT 격리 시 success 실측으로 본 작업 무관 증명)
- [ ] artifact 기록 + 커밋(한국어 conventional) + PR 생성 (P1~P3 매핑 명시)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- "stock 훅" 정의 추가 — refresh 가부의 판단 단위를 "시그니처 문자열"에서 "알려진 배포본 sha256"으로 강화.

## 참고
- spec.md의 Acceptance Criteria가 완료 판정 기준.
- 다이어그램 옵트인: 자율 세션(사용자 부재)이라 미질문·미생성 — artifact에 기록.
