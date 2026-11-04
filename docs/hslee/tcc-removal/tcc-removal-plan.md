# tcc-removal — Plan

## 목표
TCC를 폐지하고 SessionStart가 plan의 첫 미완 단계를 주입하게 한다. 실패 기록은 artifact로 옮긴다.

## 단계
- [x] 코드: `firstOpenPlanStep`, session-context 주입 교체, task의 context.md 생성 제거, `context` 명령 삭제
- [x] 테스트: session-context·task·golden·stock 테스트 갱신
- [x] 규범: AGENTS.md·템플릿에서 TCC·JIT 절 삭제, 스킬 failure 지시 이동, stock 픽스처 등록, D12 정정
- [x] 문서: 현행 문서·다이어그램 갱신, followups 25번 종결, CHANGELOG BREAKING
- [x] 검증: `npm test`, `npm run docs:check`, 실제 CLI로 새 task와 session-context 확인
- [x] 리뷰: `harness-team review codex`, 발견 재현·판별, artifact 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-04: Task Context Card 폐지. "현재 단계"와 "Failure 기록"을 새로 정의했다.

## 참고
-
