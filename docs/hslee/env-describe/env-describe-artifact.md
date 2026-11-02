# env-describe — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-02T15:40:50.127Z — codex (harness-team review)

- engine: codex · scope: worktree · base: refs/remotes/origin/main · mergeBase: 936c103f07d36400d8d2e8daeb9aa751f74ba92f · tip: 936c103f07d36400d8d2e8daeb9aa751f74ba92f · exit 0 · 1035 B

```text
전하, **P1/P2 수준의 유의미한 코드 결함은 발견하지 못했습니다.**

- **P3 nit — `docs/hslee/env-describe/env-describe-context.md:6`**: spec·plan에는 D-A/D-B 확정과 구현 완료가 기록됐지만, TCC는 여전히 결정 대기·코드 작성 금지를 주입하여 재개 세션을 잘못 안내합니다.

신규 lockfile·명령 지식은 프리셋 JSON에 있으며, 관리 절의 사용자 편집 보호와 Python pm 변경에 따른 fingerprint 드리프트 안내도 기존 소비자 경로와 일치합니다.

검증: `git diff --check`, `npm run docs:check`, 읽기 전용 선별 테스트 **13개 통과**. 전체 `npm test`는 임시 파일 쓰기가 필요해 실행하지 않았습니다. 추가 fixture 검증도 heredoc 임시 파일 생성이 샌드박스에 차단되어 중단했습니다. 파일은 수정하지 않았으며, 검증을 읽기 전용 범위로 제한했습니다.

**최종 판정: 승인 가능 — TCC 갱신 권장, 전체 테스트 통과는 미확인입니다.**
```

<!-- harness:review kind=codex scope=worktree tip=936c103f07d36400d8d2e8daeb9aa751f74ba92f at=2026-11-02T15:40:50.127Z -->

**판별·조치 (작성 세션, 2026-11-03)**
- P3 TCC 낡음 — **진짜**. `Current atomic step`·`Stop condition`이 결정 전 상태였다. 현재 상태(구현·테스트·리뷰 완료, 커밋·PR 대기)로 갱신했다.
- "전체 `npm test` 미확인" — 리뷰어 샌드박스의 한계다. 작성 세션이 직접 실행했다: 1,282건 중 fail 0, `docs:check` 최신.
  e2e 2건도 실측했다 — 임시 uv 프로젝트 init 렌더(`uv`·`uv sync`·`uv sync --locked`), 0.51.2로 init한 npm 프로젝트에서 새 doctor가
  `AGENTS.md#stack` 낡음을 보고하고 init 재실행 뒤 `npm ci` 렌더·경고 해소.

## Learnings

### 2026-11-03 — 원칙을 예시로 좁혔다 (메인테이너 교정)
- **무슨 일**: 강의 02의 "환경 상태가 자기 서술적이도록"을 받아, 그 문장이 든 예시(lockfile·`.nvmrc`·devcontainer)를 구현 목록으로 읽었다.
  결과는 하네스가 lockfile에서 명령 한 줄을 추론해 AGENTS.md에 **사본으로** 적는 것이었고, 이름은 `## 환경`이었다.
- **놓친 것**: 원칙의 주어는 저장소이고 핵심은 "상태"다 — 처음 온 에이전트가 묻지 않고 Q1 필요한 것·Q2 정확한 의존성·Q3 떠 있어야 할 것·
  Q4 준비 방법·Q5 지금 준비됐는가에 답할 수 있어야 한다. 실측 사고(heliosent, 2026-10-11)도 Q5(준비 안 된 것을 몰랐다)였다.
- **규칙**: 외부 원칙을 구현할 때는 예시를 걷어 낸 원칙 문장을 **질문 목록**으로 먼저 바꾸고, 구현이 어느 질문에 답하는지 spec에 적는다.
  답하는 질문이 일부뿐이면 이름(소제목·CHANGELOG 제목)도 그 범위로 좁힌다.
