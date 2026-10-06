# r2-scenario-evidence — Plan

## 목표
R2(시나리오 ↔ 증거 대조)를 Done evidence `scenarios` 선언 + `scenario check` CLI + `--framing scenario` 루브릭으로 제공한다.

## 단계
- [x] 파서: `parseDoneEvidenceDeclaration`이 `scenarios`를 검증·반환 (행 1) + 테스트 R2-S1
- [x] CLI: `src/commands/scenario.mjs` `scenario check` + bin·cli-args 배선 (행 2) + 테스트 R2-S2–S5
- [x] 프레이밍: `VERIFY_KIND_SUFFIXES`에 `scenario`, `review-prompts.mjs` 템플릿, `harness-review.md` 미러 + 테스트 R2-S7
- [x] 가드: scenarios 선언 + `verify: required` → `-scenario` kind만 인정 + 테스트 R2-S6
- [x] 문서: spec 템플릿 주석·AGENTS.md.hbs(+AGENTS.md)·README·harness-cycle §4-1b·CHANGELOG
- [x] 검증: `npm run test` green + 이 task spec에 `node bin/harness-team.mjs scenario check` 실행
- [x] 리뷰: `harness-team review codex` + `--framing scenario` 실행, artifact `## Reviews`에 판별 기록
- [ ] 커밋 + `harness-team pr-check`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-06 시나리오·증거 연결·증거 통과·scenario 프레이밍 신설 (spec Ontology 반영)

## 참고
- 다이어그램: 옵트아웃(2026-10-06 사용자 결정) — 단계 없음
