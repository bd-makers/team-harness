# framing-prompts-in-src — Plan

## 목표

프레이밍 프롬프트 7 템플릿(5 접미사, testcritic은 3 루브릭)의 정본을 src 상수로 옮기고,
`harness-team review <engine> --framing <접미사> [--rubric …]`만으로 실행되게 한다. 문서는 같은
텍스트를 text 블록으로 보여주고 pin 테스트가 동기화한다. kind·allowlist·마커·runner는 불변.

## 단계

- [x] **템플릿 모듈** — `src/commands/review-prompts.mjs` 신설: `FRAMING_TEMPLATES`(7 항목:
      framing·rubric·target·doc·template)·`RUBRICS`·`findFramingTemplate(framing, rubric)`.
      루브릭 행 문구는 문서 표에서 그대로 옮긴다.
- [x] **CLI 배선** — `review.mjs`: `--rubric` 검증(testcritic 전용·열거·testcritic에 필수), 템플릿 해석,
      target=task-docs의 scope 기본값·충돌 거부, git target + task-docs 거부, `buildPrompt`에
      spec/plan/artifact path 치환, meta 항목·artifact 정보 줄에 rubric(있을 때만).
      `cli-args.mjs`: `VALUE_FLAGS`·COMMANDS review flags에 `rubric`. `task.mjs` verify 힌트 문구.
- [x] **테스트** — `tests/review-command.test.mjs`: pin loop(7 템플릿 + allowlist 양방향), contrarian
      prompt-file 없이 기록 + 경로 치환, testcritic rubric 4 케이스, adversarial+task-docs 거부,
      prompt-file override 유지, 7 문서 grep(파일에 쓰고·`--prompt-file <path>` 부재). 문서 갱신 전에
      돌려 pin·grep이 **먼저 실패**하는 것을 본다.
- [x] **문서 7종** — 마커 + text 블록으로 교체(표 제거), 실행 명령을 `--framing`(+`--rubric`)로.
      `harness-review.md` 5단계 정본 문구·synopsis. CHANGELOG `[Unreleased]`. `docs/followups.md` 4번 삭제.
- [x] **검증** — `npm run test` 전체 + `npm run docs:check`. 실제 `harness-team review codex --framing adversarial`을
      이 저장소에서 실행(dogfood, prompt-file 없음) → `meta.reviews` 기록 확인.
- [x] **리뷰 판별** — dogfood 리뷰 발견을 4단계로 판별해 artifact 블록 아래에 산문 기록, 진짜 결함은
      수정 후 테스트 재실행.
- [ ] **retro** — `/harness-retro`로 Learnings 기록 후 `harness-team done`.

## Ontology 변경 로그

- **프레이밍 프롬프트의 정본 이동** (신규) — 문서 text/표+산문(에이전트 조합) → src 상수(CLI 치환).
  문서 블록은 미러, `--prompt-file`은 override.
- **루브릭 = testcritic 변형 선택자** (신규) — kind를 바꾸지 않는 프롬프트 속성.
- **target vs scope** (신규) — target은 템플릿 속성, scope는 기록값; target이 scope 기본값·허용을 정한다.

## 참고

- 다이어그램 옵트인: 2026-09-12 물었고 **아니오** — 단계 없음.
- plan 작성: `superpowers:writing-plans` 대신 직접 작성 — 선례(`review-evidence-cli-owned`)와 같은 형식이고
  단계가 7개라 별도 plan 문서는 과잉이다.
- 선행 결정: followups 4번 → B, testcritic → `--rubric`(2026-09-12).
