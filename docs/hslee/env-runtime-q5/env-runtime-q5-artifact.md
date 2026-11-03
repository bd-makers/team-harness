# env-runtime-q5 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**no-go (2026-11-03).** Q5 런타임 축(선언 대 실제)은 만들지 않는다. 코드·프리셋·`docs/decisions.md` 무변경. 근거 정본은 spec `## 원천 검토` D-1–D-5.

- D-1 반대 근거 셋은 모두 유지된다. 이 머신에서도 node·python 해석 경로가 셋(mise·uv·시스템)이고, pin도 한 문법이 아니며(`cpython@3.12`·`lts/*`),
  값 비교는 boolean뿐인 `holds()`에 없는 새 조건 종류다.
- 파일 읽기로 실제 런타임이 나오는 곳은 Python venv `pyvenv.cfg`뿐이다(uv `version_info`, stdlib `version`). node는 npm·pnpm·bun 산출물에 없고,
  yarn classic `.yarn-integrity`는 설치 당시 ABI(`darwin-arm64-141`)만 남긴다. yarn berry는 미검증.
- 축소 go(uv 한정)도 기각: S0에서는 설치 축이 이미 덮고, 어긋남은 다음 `uv run`·`uv sync --locked`가 스스로 고치며(실측),
  python 게이트는 venv가 아닌 PATH의 `pytest`를 띄워 `pyvenv.cfg`가 게이트 실패를 귀인하지 못한다.
- 다시 열 신호: failure capsule 원인 `environment`가 런타임 버전 불일치로 반복될 때. 출발점은 spec `## 설계 / 접근`.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 리뷰 엔진 미실행 — 코드 변경 없는 판단 task(Done evidence `review: optional`). 쓰기 전 advisor 검토 1회(yarn 공백 지적 → 실측으로 메움).

## Learnings

- **go/no-go는 "만들 수 있나"가 아니라 그 축의 목적으로 판정한다.** D12가 Q5에 준 목적(게이트 실패의 환경·코드 귀인)으로 시나리오를 하나씩
  걸으니, 값이 파일에 있는 경우(Python venv)조차 귀인할 실패가 없었다. 기술 난이도만 보면 "축소 go"로 기울었을 것이다.
- **관측 대상이 스스로 고쳐지면 상태 보고의 가치가 사라진다.** uv는 선언과 다른 venv를 다음 명령에서 재생성한다 — 이런 도구에는
  설치 축 하나로 충분하다. 새 상태 축을 검토할 때 "그 도구가 이미 자가 치유하는가"를 먼저 실측한다.
