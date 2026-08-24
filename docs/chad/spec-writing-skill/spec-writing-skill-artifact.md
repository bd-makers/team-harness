# spec-writing-skill — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `/harness-spec` 커맨드/스킬 추가 (writer 페르소나) — 활성 task의 `<name>-spec.md` 초안을
  Confluence·Figma·인터뷰 3소스에서 생성. MCP 우선 + 수동 붙여넣기 폴백, `specSources`는
  `.harness/config.json`에 첫 실행 시 lazy 저장(read-modify-write, 기존 키 보존).
- 신규: `commands/harness-spec.md`, `skills/harness-spec/{SKILL.md,agents/openai.yaml}`
- 연결: plugin.json commands 등록, `task.mjs` next-actions(평문+JSON) 안내, CLAUDE.md.hbs §1-A
  (+루트 CLAUDE.md), harness-interview 인계 문구(plan 단계 명시 + Ontology 근거 기록), README·CHANGELOG,
  harness-overview 재생성.
- 검증: `npm run test` 290+1 전부 통과. perf 테스트 1회 실패는 suite 이중 동시 실행으로 인한
  부하성 flake — 격리 재실행 및 클린 전체 실행에서 통과 확인.
- 리서치 근거: OpenSpec(config context 주입·explore 톤·enablers-not-gates),
  GSD Core(`--auto @prd.md` 문서 추출, spec-phase ambiguity 스코어링·edge probe).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-21 — Codex read-only 리뷰 (`codex exec --sandbox read-only`)

발견 10건 → 조치:
1. (높음) 인터뷰 4차원에 Context(brownfield) 누락 → 절차 5에 Context 차원 + greenfield N/A 명시 ✅
2. (높음) 신규 파일 tracked 전환 시 overview byte-비교 테스트 실패 (generator가 `git ls-files` 기반)
   → 신규 파일 `git add` 후 `docs:generate` 재실행 ✅
3. (중간) config 저장 시 `user` 키 유실 위험 → read-modify-write + malformed JSON 중단 규칙 명시,
   소스 선택 후 누락 필드만 lazy 수집으로 순서 재편 ✅
4. (중간) 기존 spec 보호 불완전 → merge(기본)/replace/cancel + 알 수 없는 절(Boundary contracts) 보존 명시 ✅
5. (중간) writer의 게이트 통과 선언이 역할 분리와 모순 → 자가진단은 "초안 자기 평가"로 재정의,
   게이트 판정·Ontology 근거 기록은 validator(§1-A) 몫으로 이관, harness-interview에 plan 단계 인계 명시 ✅
6. (중간) 소스 실패/충돌 규칙 부재 → skip/interview 전환/중단 선택 + `(unresolved)` 양쪽 보존 규칙 추가 ✅
7. (중간) Codex 래퍼가 MCP-first 무효화 → "가용성 확인 → MCP → 폴백"으로 수정 ✅
8. (중간) `task --json` next_actions 미갱신 → JSON 엔벨로프 안내도 /harness-spec으로 갱신 ✅
9. (중간) TCC 공백 → context card 작성 ✅ / 드라이런 범위 지적 → 아래 검증 한계에 기록
10. (낮음) README 커맨드 수 불일치(109행 21개 잔존) → 22개로 통일 ✅

Gemini 리뷰: gemini CLI 미설치로 **미실행**.

### 2026-08-21 — 2차 외부 리뷰 (사용자 전달) — 변경 요청 2건 조치

1. (P1) 전항목 체크 시 validator 우회 — writer가 자기 초안을 전부 체크하면 `/harness-interview` 없이
   plan으로 넘어가는 경로가 계약 서두("게이트 판정은 validator 몫") 및 task 안내 순서와 모순
   → 체크 상태 무관 **항상 `/harness-interview` 인계**로 수정 (자기 채점 차단) ✅
2. (P3) handoff EOF 빈 줄로 `git diff --check` 실패 → 루트 코즈는 `runHandoffAuto`의 append 포맷
   (항목 끝 여분 `\n` — 파일만 고치면 매 커밋 재발). 생성기에서 제거 + 기존 파일 꼬리 정리 ✅

### 2026-08-21 — 3차 Codex 리뷰 (P2) — 진단 인정, 처방은 대안 채택

- 진단: post-commit 훅이 호출하는 전역 `harness-team`은 마켓플레이스 캐시(0.16.1 clean git clone,
  `~/.claude/plugins/marketplaces/harness-aijient-team-marketplace`)로 연결돼 있어, 소스 수정과
  무관하게 머지·릴리스 전까지 구 포맷(EOF 빈 줄)으로 append → **정확함** (재현 확인).
- 처방 "전역 CLI를 이 브랜치로 갱신"은 미채택 — 전역 CLI가 임시 worktree를 가리키게 되어 머지 후
  dangling 위험 + 릴리스 플로우가 모르는 out-of-band 상태. 캐시 직접 패치도 clean clone을 dirty로
  만들어 플러그인 업데이트와 충돌 위험.
- 채택(사용자 확정): **커밋 전 handoff 꼬리 트림 루틴 유지** — 커밋된 트리는 항상 clean, 영구 해결은
  머지+릴리스의 캐시 동기화로. 이 결정으로 훅이 만드는 uncommitted append의 빈 줄은 브랜치 수명
  동안 알려진 상태로 남는다.

### 검증 한계 (정직 보고)
- 대화형 드라이런(실제 인터뷰/MCP fetch 경로)은 미수행 — 계약의 기계 검증 가능한 부분
  (manifest-sync 3중 동기화, 드리프트, next-actions 문자열)만 테스트로 확인.
  실사용 첫 실행 또는 `/harness-sim` 확장에서 검증 필요.

#### 2026-08-24 — sim SC7 커버리지로 갱신 (task `sim-spec-coverage`)

위 항목은 `tests/sim/agentloop.mjs`의 **SC7**로 닫혔다. 무엇이 검증됐고 무엇이 아직 아닌지:

**검증됨** (`node tests/sim/agentloop.mjs sc7`, 2026-08-24T1754 · v0.18.1 · 전 신호 PASS)
- 네임스페이스 슬래시 `/harness-aijient-team:harness-spec` 해석 (pass-rate 3/3)
- spec 초안 생성 + 요구사항 항목의 `(interview)` 출처 태그 (2/2)
- Ambiguity 자가진단 절 생성 (2/2)
- **체크 상태와 무관한 `/harness-interview` 인계** — 2차 리뷰 P1(writer 자기 채점 차단)의 회귀 감시.
  실사용 초안은 계약상 마지막 가중합 항목을 스스로 체크하지 않아 2/5~4/5에 머물므로,
  merge 재실행 전 자가진단을 **5/5로 강제**해 전 항목 체크 분기에서도 인계함을 확인했다.
- `specSources` lazy 저장 + 기존 키(`user`) 보존 = read-modify-write (Codex 리뷰 3번 조치분)
- 기존 spec 존재 시 **merge 분기**가 알 수 없는 절(`## Boundary contracts`)을 보존

**여전히 미검증** (SC7 리포트에 `➖` N/A + 사유로 명시)
- Confluence·Figma **라이브 MCP fetch** — 실 인증·MCP 서버 필요. SC7은 본문 붙여넣기 폴백만 태운다.
- **실제 멀티턴 인터뷰 UX** — `runHeadless`가 단발 `claude -p`라 답변을 프롬프트에 선주입해
  단일 턴으로 접었다. 주고받는 대화 자체는 재현 불가.
- 기존 spec **replace / cancel** 분기 — AskUserQuestion 응답이 필요해 merge(기본값)만 검증.

**미해결 관측** — fresh 초안 4회 중 1회에서 `specSources`가 저장되지 않았다.
커맨드 계약 절차 4("누락된 필드만 AskUserQuestion으로 lazy 수집해 저장한다")가 값이 질문이 아닌
**선주입으로 들어왔을 때**의 저장 여부를 명시하지 않은 것이 원인 후보다.
`sim-spec-coverage` task 범위 밖이라 조치하지 않았고, SC7이 pass-rate로 접어 재발 시 FLAKY로 드러난다.
상세: `docs/chad/sim-spec-coverage/sim-spec-coverage-artifact.md`

### 2026-08-22 — Codex read-only 리뷰 (main 0.17.0 머지 충돌 해소분)

`codex exec --sandbox read-only`, 대상: 머지 커밋 780dbfc. 결과 P1 0 / P2 0 / P3 1.
1. (P3) main에서 압축·제거된 CLAUDE.md `§1-A` 절을 가리키는 잔여 참조 3곳
   (commands/harness-spec.md ×2, CHANGELOG Unreleased 항목) → "Ambiguity 자가진단 게이트"
   참조로 교체 ✅ (0.12.0 릴리스 이력 항목의 1-A 언급은 당시 사실이므로 유지)
- 그 외 확인: CHANGELOG 0.17.0 섹션 main과 byte-for-byte 동일 · README 26개 표기 = 실제
  commands/*.md = manifest 등재 · chad-handoff EOF 정상(LF 1개) · 충돌 마커·중복 텍스트 없음.

## Learnings

- **생성물은 커밋 시점까지 내다봐야 한다**: `generate-harness-overview.mjs`가 `git ls-files` 기반이라
  untracked 상태에서 통과한 `docs:check`가 커밋 후 깨질 수 있었다. 파일 추가 작업은 staged 상태로
  재생성까지 완료해야 안전.
- **페르소나 경계는 종료 조건에서 무너진다**: writer가 "통과 선언"까지 하면 validator가 무의미해진다.
  역할 분리는 시작 절차가 아니라 종료 조건 문구에서 지켜야 한다.
- **후속 후보 (v1 범위 밖)**: GSD식 Edge Coverage probe(8분류) lite, doctor의 specSources 형식 검사,
  GEMINI/Cursor 노출, README 수동 커맨드 카운트 제거(드리프트 방지), observation 테스트에
  next_actions assert 추가.
