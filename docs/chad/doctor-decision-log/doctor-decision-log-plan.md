# doctor-decision-log — Plan

## 목표
doctor에 `docs/decisions.md` 존재 + `## D2`/`## D4`/`## D5` 제목 검사(warn 수준)를 추가하고,
존재/부재/부분누락 테스트와 함께 `npm run test` 전체 green을 만든다.

## 단계
- [x] `checkDecisionLog` 헬퍼 추가 + runDoctor 배선 (⚠️ warning, JSON next_actions는 부재 케이스만 apply)
- [x] `templates/docs/decisions.md` 추가 (PR #30 브랜치와 동일 바이트) + `npm run docs:generate`
- [x] `tests/doctor.test.mjs`: 존재/부재/부분누락 단위 3케이스 + runDoctor 통합 1케이스
- [x] `npm run test` 전체 green 확인 (313 + perf 1, fail 0)
- [x] 외부 리뷰 (Codex read-only; Gemini 미실행 — CLI 미설치) → artifact ## Reviews 기록,
      P2 1건(읽기 오류 crash) 조치 + 회귀 테스트, 재실행 314 + perf 1 green
- [ ] artifact 기록 + 커밋 (`feat(doctor): …` 한글 컨벤션)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- decision log / skipExisting 전파 갭 — spec.md Ontology에 정의 (task 생성 시)

## 참고
- e2e `apply-smoke`가 "apply 직후 doctor status success"를 고정하므로 템플릿 동반이 필수다.
