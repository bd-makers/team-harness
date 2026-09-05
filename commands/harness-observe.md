---
description: 관측 로그(.harness/observability) 스코어카드와 트립와이어 판정 — read-only, 발화 시 exit 1
phase: Validation
argument-hint: '[--days <1..14>] [--json]'
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" observe $ARGUMENTS
```

observe-tools 훅이 쓴 도구 관측 JSONL(`.harness/observability/v1/<day>/*.jsonl`)을 읽어 **일별·task별·도구 분류별
스코어카드**와 **트립와이어 2종**을 보고한다. text 표는 started·finished·failed·denied·rate·p95·intr 열이고,
`--json`의 `scorecard`에 succeeded·p50·바이트·usage 토큰까지 전체 필드가 있다.
로그를 수정·삭제하지 않는다. 도구 이름·세션 id는 HMAC 참조라 복원하지 않고, task 참조만 로컬 `docs/<user>/<task>/`로 되돌린다.

- `failure-rate-2x` — 오늘(UTC) 완료 ≥ 20건·실패+거부 ≥ 5건이고 실패·거부율이 직전 날들 평균의 2배 이상.
- `repeat-failure-3x` — 한 세션에서 같은 도구가 3회 이상 실패.

발화하면 exit 1이다 — 결과를 사용자에게 보고하고, `next_actions`의 세션 로그 경로를 열어 실패한 호출을 추적한다.
로그가 없으면(`not-installed`) `harness-team init`으로 훅을 설치하라고 안내한다. `--json`은 `harness/observation/v1` envelope다.
창은 기본 7일, `--days 1..14`(훅 보존 기간).
