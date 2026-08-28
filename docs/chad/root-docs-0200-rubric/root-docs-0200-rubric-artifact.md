# root-docs-0200-rubric — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

2026-08-28 — 0.20.0 기준 루트 문서 정합화 + 루브릭 평가 가이드 신규 + 컨셉 완성도 리뷰.

- **README.md**: D6 언급 0곳 → 설계 스코프 문단·`/harness-review` 절·**Done evidence** 절
  (`tests`·`review`·`verify` 키) 추가. v0.6.2에서 멈춘 "변경 이력"을 CHANGELOG 포인터로 교체.
  문서(HTML) 표에 index·task/fleet/rubric guide 등재.
- **MAINTAINING.md**: 필수 검증 `node --test tests/` → `npm test`(perf `--test-concurrency=1`
  격리 우회 방지), 작업 규칙에 `VERIFY_KIND_SUFFIXES` ↔ harness-review.md 5단계 동기화 표면 추가.
- **docs/prerequisites.md**: §2·§7의 옛 리뷰 커맨드 이름 3곳을 엔진 중립 이름으로 정정.
- **docs/harness-rubric-guide.html** 신규: D6 finding 스키마·검증 루프 SVG·프레이밍 5+1
  (A1–A4·R1–R4·T1–T6·S1–S5·adversarial·interview 선행 채점)·라이프사이클 SVG·엔진 표·
  마커/verify 게이트·함정 6종. 자립형 inline SVG(스크립트 없음). `docs/index.html` Guides 등재.
- **CHANGELOG.md** [Unreleased]에 Added/Changed 기록.
- 검증: 문서 pin 테스트 4파일 **32 pass / 0 fail**, `npm run docs:check` 최신, 브라우저 렌더
  확인(SVG 오버플로 1건 발견 즉시 수정). 다이어그램 옵트인은 비대화 세션이라 기본값
  "아니오"(가이드 자체가 inline SVG 다이어그램 2점 포함).

### 컨셉 완성도 리뷰 요약 (전문은 세션 보고)

- 강점: D2→D4→D5→D6 결정 계보의 일관성(뒤집지 않고 범위 정정·확장), 결정론 게이트("기록
  했는가")와 검증자("품질")의 경계 명문화, kind 열거 단일 정본 + pin 동기화, probe→degrade→
  record 계약의 일관 적용.
- 갭: ① deprecated 리뷰 커맨드 4개 제거가 0.18.0부터 2릴리스째 이월인데 0.20.0 CHANGELOG에
  이월 기록이 없음(0.19.0 Notes의 자기 규칙 위반) — 이 머신 전역 CLAUDE.md는 새 이름으로 전환
  확인, 홈 머신(hsonpro) 확인만 남음. ② 가이드 HTML의 버전 노화를 잡는 가드는 what-changes에만
  있음(0.19.0 docs-refresh 재발 여지). ③ interview 선행 채점만 기계 판독 증거가 없음(의도 여부
  검토 여지). ④ OpenCode 드라이버 경로의 D4 준수는 여전히 규범 의존(알려진 비대칭).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 2026-08-28: 외부 리뷰 미실행 — 문서·HTML만 변경하는 사소한 변경 범위(AGENTS.md 리뷰
  프로토콜의 생략 허용 조건: 포맷·문서). 회귀는 문서 pin 테스트 32건 + docs:check로 확인.

## Learnings

- README처럼 릴리스 테스트가 안 잡는 문서는 "마지막 실질 갱신 릴리스"를 기준으로 diff 범위를
  역산해야 한다 — 이번엔 0.19.0 이후(D6 4단계 전부)가 통째로 누락돼 있었다.
- `node --test <dir>` 안내는 package.json test 스크립트가 격리 실행을 갖는 순간 낡은 지시가
  된다 — 절차 문서의 명령은 스크립트 이름(`npm test`)으로 가리키는 편이 드리프트에 강하다.
