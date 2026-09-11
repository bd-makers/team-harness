# codex-project-hooks-probe — Plan

## 목표
project-level `.codex/hooks.json`이 codex 0.153.4에서 발화하는지, 아니면 무엇이 조건인지 실측으로 답한다.

## 단계
- [x] H1 **기각** — 훅은 sandbox 밖에서 돈다(read-only 에서도 마커 생성)
- [x] H2 **기각** — 조건이 갖춰지면 6개 이벤트가 전부 발화한다(SessionStart 포함)
- [x] H3/H4 **불필요** — `.codex/hooks.json` 경로가 맞다(조건만 갖추면 발화)
- [x] H5 **확정** — 발화 조건은 프로젝트 신뢰 AND 훅 소스 신뢰. 추가 발견: 평문 stdout 은 주입되지 않는다
- [x] 결론과 재현 절차를 artifact에 기록
- [x] `docs/followups.md` 2번의 "선행 검증" 절을 결과로 갱신 (선택지 판정 포함)
- [x] README `:111` 표가 사실과 다름을 확인 — **정정은 별도 task로 제안**(이 task는 코드·템플릿·README 미수정)

## Ontology 변경 로그
- 2026-09-12 **발화(fire)** 정의 — 마커 파일·주입 컨텍스트로 관측 가능한 실행.

## 참고
- 전역 설정은 읽기만 한다. 실험은 `mktemp -d` 저장소에서만.
