# framing-prompts-in-src — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- **정본 이동**: 검증 프레이밍 프롬프트 7 템플릿(adversarial·shipcheck·contrarian·simplifier + testcritic
  unit·component·integration)이 `src/commands/review-prompts.mjs`로 갔다. 각 커맨드 문서의
  `<!-- harness:prompt framing=… [rubric=…] -->` 마커 다음 text 블록이 미러이고 pin 테스트가 loop 1개로
  7종을 대조한다(문서에만 있는 고아 마커도 센다). 루브릭 마크다운 표는 블록으로 대체했다 — 문구 불변.
- **CLI**: `harness-team review <engine> --framing <접미사>`만으로 실행. `--rubric unit|component|integration`은
  testcritic 전용 선택자(kind 불변, meta 항목에 있을 때만 `rubric` 필드). contrarian·simplifier는 scope가
  `task-docs`로 고정되고 spec/plan 경로를 CLI가 채운다. git target 프레이밍 + task-docs, rubric 조합 오류,
  testcritic rubric 누락은 엔진 실행 전에 error 패킷. `--prompt-file`은 override로 유지.
- **검증**: `npm run test` 819 tests / 818 pass / 0 fail(1 skip은 기존 CI 전용) · `npm run docs:check` 통과 ·
  dogfood `review codex --framing adversarial`(prompt-file 없음) → `meta.reviews[0]` 기록.
- **문서**: 커맨드 7종 + `harness-review.md` 5단계 + CHANGELOG `[Unreleased]` + `docs/followups.md` 4번 삭제.
  `skills/*/SKILL.md`는 커맨드 문서를 가리키기만 해서 변경 없음.
- **남은 것**: 커밋 → `harness-team done`(가드가 커밋·테스트 파일 이력을 요구). 릴리스는 별도.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-11T19:19:35.876Z — codex-adversarial (harness-team review)

- engine: codex · scope: worktree · tip: 51f04a62dada0cd2c3821ff495e05e6f5029aaed · exit 0 · 1245 B

```text
전하, **P2 1건으로 수정 후 병합을 권고합니다. P1 차단 결함은 발견하지 못했습니다.**

- **P2 — 새 모듈 추가에 따른 생성 문서 갱신 누락**  
  위치: [src/commands/review-prompts.mjs:18](src/commands/review-prompts.mjs#L18)  
  생성기는 `git ls-files`로 파일 목록을 만듭니다. 현재 새 모듈이 untracked라 `docs:check`가 통과하지만, 이를 stage/commit하면 기존 `docs/harness-overview.html`과 불일치하여 **생성 문서 테스트와 CI의 `docs:check`가 실패합니다.** 메모리에서 해당 파일을 목록에 추가해 출력 불일치를 확인했습니다. 새 모듈을 stage한 뒤 `npm run docs:generate` 결과도 변경에 포함해야 합니다.

**프롬프트를 src로 옮기는 접근 자체는 반박 검토를 견뎠습니다.** 추가로 확인된 런타임·보안·데이터 무결성 결함은 없으며, 가정적인 우려는 발견사항에서 제외했습니다.

읽기 전용 테스트 5개와 템플릿 7종의 전달·치환, 잘못된 조합 5개의 거부를 확인했습니다. 엔진은 모의 실행했으며, 파일을 생성하는 전체 테스트는 실행하지 않았습니다. 파일 변경은 하지 않았습니다.
```

<!-- harness:review kind=codex-adversarial scope=worktree tip=51f04a62dada0cd2c3821ff495e05e6f5029aaed at=2026-09-11T19:19:35.876Z -->

**판별 (2026-09-12, 세션):** 이 리뷰는 `harness-team review codex --framing adversarial` — 프롬프트 파일 없이
src 템플릿 경로로 실행한 첫 dogfood다.

- **P2 — 진짜 결함, 조치함.** 생성기(`scripts/generate-harness-overview.mjs`)는 `git ls-files` 기반이라
  새 모듈 `src/commands/review-prompts.mjs`가 untracked인 동안은 `docs:check`가 green이었다. 재현:
  `git add src/commands/review-prompts.mjs` → `npm run docs:check` → *"docs/harness-overview.html이 소스와
  다릅니다"*. 조치: `npm run docs:generate`로 `docs/harness-overview.html` 재생성, `docs:check` 통과,
  `tests/harness-overview-generation.test.mjs`·`documentation-inventory-pointers.test.mjs` 4/4 통과.
- 접근(프롬프트 정본의 src 이관) 자체에 대한 반박은 없었다. 리뷰어는 엔진을 모의 실행했고 파일 생성
  테스트는 돌리지 않았다고 명시했다 — 그 부분은 세션의 `npm run test`(818 pass / 0 fail)가 덮는다.

## Learnings


## Learnings (2026-09-11)

- followups 항목의 '5종'은 문서 형태를 보지 않은 수였다 — 실제로는 리터럴 블록이 있는 문서 1(adversarial), 표+산문 조합 지시 3(contrarian·simplifier·shipcheck), 같은 kind에 루브릭 3개(testcritic)로 템플릿 7종이었다. 정본 이관 task는 착수 전에 문서마다 '옮길 리터럴이 있는가'를 확인하고 없으면 그 자체를 결정(사용자 질문)으로 올린다 — 이번엔 AskUserQuestion 1회로 닫혔지만 spec 초안 전에 알았어야 했다.

## Learnings (2026-09-11)

- 새 src 파일을 만들면 stage한 뒤 docs:check를 돌린다 — 생성기가 git ls-files 기반이라 untracked 상태에서는 docs:check가 green이고, 커밋 직후 CI에서 터진다(codex-adversarial P2). 이 task에서는 docs:generate로 docs/harness-overview.html을 갱신해 닫았다.
