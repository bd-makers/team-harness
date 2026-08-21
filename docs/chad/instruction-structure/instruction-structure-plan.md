# instruction-structure — Plan

## 목표

지시 구조 중복 제거 + lazy 정본 이관. eager 로드량 절반 이하, 규칙당 정본 1곳.

## 단계
- [x] templates/docs/decisions.md 신설 (D2/D4/D5 전문) + 레포 docs/decisions.md 동일본
- [x] templates/AGENTS.md.hbs 슬림화 — D-log→규범+포인터, 다이어그램 단일 블록, TCC 축약
- [x] templates/CLAUDE.md.hbs 슬림화 — §1-A·§1-B 제거 (§1에 게이트 트리거 1줄 유지)
- [x] src/commands/task.mjs taskSpecTemplate — 자가진단 안내문에 게이트 규칙 운반
- [x] 루트 AGENTS.md / CLAUDE.md 마커 절을 템플릿과 동일하게 갱신
- [x] 테스트 재작성: agent-files 새 설계 고정 + npm test green (302/302)
- [x] README.md 참조 갱신 (D5 출처 → docs/decisions.md)
- [x] 전역 ~/.claude/CLAUDE.md 드리프트 수정 (레포 밖, 커밋 없음 — hsonpro 머신 수동 반영 필요)
- [x] 외부 리뷰(/harness-codex-review) + artifact ## Reviews 기록 — verdict: changes requested (P2 3건)
- [x] artifact.md 결과 기록
- [x] 리뷰 P2 조치 — 서브에이전트(Sonnet) 구현 + 메인 세션 리뷰 (사용자 지시 2026-08-21):
  P2-2 예외 문구 복원·guide 정합, P2-3 check 메시지에 capsule 경계 힌트, P3-2 command 테스트 핀 보강
- [x] P2-1 doctor 체크는 별도 후속 task로 분리 (spawn_task chip 발행됨)
- [x] harness-overview 재생성 (`npm run docs:generate`) — 커밋으로 추적 파일 트리가 자란 것 반영

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-21: "lazy 정본", "트리거/절차 분해", "표면" 정의 (spec Ontology 참조)

## 참고
- 다이어그램 단계 없음 — 옵트인 질문에 "아니오" (2026-08-21)
