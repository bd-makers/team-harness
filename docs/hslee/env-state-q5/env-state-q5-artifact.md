# env-state-q5 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `harness-team stack` envelope에 최상위 `installTrace`가 생겼다 — 3값 계약: 판정 규칙 없음 `null`, 아니면 `{ state: 'present' | 'absent', lockfile, trace }`.
  요약 축 `설치 흔적: 있음|없음 (<lockfile> → <trace>)`, `absent`면 `status: warning`과 bootstrap 명령 `next_actions`. 기존 필드 불변.
- 규칙은 프리셋 `env.installTrace.<pm>`(node: npm·pnpm·yarn berry/classic·bun, python: uv)에만 있고, 평가기 `detectInstallTrace()`는
  `firstHolding()`·`holds()`를 재사용한다 — 새 조건 종류 없음. 영향 소스 4개.
- 판정하지 않는 것: lockfile 없음(이 저장소)·의존성 0개 npm lockfile·poetry·`bun.lockb`·npm lockfileVersion 1·workspace별, 런타임 버전(spec D-1).
- 검증: `npm test` 1,287건 fail 0, `docs:check` 최신, scratchpad e2e 8건(실제 npm·pnpm·yarn 1·yarn 4·uv 프로젝트, 흔적 있음·지움·0개 의존성·이 저장소).
- 실측하지 않은 것: pnpm·yarn·bun의 **의존성이 있는** 설치 흔적(0개일 때의 동작과 공식 동작에서 추론), berry `nodeLinker: node-modules`,
  `UV_PROJECT_ENVIRONMENT` 재지정(디스크에서 보이지 않아 `absent`로 나온다 — spec D-4에 한계로 적음).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
