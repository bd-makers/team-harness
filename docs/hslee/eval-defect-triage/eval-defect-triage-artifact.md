# eval-defect-triage — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
2026-11-01 — eval 결함 후보 6건 판정. 근거 원문(응답 인용·run id)은 세션 공유 노트 `eval-defect-triage.md`(저장소 밖)에 있다.

| # | 판정 | 근거 요약 | 조치 |
|---|---|---|---|
| 1 simplifier 파일 목록 | 확인·수정 | plan 템플릿(`taskPlanTemplate`)에 파일 목록 절이 없음 · eval 11 WITH 1/3이 "변경 예정 파일 목록이 없어서 파일 단위로는 검토하지 못했습니다" | 1단계가 plan+spec을 읽고 바뀔 파일은 spec 범위 In·plan 단계가 지목한다고 명시 |
| 2 inttest `docker info` | 확인·수정 | 0단계 2번이 무조건 실행 · eval 41 AGENTS.md "Docker·testcontainers는 쓰지 않는다" · CLI(`stack`)는 orm/dbDriver 감지 때만 권하므로 강제 주체는 문서 | testcontainers가 필요할 때만 실행, 인프로세스 DB·팀 전략이 있으면 건너뛰고 요약에 근거 |
| 3 contrarian 대화형 루브릭 | 확인·수정 | eval 10 WITH 3/3 심각도 라벨, 2/3 A1–A4 id, 3/3 각도별 "제안" · W/OUT 0/3 라벨 · "fail 판정"은 최종 run에서 재현 안 됨 | 대화형은 채점 스키마를 쓰지 않고, 대안 설계는 수용 뒤 4번에서 제안 |
| 4 review SKILL 상대 Glob | 기각 | 실패는 조용하지 않았다(응답이 "Glob 권한 거부 … don't ask mode" 고지) · 원인은 샌드박스의 cwd 밖 읽기 거부라 절대경로도 같은 결과 · eval 30 WITH 1.00 | 없음 — 같은 줄이 21개 래퍼 전부에 있어 6번 결정에 묶음 |
| 5 interview 전부 pass인데 질문 | 확인·수정 | spec 버전이 매 run 달랐지만 all-pass 응답 5개 중 3개가 "통과를 막지 않는" 질문을 덧붙임(01-36 #8, 01-57 #2, 01-59 #2) | 비차단 질문도 질문, 구멍이 보이면 pass를 fail로 고쳐 3번에서 묻기, 통과 선언 뒤 질문 금지 |
| 6 "Codex wrapper" 설명 | 보류 — 문구 변경이 라우팅은 같으나 case 14 WITH 품질을 재현성 있게 떨어뜨림(5/12 vs 0/9), 정리성 변경이라 회귀를 감수할 이유 없음 | 22개 중 19개가 "Codex wrapper" · review/adversarial은 이미 "Engine-neutral wrapper" · 측정은 아래 "6번 후속" | 변경 되돌림(패치 사본은 공유 노트 `triage-results/skills.patch`) |

- 바뀐 파일: `commands/harness-{simplifier,inttest,contrarian,interview}.md`, `tests/agent-files.test.mjs`(단언 4개 — HEAD 문서에서 red, 수정 후 green 확인)
- 검증: `npm run test` exit 0 (1268 tests, pass 1267, skip 1, fail 0 · perf 1/1)
- 검증하지 못한 것: eval 재실행(비용) — 문구 변경이 실제 eval 행동을 바꾸는지는 미측정
- 후속: `src/commands/stack.mjs` nextActions가 인프로세스인 `better-sqlite3`에도 `docker info`를 권한다(이번 범위 밖)
- 묻지 않고 내린 결정: 다이어그램 옵트인은 묻지 않음(문서 triage task) · 4번을 기각하고 6번에 묶음

### 6번 후속 — "Codex wrapper" → "Wrapper" (2026-11-01, 측정 후 보류·되돌림)
전하 결정(상위 세션 경유, 원문 "권장안대로 전달")으로 `skills/` 18개 + `scripts/maintainer-skills/harness-release` SKILL.md의
description 앞머리만 바꿨다. `npm run test` exit 0(1268 / pass 1267 / skip 1 / fail 0). 라우팅 eval은 scratchpad detached
체크아웃(409d1df + 패치 + `test/plugin-eval-interview`의 evals/)에서 `--no-publish --judge-model sonnet -j 4`로 돌렸다.

| case | 기준선 WITH / W/OUT / Δ | 새 문구 WITH / W/OUT / Δ | 라우팅 grader |
|---|---|---|---|
| 05-neg-commit-msg | 1.00 / 1.00 / 0 | 1.00 / 1.00 / 0 | 미발화 PPP·PPP 동일 |
| 06-neg-spec-summary | 0.83 / 0.83 / 0 | 1.00 / 1.00 / 0 | 미발화 PPP·PPP 동일 |
| 10-contrarian-natural | 1.00 / 0.91 / +0.09 | 1.00 / 0.91 / +0.09 | 발화 3/3, 형제 미발화 동일 |
| 11-simplifier-natural | 1.00 / 0.90 / +0.10 | 0.95 / 0.86 / +0.10 | 발화 3/3, 형제 미발화 동일 |
| 12-interview-natural-cross | 1.00 / 0.57 / +0.43 | 1.00 / 0.57 / +0.43 | 발화 3/3, 형제 미발화 동일 |
| 13-neg-plan-status | 1.00 / 1.00 / 0 | 1.00 / 1.00 / 0 | 미발화 동일 |
| 14-neg-regex-explain | 1.00 / 1.00 / 0 | **0.83 / 1.00 / −0.17** | 미발화 동일 |

- 라우팅: 발화율·부정 케이스 미발화 모두 기준선과 같다.
- 14 회귀는 통제 비교로 재현됐다 — `explains-regex`(llm) WITH 실패: 새 문구 **5/12**(FFP·PPF·FPP·PPF), 같은 체크아웃에서
  패치를 되돌린 원래 문구 **0/6**(+기준선 0/3), W/OUT은 양쪽 18/18 통과. WITH는 1턴·도구 호출 0이라 다른 변수는 시스템 프롬프트의
  스킬 설명뿐이다. 실패 응답은 자릿수를 실제로 틀린다("`02-123-4567`처럼 생긴", "`010-1234-5678`이 아니라") — grader 오판이 아니다.
  원인 기전은 미검증.
- 11 WITH 0.95는 `no-new-features` 1회 실패 — 이미 엄격하다고 지적된 grader.
- 비용: 계획 범위 $5.22+$0.35+$0.44, 14 추가 확인 5회 $1.90 — 합계 **$7.91**. 결과 JSON·패치 사본: 세션 공유 노트 `triage-results/`.
- `--case '1*'`이 10–14만 잡는 건 15번 이후 케이스가 아직 없어서다 — 케이스가 늘면 필터가 조용히 넓어진다.
- 결과가 기준선과 같지 않아 일단 멈췄고, 전하가 보류를 결정해(상위 세션 경유, 원문 "ok as your suggestion") 19개 파일을 되돌렸다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-01T05:12:48.051Z — codex (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: dcc3ea38a57506f6fdf53fb93506594ac047f415 · tip: 0e7644d1181dc629eb0974c0ab9c06b4dd3ef4dc · exit 0 · 974 B

```text
전하, **P2 1건으로 수정 권고(Request changes)**입니다. P1은 없습니다.

- **P2 — [commands/harness-inttest.md:62](commands/harness-inttest.md#L62)**: “팀이 테스트 DB 전략을 이미 정했으면” 무조건 Docker 확인을 생략하므로, 팀 전략이 **testcontainers 사용**인 경우에도 60행의 필수 확인을 건너뜁니다. 생략 조건을 “해당 테스트에서 Docker가 필요 없는 전략”으로 좁혀야 합니다. 새 pin도 이 과도한 조건을 그대로 고정합니다([tests/agent-files.test.mjs:194](tests/agent-files.test.mjs#L194)).

나머지 세 문서에서는 유의미한 새 모순을 발견하지 못했습니다.

`git status`·`git diff refs/remotes/origin/main`으로 직접 확인했고, 새 pin 테스트만 선택 실행해 **4/4 통과**했습니다. 전체 테스트·eval은 실행하지 않았으며 실제 에이전트 행동 개선은 미검증입니다. 파일 변경은 없습니다.
```

<!-- harness:review kind=codex scope=diff tip=0e7644d1181dc629eb0974c0ab9c06b4dd3ef4dc at=2026-11-01T05:12:48.051Z -->

판별: P2 재현·수용. 문장이 "팀이 테스트 DB 전략을 정했으면" 건너뛰어, 팀 전략이 testcontainers인 경우에도 확인이 빠진다.
조치: 건너뛰는 조건을 "Docker가 필요 없는 테스트 DB 전략"으로 좁히고 "팀 전략이 testcontainers면 건너뛰지 않는다"를 추가, pin 단언도 그 문구로 교체.

## Learnings
- 2026-11-01 — 스킬 설명 블록 문구가 무관한 1턴 답변 품질에도 영향을 줄 수 있다(6번: 앞머리 한 단어 변경으로 case 14 WITH 실패 0/9 → 5/12, 도구 호출 0).
  description 변경은 라우팅뿐 아니라 무관 케이스 품질도 eval로 확인한다.
