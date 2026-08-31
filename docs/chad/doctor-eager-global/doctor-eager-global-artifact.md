# doctor-eager-global — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`doctor`의 eager 계층 측정에 프로젝트 `.claude/CLAUDE.md`와 전역(user) `CLAUDE.md`를
읽기 전용으로 합산했다. 두 소스 모두 Claude Code 2.1.251 바이너리의 실제 해석 코드로
확인했고(spec 결정 3·6), 외부 리뷰어가 같은 바이너리에서 **독립 재확인**했다.

- `src/commands/doctor.mjs` — `globalClaudeMdPath(env)` 신설, `checkEagerTierSize(targetDir, env)`
  로 서명 확장, 합계 판정 + 파일별 내역 + 해결된 전역 경로 + 처방 분리.
- `tests/doctor.test.mjs` — 단위 12건 + runDoctor 배선 3건.
- 실측: `npm test` → **481 tests / 480 pass / 0 fail / 1 skip**(CI 전용 jq 매트릭스) + perf 통과.
- PR [#68](https://github.com/bd-makers/team-harness/pull/68) — CI `test (24)` **success**.


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-08-31 — 외부 리뷰 (엔진: claude, scope=diff vs origin/main, tip `5124895`)

**엔진 폴백 경로**: probe 체인 codex → gemini → claude. `codex`는 설치돼 있어 1순위로
실행했으나 런타임에 `ERROR: Selected model is at capacity`로 **2회 연속 실패**(리뷰 결과가
아니라 인프라 장애). `gemini`는 이 머신에 **미설치**. 따라서 `claude` 엔진으로 내려갔다 —
컨텍스트 분리는 되지만 vendor 분리는 없다는 한계를 안고 읽은 결과다.

**판정: Approve with nits.** 리뷰어가 주장에 그치지 않고 직접 실측했다 —
`node --test tests/doctor.test.mjs` 55/55 pass, spec이 인용한 1차 출처를 바이너리에서
독립 재확인, 이 머신 합계 21,588 B(예산의 88%)가 spec 표와 일치함을 확인, dedupe 제거 시
새 테스트가 실패하는 판별력까지 확인.

**발견 및 판별** (7건 전부 코드에서 대조함 — 전건 사실 확인, 오탐 없음):

| # | 심각도 | 발견 | 판별 |
|---|---|---|---|
| 1 | P2 | 24 KiB 상수의 근거가 넓어진 측정 집합에 맞춰 재도출되지 않음 (`doctor.mjs:335`, `MAINTAINING.md:59`) | **확인.** 문장 자체는 정확("이 레포의 **프로젝트** 계층 ~16 KB")하나, 예산은 이제 그 **상위집합**에 걸린다 — 부분집합 실측으로 상위집합 예산을 정당화하는 논리 공백이다. 상수를 바꿀지/근거 문장만 넓힐지는 **설계 판단이라 오케스트레이터 몫** |
| 2 | P3 | `## 범위 밖` 목록 미완 — `CLAUDE.local.md`·조상 디렉터리·`.claude/rules/*.md` | **부분 확인.** `CLAUDE.local.md` 제외 사유("gitignore라 팀 공유 아님")가 이 변경의 전제("출처를 구분하지 않으므로 합산")와 결이 다른 건 맞다. 리뷰어도 "판단은 오케스트레이터 몫"이라 명시 |
| 3 | P3 | 테스트 격리가 규약으로만 강제됨 — 일부 doctor 테스트가 실제 `~/.claude/CLAUDE.md`를 읽음 | **확인(잠재 위험).** 현재 깨지지 않으나 경고 **개수**를 단언하는 테스트가 생기면 머신 의존이 된다 |
| 4 | P3 | 임시 디렉터리 누수 2건 — `tests/doctor.test.mjs:368`, `:705`의 인라인 `makeConfigHome()`이 `rm` 안 됨 | **확인.** 두 곳 모두 반환값을 변수로 받지 않아 `finally`에서 정리할 수 없다. 다른 fixture는 전부 정리됨 |
| 5 | P3 | 문서 드리프트 — `harness-task-guide.html:290` 등 3건이 아직 `AGENTS.md`+`CLAUDE.md` 정의 | **확인.** `harness-overview.html`은 **생성물**이라 원본 `harness-overview.template.html`을 고쳐야 재생성 때 되살아나지 않는다 |
| 6 | P3 | 라벨 포맷 — `…/CLAUDE.md(전역)` 구분자 없음 (`doctor.mjs:370`) | **확인(미관).** |
| 7 | P3 | TCC(`-context.md`)가 템플릿 원본 그대로 | **확인.** `context check`는 통과하나 재개 가치가 없다 |

**조치**: 없음 — `harness-review`는 **review-only**이며 발견 수정은 리뷰 보고 후 별도 지시로
진행한다(명령 문서 핵심 제약). P2 1건은 설계 판단이 필요해 오케스트레이터에 보고한다.
나머지 P3는 값싼 정리라 지시가 오면 바로 반영 가능하다.

<!-- harness:review kind=claude scope=diff tip=51248955be98a59654eb074d2c8ff25c1215c32f at=2026-08-31T09:51:19Z -->


## Learnings

- **구현된 가드에 테스트가 없을 수 있다.** dedupe(`seen` Set)는 코드에 있었고 plan에도
  체크돼 있었지만 어떤 테스트도 그 동작을 고정하지 않았다. 가장 가까운 테스트의 **주석**이
  이중 계산을 언급해 "덮여 있다"는 착시를 만들었다 — 검증 대상은 다른 함수였다.
  가드를 테스트로 고정할 때는 **그 가드를 제거하면 실제로 실패하는지** 확인해야 한다.
  fixture 크기를 예산의 절반보다 조금 크게 잡아 두 결과가 갈리게 만든 것이 그 확인이다.
- **외부 리뷰 엔진은 설치 여부와 가용성이 다르다.** `command -v codex`는 성공하는데
  런타임에 capacity 오류로 실패했다. probe 체인은 **존재**만 보므로, 실행 실패 시
  다음 엔진으로 내려가고 그 사실을 기록에 남겨야 리뷰의 vendor 분리 수준이 드러난다.


