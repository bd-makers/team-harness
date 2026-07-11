# harness-inttest — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

3형제 테스트 커맨드의 세 번째 형제 `/harness-inttest`를 장착했다.

- 신규: `commands/harness-inttest.md`(SSOT 계약), `skills/harness-inttest/SKILL.md`(Codex 래퍼).
- 수정: `.claude-plugin/plugin.json`(commands 등록), `README.md`(커맨드 표 행),
  `commands/harness-comptest.md`·`commands/harness-unittest.md`(교차 참조 각 1줄),
  `CHANGELOG.md`([Unreleased]).
- 검증: `npm run test:unit` 124 pass / 0 fail, manifest-sync 7/7. 베이스라인도 124 그린이었음.

핵심 설계: managed 의존성(우리 소유 DB·캐시·FS)은 실물(testcontainers)로·목킹 금지,
unmanaged 의존성(서드파티 API)은 HTTP 경계에서만 msw(node) 목킹 — 선언이 아니라
[허용]/[금지] 실행 규칙으로 표현. comptest·inttest가 공유하는 msw는 "관심사"
(클라이언트 렌더 vs 서버 수직 슬라이스)로 소관을 가르는 구별선을 라우팅에 명시.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

- **2026-07-11 · advisor 사전 리뷰** — 착수 전 blind spot 점검. 발견/조치:
  (1) 베이스라인 그린 먼저 확인 → 실행함. (2) manifest-sync의 bin-router 토큰 스캔이
  계약 본문의 `` `harness-team <word>` `` 를 잡으므로 형제와 동일하게 backtick을 공백 전에
  닫는 문구(`` `harness-team` CLI 서브커맨드가 아니다 ``) 사용 → grep 자가점검 0건 확인.
  (3) SKILL description 꺾쇠 금지 → 0건. (4) unittest엔 라우팅 섹션이 없으므로 §2
  managed-dep 불릿에 교차참조 배치. (5) comptest·inttest가 둘 다 msw를 써서 경계가
  흐려지는 지점에 "관심사" 구별선 명시. (6) 형제 계약은 각 1줄만 수정(범위 확장 스톱조건).
  모두 반영 후 CI 그린.

## Learnings

- **manifest-sync bin-router 함정**: 커맨드 계약 본문에 `` `harness-team <서브커맨드>` ``
  형태 토큰을 쓰면 CI가 bin 라우터 case 존재를 강제한다. 에이전트 워크플로우 커맨드
  (CLI 아님)는 반드시 backtick을 공백 앞에서 닫는 형제 문구를 그대로 계승할 것.
- **4-파일 동기화 + Codex 스킬**: 새 커맨드는 commands/·plugin.json·README 표 3곳 +
  `skills/<name>/SKILL.md`(커맨드명 일치·계약 참조·꺾쇠 없는 영어 description) 4곳을
  동시에 맞춰야 manifest-sync 7종이 통과한다.
- **done-guard 순서**: `done`은 artifact 미작성·미커밋 변경·활성화 후 커밋 0개를 막는다.
  artifact 작성 → 커밋 → done 순서가 정석.
