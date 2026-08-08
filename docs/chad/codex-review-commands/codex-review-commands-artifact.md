# codex-review-commands — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

Codex read-only 리뷰 2종을 하네스 command+skill로 추가했다 (2026-08-08).

- `commands/harness-codex-review.md` — `/codex:review` 대응. `codex exec --sandbox
  read-only` 직접 실행, `$ARGUMENTS`(`--base <ref>` + focus) 해석, base 부재 시
  `origin/main` → `main` fallback, 발견 검증 의무, artifact `## Reviews` 기록 의무.
- `commands/harness-codex-adversarial-review.md` — `/codex:adversarial-review` 대응.
  절차는 base 커맨드 상속, 리뷰 프롬프트 프레이밍만 적대적으로 교체.
- `skills/harness-codex-{review,adversarial-review}/SKILL.md` — Codex command-equivalent
  래퍼. 세션이 쓰기 불가(read-only 리뷰어 컨텍스트)면 기록 블록을 verbatim 출력해
  드라이빙 세션이 append 하도록 fallback.
- `.claude-plugin/plugin.json` commands[] 21개 등록, README 카운트 19→21 (3곳),
  `docs/harness-overview.html` 재생성.

검증: `npm run test` 209+1 pass / 0 fail. mutation — plugin.json에서 항목 1개 제거 시
manifest-sync가 fail 1로 차단함을 확인 후 복원. `npm run docs:check` 최신 확인.

배경: openai-codex 플러그인의 `/codex:review`류는 `disable-model-invocation: true`
(1.0.6에서도 동일)라 모델 호출 불가 → 하네스가 절차를 직접 소유하기로 함.
이름은 `-review1/2` 대신 서술형 채택 (spec 설계/접근 참조).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-08 — Codex (`codex exec --sandbox read-only`, working tree)

신규 커맨드의 절차를 그대로 dogfooding. P1 0 / P2 3 / P3 1, verdict "not ready until
P2 addressed". 각 발견을 코드로 검증 후 조치:

| 발견 | 판별 | 조치 |
|---|---|---|
| P2 `$ARGUMENTS` 미보간 — 인수가 러너에 도달 불가 | **진짜 결함** (repo 관례는 명시적 `$ARGUMENTS`) | 두 커맨드에 raw 인수 블록 + 해석 규칙 추가 |
| P2 Codex 래퍼 스킬이 read-only 역할인데 artifact 쓰기 요구 | **부분 유효** — 기존 래퍼(retro 등)도 쓰기를 하므로 관례 위반은 아니나 read-only 컨텍스트 미고려는 사실 | 쓰기 불가 시 verbatim 출력 fallback 문장 추가 |
| P2 overview 인벤토리가 `git ls-files` 기반 — untracked 상태로 재생성한 HTML은 커밋 후 stale | **진짜 결함** (`generate-harness-overview.mjs:96` 확인) | 파일 스테이징 후 재생성 순서로 교정, `docs:check` 통과 확인 |
| P3 base `origin/main` 존재 검사 없음 | **유효 nit** | `rev-parse --verify` 실패 시 `main` fallback 명시 |

Gemini 미실행 — `gemini` CLI가 이 머신에 없음.

## Learnings

- 생성 문서(`harness-overview.html`)를 신규 파일과 함께 갱신할 때는 **스테이징 후
  재생성**해야 한다 — 인벤토리가 `git ls-files`(index) 기반이라 untracked 상태의
  재생성본은 커밋 직후 stale이 된다.
- 새 command를 쓸 때 `argument-hint`만 적으면 인수가 전달되지 않는다 — repo 관례대로
  본문에 `$ARGUMENTS`를 명시해야 한다.
