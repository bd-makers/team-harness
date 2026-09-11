# codex-hook-injection-fix — Plan

## 목표
Codex 훅을 실제로 살린다 — 봉투 형식 전환 + 신뢰 부재의 표면화 + README 정정. patch 0.38.3.

## 단계
- [x] `session-context --codex-hook` 봉투 + `cli-args` 플래그 등록
- [x] 템플릿과 이 저장소의 `.codex/hooks.json`에 플래그 반영
- [x] `doctor.checkCodexHookTrust` — 신뢰 2겹 검사, codex 미사용 시 침묵
- [x] e2e 샌드박스 `CODEX_HOME` 격리 (개발 머신 설정 유입 차단)
- [x] 테스트 15건 + 기존 pin 갱신(`--codex-hook`이 빠지면 조용히 죽는 회귀를 pin이 잡는다)
- [x] README `:111` 표·문장 정정
- [x] 실제 codex 세션으로 주입 실측
- [x] `npm run test` 전체 통과 확인
- [x] codex 리뷰 3회 → P1 1·P2 8 판별·반영 → artifact 기록 (루프 종료 근거 포함)
- [x] followups 2번 갱신 (A' 완료 → 남은 것은 B/C 결정)
- [x] 릴리스 문서 → `release 0.38.3` → 단일 커밋(814ea37) → push·태그 v0.38.3·clone 갱신

## Ontology 변경 로그
- 2026-09-12 **봉투(envelope)** · **신뢰 2겹** 신설 — probe task의 실측을 구현 어휘로 굳힌다.

## 참고
- Claude 경로(평문 stdout)는 불변. 봉투는 `--codex-hook`일 때만.
