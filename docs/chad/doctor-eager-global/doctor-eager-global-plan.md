# doctor-eager-global — Plan

## 목표

`doctor`의 eager 계층 측정이 **실제 상시 로드량**을 재게 한다 — 프로젝트 `.claude/CLAUDE.md`와
사용자 전역 `CLAUDE.md`를 읽기 전용으로 합산하고, 경고를 파일별로 분해한다.

## 단계
- [x] 설계 결정 1(합산 vs 별도 보고) 판단 + 근거를 spec에 기록하고 **오케스트레이터 확인** — 승인됨
- [x] 브리프 수치 정정 보고(전역 8,734 → 실측 5,620, 합계 21,588 = 88%) — 확인됨, 프레이밍 채택
- [x] `CLAUDE_CONFIG_DIR` 존재·해석을 **1차 출처**(Claude Code 2.1.251 바이너리)로 확인
- [x] 프로젝트 `.claude/CLAUDE.md` 포함 조건(동급 1차 출처 증거) 충족 확인 → 범위에 포함
- [x] `globalClaudeMdPath(env)` 추가 — `CLAUDE_CONFIG_DIR ?? ~/.claude`, 비절대경로는 null
- [x] `checkEagerTierSize(targetDir, env)` 합산 + 파일별 내역 + 해결된 경로 + 처방 분리
- [x] 중복 계산 방지(config home 자체를 target으로 doctor 실행하는 경우)
- [x] 테스트: 전역 유/무/읽기 불가(디렉터리), 임계 위/아래, 사각지대(부분 통과·합계 초과),
      `.claude/CLAUDE.md` 합산, 비절대 config home, 경로 해석,
      **config home == target 중복 계산 방지**(dedupe 제거 시 실패함을 확인)
- [x] 기존 테스트 머신 의존성 제거 — 단위 6곳 + runDoctor 배선에 격리된 `CLAUDE_CONFIG_DIR` 주입
- [x] `MAINTAINING.md` eager 계층 단락 현행화
- [x] `CHANGELOG.md` `## [Unreleased]` 기록 (릴리스 범프 없음)
- [x] 전체 테스트 통과 확인 (`npm test`) — 481 tests / 480 pass / 0 fail / 1 skip(CI 전용 jq) + perf 통과
- [x] `/harness-review` 외부 리뷰 + `artifact.md` `## Reviews` 기록 — claude 엔진(codex capacity 실패·gemini 미설치로 폴백), Approve with nits, 7건 전건 판별
- [x] PR 생성 + CI green 확인 — PR #68, `test (24)` success
- [ ] PR 리뷰 덱(`/mr-change-diagram`) — `docs/diagrams/pr/`에 커밋

> task 다이어그램은 **미옵트인**이다. AO 워커는 사람에게 물을 수 없어 옵트인 질문을 수행할 수
> 없었고, 하네스 계약상 **plan에 체크박스가 없는 것이 곧 "옵트인 안 함" 상태**다. (PR 리뷰 덱은
> 별개 산출물이며 상시 단계라 위에 있다.)

## Ontology 변경 로그

- **eager 계층**의 외연이 넓어졌다: `AGENTS.md`+`CLAUDE.md`(프로젝트) →
  + 프로젝트 `.claude/CLAUDE.md` + 전역 `CLAUDE.md`. 예산은 **합계**에 걸린다.
- **config home** 개념이 새로 들어왔다: `CLAUDE_CONFIG_DIR ?? ~/.claude`.
  절대경로가 아니면 Claude Code 자신이 거부하므로 하네스도 측정을 건너뛴다.

## 참고
- `src/commands/doctor.mjs` — `EAGER_TIER_MAX_BYTES`, `globalClaudeMdPath`, `checkEagerTierSize`
- `tests/doctor.test.mjs` — 단위 11건 + runDoctor 배선 3건
- spec의 "결정 3"·"결정 6"에 1차 출처 인용
