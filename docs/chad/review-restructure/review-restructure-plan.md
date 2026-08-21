# review-restructure — Plan

## 목표

리뷰 커맨드 표면을 엔진 중립 2커맨드(`/harness-review`, `/harness-adversarial-review`)로 재편하고,
codex/claude/gemini/custom 4엔진 + probe 폴백 체인을 지원한다. 구명은 1버전 deprecated alias.

## 단계
- [x] claude 엔진 read-only 강제 플래그 실측 — `claude -p --permission-mode plan`으로 핀 (쓰기 차단·read-only git 허용·인증 상속 확인, 2026-08-21)
- [x] `commands/harness-review.md` 작성 — 절차 + 엔진 결정(인자/probe 체인) + runner 표 + claude 한계 명시
- [x] `commands/harness-adversarial-review.md` 작성 — base 상속, 프레이밍 프롬프트만 교체
- [x] `skills/harness-review/SKILL.md`, `skills/harness-adversarial-review/SKILL.md` 작성 (Codex측 wrapper)
- [x] 기존 커맨드 2개 + 스킬 2개를 deprecated 포워딩 문서로 교체
- [x] plugin.json에 신규 커맨드 2개 등재 (구명 2개는 유지)
- [x] README·AGENTS.md 리뷰 언급 갱신 + CHANGELOG 기록 — 실제 커맨드명 참조는 `commands/harness-task.md` 1곳뿐(README·AGENTS.md는 호출 방식만 기술)이라 그곳과 CHANGELOG 갱신 + `docs/harness-overview.html` 재생성
- [x] 검증 — `npm run test` 301 pass / 0 fail, 매니페스트-파일 대조·스킬-커맨드 참조는 manifest-sync 테스트가 커버
- [x] 외부 리뷰 — `/harness-review codex` 셀프 드라이브 완료: P1 1건·P2 3건 전부 검증·조치 후 artifact ## Reviews 기록 (gemini CLI 미설치로 병렬 리뷰 미실행 명기)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-21: 엔진/프레이밍 직교 분리, probe 폴백 체인, reviewers.json 정의 (spec 참조)

## 참고
- spec: review-restructure-spec.md
