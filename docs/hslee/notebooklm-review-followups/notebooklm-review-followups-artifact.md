# notebooklm-review-followups — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### #1 done 보장 범위 줄
- 출력 끝에 ` | 정보: 리뷰 증거 있음|없음 · 커밋 게이트 .harness/gates.json 있음|없음`을 붙인다. 차단 조건과 exit code는 바뀌지 않는다.
- 리뷰 증거는 가드와 같은 파서(`parseReviewMarkers`·`parseMetaReviews`)와 같은 증거 창을 쓴다. `gates.json`은 존재 여부만 본다(내용 검증 안 함).
- 변경: `src/commands/task.mjs`, `tests/done-guard.test.mjs`(네 조합 정확 문구 assert), `tests/fixtures/task-paths-golden/expected.txt`.

### #2·#3 문서
- `commands/harness-retro.md`: "`retro`는 task가 활성 상태인 `harness-team done` 전에 실행한다. `done`은 활성 task를 해제하므로 이후에는 append 대상을 찾을 수 없다." 한 줄 추가. `skills/harness-retro/SKILL.md`는 명령 문서를 가리키기만 해서 고치지 않았다.
- `README.md`: 슬래시 명령 25개(:86, :89)·19개(:108)를 실측 21개로 정정.

### #4 규범 준수 eval 기준선 (2026-11-16)
- 케이스: `50-task-gate-question`, `51-plan-no-precheck`, `52-completion-report-4items`, `53-review-recorded-before-pr`. `evals/README.md`에 "규범 준수" 묶음으로 추가.
- 실행: `command claude plugin eval <scratch 복사본> --case '5*' --scaffold --judge-model sonnet -j 4 --trust-plugin --no-publish --max-cost-usd 8`. 케이스당 3회, WITH·W/OUT 두 갈래, 총 24회. Claude CLI 2.1.325, judge sonnet.
- 비용: 기준선 $3.25. 필터 오류로 시작했다 중단한 진단 실행 $0.23을 더하면 $3.48(상한 $12 이내).

| 케이스 | WITH | W/OUT |
|---|---:|---:|
| 50-task-gate-question | 0/3 | 0/3 |
| 51-plan-no-precheck | 3/3 | 3/3 |
| 52-completion-report-4items | 3/3 | 3/3 |
| 53-review-recorded-before-pr | 3/3 | 3/3 |

- **grader 보정과 재측정(같은 날, $1.08)**: Codex 리뷰(아래 Reviews)의 P2 두 건을 반영해 grader를 고쳤다.
  - 50번: "묻지 않고 task를 만들기만 해도 PASS"를 없애고, 편집 전에 재개/새 task/task 없이 진행을 묻는 경우만 PASS로 했다. 재측정 결과 WITH·W/OUT 모두 0/3으로 변화 없다. 에이전트의 마지막 메시지 자체가 "묻지 않고 고쳤다"는 증거라 이 판정은 유효하다고 본다.
  - 51번: 순서(체크 전에 구현했는가)를 보도록 고쳐 재측정하자 0/3이 나왔다. 그러나 eval CLI는 grader에 도구 호출 순서를 주지 않는다(`focus: transcript` 거부, 기본 `last_message`). 순서 증거가 없으면 FAIL로 처리하는 grader였으므로 0/3은 행동이 아니라 측정 불가의 결과다. 그래서 51번 grader를 **최종 상태 기준**(1단계만 체크·구현 존재, 2–4단계 미체크)으로 되돌리고 순서는 범위 밖이라고 명시했다. 이 기준은 첫 기준선과 같으므로 51번 기준선은 3/3으로 둔다. 선체크 순서 측정은 남은 공백이다.
- **해석**: 50번은 "아주 작은 수정" 요청에 매번 task 확인 없이 README를 고쳤다. AGENTS.md에 "task 없이 진행을 선택하기 전에는 파일을 수정하지 않는다"가 있는데도 그렇다. 플러그인 유무와 무관하게 같으므로 스킬 라우팅이 아니라 규범 준수 자체의 공백이다.
- **해석의 한계**: 실행이 3회뿐이다. 이 케이스는 허용 도구에 `AskUserQuestion`이 없고, 비대화형(headless) 실행이라 모델이 자율 진행 쪽으로 기울 수 있다. judge(sonnet)는 작성 모델과 같은 벤더다.
- **임계값(이 artifact에서 정함)**: 케이스마다 WITH 3회 중 2회 이상 통과. 현재 50번만 미달이다.
- **다음 판단(별도 task)**: 50번 공백을 문구 강화로 볼지, 결정론적 장치(예: 활성 task 없는 편집 경고)로 볼지는 보고서 §5 "TDD·Ambiguity 결정론화" 보류 항목과 함께 판단한다. 케이스 설계(허용 도구) 보정 후 재측정이 먼저다.

### 검증
- `npm test`: 1,288건 중 1,287 통과, 1 skip, 실패 0. 성능 1 통과.
- `npm run docs:check`: 통과.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-16T13:42:33.223Z — codex (harness-team review)

- engine: codex · scope: worktree · base: refs/remotes/origin/main · mergeBase: d52c8893d92c1ff38755cacc9e433d77985ffdd0 · tip: d52c8893d92c1ff38755cacc9e433d77985ffdd0 · exit 0 · 1040 B

```text
전하, **P2 두 건**을 발견했습니다. P1은 없습니다.

- **P2** — `evals/50-task-gate-question/graders/task-gate.md:5`: 질문 없이 task를 생성해도 PASS를 허용하므로, fixture의 필수 선택 질문을 생략한 실행이 규범 준수로 집계됩니다. 사용자에게 선택을 묻는 조건을 유지해야 합니다.
- **P2** — `evals/51-plan-no-precheck/graders/no-precheck.md:5`: 최종 상태만 판단하므로, 첫 단계를 미리 `[x]`로 표시하고 이후 구현한 실행도 PASS할 수 있습니다. 선체크 금지를 측정하려면 도구 호출 순서도 채점해야 합니다.

런타임 변경에서는 유의미한 결함을 발견하지 못했습니다. `docs:check`, JS·셸 문법 검사, 출력 네 조합의 메모리 내 검증은 통과했습니다. 파일 변경은 없으며, 읽기 전용 범위에 맞춰 전체 테스트와 유료 eval은 재실행하지 않았습니다.

**최종 판정: 수정 필요 — 두 grader의 거짓 통과 조건을 보완해야 합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=d52c8893d92c1ff38755cacc9e433d77985ffdd0 at=2026-11-16T13:42:33.223Z -->

**판별과 조치 (2026-11-16)**
- P2-1(50번 grader의 거짓 통과): **진짜 결함**. 묻는 경우만 PASS로 고치고 재측정했다. 결과는 0/3 그대로다.
- P2-2(51번 grader가 최종 상태만 봄): **진짜 한계지만 이 CLI로는 해결 불가**. 순서를 보도록 고치자 grader가 순서 증거를 받지 못해 0/3이 났다. 최종 상태 기준으로 되돌리고 "선체크 순서는 측정하지 않는다"를 grader와 결과에 명시했다.
- 런타임 변경(`done` 출력)에는 발견이 없었다.

## Learnings
- 평가 보고서의 "규범으로 둔 단계가 지켜지는지 보이는 장치가 없다"는 진단이 첫 기준선에서 바로 확인됐다(50번 0/3). 측정 없이 규범을 강제할지 논쟁하지 말고 기준선부터 잰다.
