# 선택형 기본 루프

## 현재 모양

- `/harness-loop`는 사이클 S3의 선택형 루프다. plan 확정 뒤 메인 세션이 오케스트레이터가 되어 plan 단계마다 Dev 구현 → QA 판정 → 로컬 커밋을 순차로 돌린다.
  런타임이 아니라 명령 문서가 기존 CLI(`gate commit`·`boundary check`·`scenario check`·`review`)를 엮는다.
- 멈춤 조건은 넷이다: 성공 · spec 공백 · 진전 없음(실패 집합 동일 + diff 무변화, 횟수 상한 없음) · 승인 필요(push·PR·파괴적 변경).
- QA는 오케스트레이터의 기계 검사 + read-only 루브릭([R2](review-gates.md))이다. R3는 P1이 없으면 통과다.

<!-- harness:wiki task=chad/default-loop-skill pr=134 commit=32aedaf author=chad at=2026-10-07 -->
### `/harness-loop` 선택형 기본 루프 도입 (#134)

- **결정**
  - 문제: S3에 기본 루프가 없어 구현 → 검증 → 수정의 순서와 멈출 지점을 매번 스스로 짜야 했고, R2·커밋 게이트가 "언제 돌리는지 모르는" 장치로 남았다.
  - 진입에서 "오케스트레이터 / 개별"을 한 번 묻는다. 개별이면 아무것도 하지 않는다 — 게이트 합류 의무가 없다(D11).
  - Dev는 쓰기 담당 하나(D4), 기본 수단은 서브에이전트, 커밋하지 않는다. 커밋은 QA 통과 뒤 오케스트레이터가 plan 체크와 함께 한다.
  - QA는 두 겹: 오케스트레이터가 기계 검사(exit code)를 돌리고 이름 찍힌 출력을 기록, read-only 검증자는 `review --framing scenario`다.
  - R3 통과 기준: P1 없음 = 통과, P2는 반영 후 재검 한 번까지, 남은 P2는 후속. dogfood 중 R3가 반영마다 새 P2를 내 수렴하지 않아 사람이 정했다.
  - 기각: 별도 Claude QA 서브에이전트(기계 검사를 못 돌리고 자기 승인 편향), 횟수 상한(진전 중인 루프를 끊는다), 새 CLI `harness-team loop`(런타임 기각).
- **바뀐 모듈** — `commands/harness-loop.md` + Codex 래퍼 `skills/harness-loop/SKILL.md`(신규), `.claude-plugin/plugin.json` 등록, README 설계 스코프 문구("서비스형 오케스트레이터는 비채택, 선택형 루프는 제공"), `commands/harness-interview.md` 포인터.
- **학습**
  - 프롬프트 문서의 계약 테스트는 근거 구간 전체를 공백 정규화해 비교해야 수렴한다. 문구 조각 match는 R2 루브릭 5회 중 3회 fail을 냈다.
  - 리뷰 루프에는 따로 종료 기준이 필요하다. "진전 없음"은 같은 실패의 반복만 잡는다.
  - dogfood가 문서 리뷰로는 안 나오던 빈칸을 찾았다 — 검증만 하는 plan 단계 처리, 커밋 훅 실패 시 체크가 남는 상태.
