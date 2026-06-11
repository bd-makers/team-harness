# ssot-agents-md — Spec

## 목적 / 요구사항

**한 문장 목표:** SSOT master를 `CLAUDE.md`(벤더 고유)에서 `AGENTS.md`(오픈 표준)로 역전하고, symlink를 폐기하여 "공유 코어 실파일 + 얇은 에이전트별 파일(@import)" 구조로 전환한다.

**배경 결정 (2026-06-11 brainstorming, 0.8.0 파킹 문서의 Open Decisions):**
- **D1 = (C) 단일 소스 → 렌더.** 근거: 추후 Codex 하네스 확장 예정 → master가 벤더 고유 파일이면 확장 방향과 역전. AGENTS.md는 Linux Foundation 오픈 표준(Codex·OpenCode·Cursor 네이티브 채택).
- **D2 = (b) Codex는 리뷰어 유지.** drive 주체는 Claude·OpenCode로 한정. 근거: dogfooding에서 리뷰 채택률 0% — 운전 권한보다 리뷰 루프 정착이 먼저. 독립 리뷰어의 가치는 작성자와의 분리에서 나옴.
- **D3 = 연기.** 0.7.0 머지(2026-05-말) 후 3개월 측정 필요 → 2026-08-말 재평가.
- **구현 방식 = 얇은 파일 + @import.** Claude Code(`@path`)와 Gemini CLI(GEMINI.md import) 모두 import 문법 지원 → 코어 복제 없이 중복 0.

**요구사항:**
1. `AGENTS.md`가 공유 코어 실파일(canonical)이 된다 — 작업 프로토콜(task 4파일 규약), role 표, 핵심 원칙, 리뷰 규약 포함.
2. `CLAUDE.md` / `GEMINI.md`는 `@AGENTS.md` import 한 줄 + 자기 전용 섹션만 담는 얇은 파일이 된다.
3. symlink(`AGENTS.md`·`GEMINI.md`·`.cursorrules` → `CLAUDE.md`) 체계를 폐기한다.
4. 기존 사용자가 **한 명령**(`migrate`)으로 무중단 전환된다 (백업 보존, 사용자 텍스트 보존).
5. `doctor`가 신구조 무결성을 강제하고, 레거시 구조를 감지하면 migrate를 안내한다 (P0 정신: 산문이 아니라 도구가 강제).
6. role 표에 D2 결정을 명문화한다 (Codex/Gemini = 리뷰어, OpenCode = drive 주체).

## 설계 / 접근

### 목표 구조 (프로젝트 루트)

| 파일 | 내용 | 소비자 |
|---|---|---|
| `AGENTS.md` | **공유 코어 실파일** — 프로토콜·role 표·원칙·리뷰 규약 | Codex·OpenCode·Cursor (네이티브), Claude·Gemini (import 경유) |
| `CLAUDE.md` | `@AGENTS.md` + Claude 전용(플랜 모드·서브에이전트·advisor·superpowers 연계) | Claude Code |
| `GEMINI.md` | `@AGENTS.md` + 리뷰어 지침 | Gemini CLI |
| `.cursorrules` | **제거** (Cursor의 AGENTS.md 네이티브 지원 검증 후 확정) | — |
| `.cursor/rules/` | 유지 — 기존 rules sync 그대로 | Cursor |

**섹션 분류 기준:** 모든 에이전트에 보편적인 지침 → 코어(AGENTS.md), 특정 CLI 기능에 의존하는 지침 → 그 에이전트의 얇은 파일. 기존 marker(`harness:section`) 체계 유지 — managed 블록만 sync가 갱신, 마커 밖 사용자 텍스트 보존.

### 코드 변경

- `templates/CLAUDE.md.hbs` → 3분할: `AGENTS.md.hbs`(코어) + `CLAUDE.md.hbs`(얇음) + `GEMINI.md.hbs`(얇음)
- `src/harness.mjs`: `AGENT_SYMLINKS` 제거 → `setupAgentFiles`(렌더 생성)로 교체. Windows copy-fallback은 에이전트 파일에 한해 불필요
- `src/commands/doctor.mjs` CHECKS 개정: ① AGENTS.md 실파일 + 코어 마커 존재 ② CLAUDE/GEMINI에 import 라인 존재 ③ 레거시 symlink 감지 → migrate 안내
- `src/commands/migrate.mjs`: 구버전(CLAUDE.md master + symlink 3종) → 신구조 원스텝 전환. 코어 섹션을 AGENTS.md로 이동, 사용자 자유 텍스트는 보수적으로 CLAUDE.md 잔류 + 이동 내역 리포트. 기존 백업 머신너리로 사전 백업
- role 표 개정: 현행 표(Codex/Gemini 리뷰어)가 D2=(b)와 이미 일치 → 결정 기록 + OpenCode를 drive 주체로 명시 (P3 사실상 해소)
- 0.8.0 파킹 문서에 D1/D2/D3 결정 기록

### 에러 처리 / 리스크

- **최대 리스크 — import 지원:** plan 1단계에서 Claude Code `@path` / Gemini CLI GEMINI.md import를 실기 검증. 실패한 에이전트만 풀 렌더(코어 복제)로 폴백 — 구조는 동일 유지
- 렌더 drift: 얇은 파일이라 표면적 작음 + doctor가 import 라인·마커 무결성 체크
- migrate 없이 sync 실행: 레거시 구조 감지 → 변경 없이 migrate 안내 후 종료 (파괴 방지)

### 범위

- **포함:** P1 전체 + P3 결정 기록·role 표 개정 + P4 1단계(Claude 전용 분리 = 컨텍스트 예산 절감) + 파킹 문서 결정 기록
- **제외:** P2(`--json` 계약 — 독립 task), Codex 전용 섹션(확장 시점에), D3(2026-08-말 측정 후)

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **SSOT master**: 에이전트 지침의 정본이 되는 단 하나의 실파일. 현행은 `CLAUDE.md`, 본 task 후에는 `AGENTS.md`.
- **공유 코어**: 어느 에이전트가 읽어도 유효한 지침 집합(프로토콜·role 표·원칙·리뷰 규약). `AGENTS.md` 본문.
- **얇은 파일(thin file)**: import 한 줄 + 에이전트 전용 섹션만 담는 파일. 코어를 복제하지 않는다.
- **레거시 구조**: 0.7.x까지의 `CLAUDE.md` 실파일 + `AGENTS.md`/`GEMINI.md`/`.cursorrules` symlink 3종.
- **marker-merge**: `<!-- harness:section="..." -->` managed 블록만 갱신하고 블록 밖 사용자 텍스트를 보존하는 기존 sync 방식.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? → "SSOT를 AGENTS.md로 역전, symlink 폐기, 얇은 파일 + @import"
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? → import 실기 검증 선행, P2/Codex 섹션/D3 제외, 무중단 migrate 필수
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? → 아래 Acceptance + 테스트 통과
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? → harness.mjs·doctor.mjs·migrate.mjs·templates·README·overview
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Acceptance

- [ ] import 실기 검증 완료 (Claude `@path` / Gemini GEMINI.md import / Cursor·OpenCode AGENTS.md 네이티브) — 결과를 artifact에 기록
- [ ] `init`/`apply`가 신구조(AGENTS.md 코어 + 얇은 CLAUDE/GEMINI)를 생성
- [ ] `doctor`가 신구조를 검증하고 레거시 구조에 migrate를 안내
- [ ] `migrate`가 레거시 → 신구조를 원스텝 전환 (사용자 텍스트 보존, 백업 생성)
- [ ] role 표에 D2 반영 (OpenCode = drive, Codex/Gemini = 리뷰어)
- [ ] 0.8.0 파킹 문서에 D1/D2/D3 결정 기록
- [ ] 전체 테스트 통과 (기존 56개 + 신규: 렌더 산출물·doctor CHECKS·migrate 변환·다중 파일 marker-merge)
- [ ] 플러그인 레포 자신도 신구조로 전환 (자기 dogfooding)

## 참고
- [2026-05-29-0.8.0-improvements.md](../../superpowers/plans/2026-05-29-0.8.0-improvements.md) — P1/P3/P4 원문, Open Decisions
- [AGENTS.md 오픈 표준](https://agents.md/)
- 선행: P0 enforcement (task `chad/p0-enforcement`, 2026-06-11 완료)
