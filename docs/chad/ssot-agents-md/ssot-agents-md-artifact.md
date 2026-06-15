# ssot-agents-md — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## Verification (import 실측 — 2026-06-12)

| 도구 | AGENTS.md 소비 | 확정 import 라인 | 상태 / 근거 |
|---|---|---|---|
| **Claude Code** | CLAUDE.md → `@AGENTS.md` (네이티브 미인식) | `@AGENTS.md` | ✅ **확정** — code.claude.com/docs/en/memory. "Claude Code reads CLAUDE.md, not AGENTS.md … create a CLAUDE.md that imports it." 경로=import 파일 기준, 재귀 4-hop, 첫 외부 import 시 승인 다이얼로그 1회. |
| **Gemini CLI** | GEMINI.md → `@AGENTS.md` | `@AGENTS.md` | ⚠ **실측 보류** — 이 환경에 `gemini` 바이너리 미발견(설정/oauth는 `~/.gemini`에 존재하나 PATH·login shell 모두 부재). 문서상 `@file.md` import 지원. **실행 단계 재검증**: temp-dir에 AGENTS.md(sentinel)+GEMINI.md(`@AGENTS.md`) → `gemini -p`로 sentinel echo 확인. 실패 시 GEMINI.md 풀렌더(코어 복제) 폴백 — 파일 구조 불변. |
| **Cursor** | `AGENTS.md` 네이티브 | (import 불필요) | agents.md 오픈 표준 네이티브 → `.cursorrules` 제거 대상. |
| **OpenCode** | `AGENTS.md` 네이티브 | (import 불필요) | 동상. |

**결론:** 레이아웃은 검증 결과와 무관하게 고정(폴백=실패 에이전트만 풀렌더). Claude/Gemini 공통 import 토큰 `@AGENTS.md`를 템플릿에 인코딩. Gemini만 실행 단계 sentinel 재검증 필요.

## 결과

SSOT를 `CLAUDE.md`(master+symlink)에서 `AGENTS.md`(오픈 표준 공유 코어 실파일)로 역전. `CLAUDE.md`/`GEMINI.md`는 `@AGENTS.md` import 얇은 파일. alias symlink 폐기.

**구현 (11 task, 브랜치 `chad/ssot-agents-md`):**
- 템플릿 3분할: `AGENTS.md.hbs`(core: principles/stack/roles/protocol) + thin `CLAUDE.md.hbs`(workflow) + `GEMINI.md.hbs`(reviewer). roles 표에 D2(OpenCode=drive, Codex/Gemini=리뷰어) 명문화.
- `harness.mjs`: `planChanges` 3파일 마커-머지 렌더, `setupSymlinks`/`AGENT_SYMLINKS` 제거.
- `doctor.mjs`: `realFile`+`contains` CHECKS + `detectLegacyStructure`(레거시→migrate 안내).
- `migrate.mjs`: `migrateToAgentsMd` — 마커 기반(extractSections) 레거시→신구조 원스텝, `CLAUDE.md.bak` 백업, 사용자 텍스트 보존, 멱등.
- backup/symlink 시스템: AGENTS.md/GEMINI.md를 MOVE_ITEMS로 재분류(실파일), `.cursorrules` 폐기 — backup 손상 경로 차단.
- 문서: README 신구조 반영, overview HTML 0.8.0 배너, 0.8.0 파킹 문서 D1/D2/D3 기록.
- dogfooding: 플러그인 레포 self-apply(fresh) → AGENTS.md core + thin 생성, doctor ✓.

**테스트:** baseline 55 → **71 pass, 0 fail** (신규 16: agent-files 10, doctor +3, migrate-agents 3).

### 2026-06-15 추가 (done 이후, 재개 세션)
- **overview/simulation HTML 전면 0.8 리프레시** — `0be1730`이 "follow-up"으로 미룬 다이어그램 전체 갱신 완료. overview: subagents·core(SSOT) mermaid를 `@import`/네이티브 모델로 재작성, architecture(`setupSymlinks`→3파일 렌더), template 표(섹션→파일 매핑), agent config 표(D2 drive/review), init 시퀀스, 배너·footer. simulation: scaffold 스텝·세션재개 프로토콜 참조·버전. 라이브 갱신 + `-0.8.0.html` 스냅샷 2종 생성.
- **데드코드 제거** — `src/symlink.mjs`(`ensureSymlink`)는 Task 3에서 `setupSymlinks` 제거로 importer 0이 됨 → 파일·overview 행 삭제. (`upgrade.mjs`는 `commands/symlink.mjs`의 `runSymlink`를 import — 무관.)
- **미결:** Gemini `@import` sentinel 실측은 이 환경에 `gemini` 바이너리 부재로 여전히 보류 — 폴백 설계상 구조 불변, gemini 사용 환경에서 1회 확인 권장.

## Reviews

### 2026-06-15 — feature-dev:code-reviewer (브랜치 diff 전수)

- **🔴 CRITICAL (confidence 95) — `apply`/`init`가 레거시 alias symlink를 통해 CLAUDE.md를 덮어씀.** 레거시(AGENTS.md/GEMINI.md → CLAUDE.md symlink)에서 `apply` 시 `fs.writeFile`이 symlink를 따라가 사용자 CLAUDE.md를 무경고 손실. migrate는 unlink 후 쓰지만 apply엔 가드 없음.
  - **조치(수정 완료):** `planChanges`가 symlink 에이전트 파일을 건너뛰고 `legacyAgentFiles`로 보고(읽기/쓰기 둘 다 차단), `applyChanges`가 쓰기 전 symlink를 unlink(방어), `runInit`이 "migrate 실행" 경고 출력. 회귀 테스트 2개 추가(레거시 apply가 CLAUDE.md 보존, applyChanges가 symlink 타깃 비오염). commit `<fix>`.
- **🟡 Important (confidence 82) — doctor의 json 분기가 symlink 인지 못 함.** backup-relocation 모드(전 항목 backup으로 symlink)와 doctor의 realFile 요구 간 **기존 긴장**. 이 task가 새로 깨뜨린 게 아니며(구 doctor도 backup 후 AGENTS.md symlink를 flag) backup 모드 인지는 별개 기능 범위 → **범위 외로 보류**(후속).
- **✅ Verified clean:** removed-export 잔존 참조 0, backup.mjs 손상 경로 차단 확인, `@AGENTS.md` 머지 생존 확인, migrate 멱등·user-region 보존 확인, 섹션 분할 중복 0, 셸 스크립트 갱신 확인.

## Learnings

- **symlink write-through는 조용한 데이터 손실 경로다.** 실파일↔symlink 전환 작업에서 `fs.writeFile`은 symlink를 따라가므로, 쓰기 전 반드시 `lstat`→`unlink` 가드. 한 곳(migrate)에서 처리했다고 모든 경로(apply)가 안전한 게 아니다 — 동일 불변식을 공유 함수(applyChanges)에 둬야 한다.
- **adversarial 리뷰가 self-test 통과를 보완한다.** 71개 테스트가 green이어도 레거시 apply 경로는 테스트가 없어 손실 버그가 숨어 있었다. 리뷰어 dispatch로 발견 → 회귀 테스트로 고정.
