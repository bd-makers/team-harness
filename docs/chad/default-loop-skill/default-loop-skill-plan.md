# default-loop-skill — Plan

## 목표
S3 기본 루프를 선택형 명령 `/harness-loop`(프롬프트 + 기존 CLI)로 제공하고, 이 task의 한 단계를 그 루프로 돌려 dogfood 증거(S6)를 남긴다.

## 단계
- [x] spec/plan 다이어그램 작성 → docs/chad/default-loop-skill/default-loop-skill-diagram.html
- [x] 1. `tests/loop-command.test.mjs` — S2·S3·S4·S5 계약 테스트를 먼저 쓴다(red 확인)
- [x] 2. `commands/harness-loop.md` 작성(R-1–R-13) + `skills/harness-loop/SKILL.md` 래퍼 + `.claude-plugin/plugin.json` 등록 + `commands/harness-interview.md` 포인터 한 줄 → S1·S2·S3·S4 green
- [x] 3. **`/harness-loop`로 실행(dogfood)**: README 설계 스코프 문단 정정 + 명령 절 추가, `docs/harness-cycle.md` §2 S3 행·§6 B 진행 표시 → S5 green, artifact 루프 기록 줄(S6)
- [ ] 4. overview 재생성(`node scripts/generate-harness-overview.mjs`) + `npm run docs:check` + CHANGELOG `[Unreleased]`
- [ ] 5. `npm run test` 전체 + `node bin/harness-team.mjs scenario check` 전부 pass, 이름 찍힌 실행 출력을 artifact에 기록
- [ ] 6. R2 루브릭 `node bin/harness-team.mjs review codex --framing scenario` → R3 `node bin/harness-team.mjs review codex` → 발견 판별·반영
- [ ] 7. ship 준비(`/harness-ship`, `pr-check`) — push·PR은 사용자 승인 후

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-06 QA를 "읽기 전용 단일 주체"(§4-3)에서 "기계 검사(오케스트레이터) + 루브릭(review CLI)" 두 겹으로 재정의
- 2026-10-06 "진전 없음" = 실패 집합 동일 + diff 무변화(횟수 상한 없음), "루프 기록 줄" 신설

## 참고
- 이 저장소는 `.harness/gates.json`이 없다 — `gate commit`은 "미설정" 안내 후 exit 0. 루프 문서는 미설정을 실패가 아닌 기록 대상으로 다룬다.
- PATH의 `harness-team`은 0.46.0 설치본이라 `scenario`·`--framing scenario`를 모른다 — `node bin/harness-team.mjs`를 쓴다.
