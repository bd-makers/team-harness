# hook-jq-fallback-delivery — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

PR #29 리뷰 후속 6건 전부 처리 (2026-08-21):

- **P1-1 배달**: `refreshClaudeHooks`를 훅 4개로 확장. 게이트는 스펙 제안(마커 부재 &&
  시그니처)보다 강한 **알려진 stock 버전 sha256 바이트 정확 대조**(과거 배포본 10개 열거,
  `tests/fixtures/stock-hooks`에 동일 바이트 보관 + 테이블 드리프트 가드 테스트). 목록 밖 =
  커스터마이즈 = 절대 안 덮음. PR #29 판(v1)도 stock이면 갱신해 P3-1 스코프 수정까지 배달.
- **P1-2 정직성**: doctor가 `jqFallbackGaps`로 설치본 마커를 확인해 분기 — 마커 없는 훅 존재
  시 "차단 유지" 대신 "조용히 무력화(fail-open), migrate 필요"를 말한다.
- **P2-3**: jq 경고에 `jqInstallAction()`(darwin: brew / 기타: apt-get) + gaps 시
  `harness-team migrate` push, `next_actions` Set 중복 제거.
- **P2-2**: extraction-failure 행위 테스트 4개(블록/프리커밋/보호 훅) — **mutation 실측**:
  게이트 `&&`→`;` 적용 시 신규 테스트 1 fail, `|| COMMAND=""` 적용 시 2 fail, 원복 후 green.
- **P2-1**: 폴백 블록 주석을 "이스케이프 일절 미디코드 — \uXXXX 1글자로 우회 가능"으로 일반화
  (4훅 바이트 동일 유지), `force` 우회를 nojq exit 0 / jq exit 2로 핀.
- **P3-1 (수행)**: `json_input_field()` 3줄 추가 — `${2#*\"tool_input\"}` 절단 후 기존
  `json_field` 재사용. 마커 부재 시 원문 그대로라 fail-closed 자동 유지. 복잡도 대비 이득
  충분하다고 판단해 스킵하지 않음. bash 실측으로 이스케이프된 `\"tool_input\"` 언급은
  절단점이 되지 않음을 확인.

검증: `npm run test` 361/365 pass. 실패 3건은 전부 e2e apply-smoke — 이 머신의
`installed_plugins.json`(0.15.2) vs 리포(0.16.1) CLI-drift 경고로 인한 **선재 환경 실패**.
`CLAUDE_PLUGINS_ROOT` 격리 시 doctor success 실측으로 본 작업 무관을 증명. perf 플레이크는
이번 실행에서 미발현.

다이어그램 옵트인: 자율 세션(사용자 부재)이라 미질문 — 생성하지 않음.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

- 2026-08-21: 본 작업 자체가 PR #29 독립 리뷰 6건(사전 검증 완료)의 후속 조치다. 신규 코드에
  대한 외부 리뷰는 PR 리뷰로 진행.

## Learnings

- **"커스터마이즈는 절대 덮지 않는다"는 시그니처 휴리스틱으로 만족 불가** — 문자열 시그니처는
  "우리 훅인지"를 말할 뿐 "수정 안 됐는지"를 말하지 못한다. 배포본이 유한하면 sha256 열거가
  정확한 판별식이고, fixture로 바이트를 함께 보관하면 테이블 드리프트도 테스트로 잡힌다.
- **happy-path 매트릭스는 fail-closed 분기를 증명하지 못한다** — mutation을 실제로 적용해
  0 fail임을 확인하는 것이 커버리지 갭의 가장 정직한 진단이었다. 신규 테스트는 "mutation이
  fail시키는가"를 수용 기준으로 삼았다.
- **e2e가 머신 전역 상태(`~/.claude/plugins`)를 읽으면 로컬에서 위양성** — sandbox가
  `CLAUDE_PLUGINS_ROOT`를 격리해야 한다 (별도 task 후보로 분리).
