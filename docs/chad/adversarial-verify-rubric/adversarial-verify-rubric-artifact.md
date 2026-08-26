# adversarial-verify-rubric — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

2026-08-26 — 적대적 검증(D6) 도입 1–2단계 완료 (코드 무변경 범위):

- **D6 규범**: `docs/decisions.md` + `templates/docs/decisions.md`(byte-identical, `cp` 미러 후
  `diff` 무출력 확인)에 전문 — finding 스키마(BLOCKER/MAJOR/MINOR)·정직성 규칙·자동 수정 루프
  금지. `AGENTS.md` + `templates/AGENTS.md.hbs` 결정 규범에 요약 1줄 짝수정.
- **kind 접미사 규약**: `commands/harness-review.md` 마커 계약에
  `kind=<engine>-<프레이밍>`(`-adversarial`·`-testcritic`·`-shipcheck`) 명문화.
- **testcritic 루브릭**: 테스트 3형제 6단계에 검증자 인계(옵트인) + T1–T6/C1–C6/I1–I6 표.
- **shipcheck 루브릭**: `commands/harness-ship.md` 7번 정합 검증(S1–S5) 신설, 보고 8번 재번호.
- **회귀 고정**: `tests/agent-files.test.mjs`에 D6 전문/요약 보존 + kind 접미사 소비 표면
  4곳 일치 테스트 2건 추가.
- **검증 증거**: `npm run test:unit` → `tests 421 / pass 420 / fail 0 / skipped 1`,
  `npm run docs:check` → "harness overview 생성 상태가 최신입니다",
  `node --test tests/agent-files.test.mjs`(리뷰 반영 후 재실행) → `pass 26 / fail 0`.
- 범위 제외(후속 task): 3단계(contrarian/simplifier external·interview 채점 선행),
  4단계(done 가드 `verify` evidence 키·kind allowlist src 변경), AO 워커 §8 검증 슬롯.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

2026-08-26 — Codex read-only 외부 리뷰 (`codex exec --sandbox read-only`, working tree scope)
- 요약: P1 0건, P2 1건, 그 외 유의미한 발견 없음. "D6 결정 파일 byte-identical, roles 관리 절
  일치, ship 재번호 정확, pin 테스트 통과" 확인.
- P2 — `commands/harness-review.md` `kind` 정의가 "실제 실행 엔진"으로만 한정돼 바로 아래
  접미사 규약(`codex-testcritic` 등)과 모순 → **판별: 진짜 결함** (엄격 독해 시 접미사 kind가
  계약 위반이 됨). **조치: 수정** — kind를 "엔진 + 프레이밍 식별"로 재정의, 기본 프레이밍은
  엔진 이름 그대로/다른 프레이밍은 접미사 형태가 유효 kind임을 명시. 수정 후
  `node --test tests/agent-files.test.mjs` 26/26 통과.
- 리뷰어의 test:unit 실행은 read-only 샌드박스의 tmpdir EPERM으로 미완 — driver 세션에서
  전체 `npm run test:unit` 통과(420/0)로 대체 확인.

<!-- harness:review kind=codex scope=worktree tip=aa989e86adb2ec25c927c5ce666e231840fbd981 at=2026-08-26T09:16:00Z -->

## Learnings

