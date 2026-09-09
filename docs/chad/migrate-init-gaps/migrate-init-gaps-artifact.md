# migrate-init-gaps — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
### 2026-09-10 — Codex 적대적 리뷰 (read-only, D6)

- Scope: `main...c73a800` · engine: `codex exec --sandbox read-only -m gpt-5.6-sol`
- Verdict: **REJECT** — P1 1건, P2 5건, P3 1건. **7건 전부 재현해 반영했다.**

| # | 심각도 | 발견 | 재현 | 조치 |
|---|---|---|---|---|
| 1 | P1 | 부분 render-state에서 복구된 파일이 백업 없이 부트스트랩 교체 | ✅ 재현 | 부트스트랩 판정을 **파일 단위**로 (`migrate.mjs`) |
| 2 | P2 | 같은 이름 블록이 둘이면 앞 블록 편집이 조용히 유실 | ✅ 재현 | 중복 pair를 marker mismatch로 거부 (`merge.mjs`) |
| 3 | P2 | `classifyHookCommand`가 인자를 실행 대상으로 오인 | ✅ 재현 | 정규식 스캔 → **실행 대상 파싱**으로 재작성 |
| 4 | P2 | unknown command 원문 노출 → secret 유출 | 코드 검토로 확인 | `redactCommand` — 실행 대상만 보고 |
| 5 | P2 | `.harness/backup/`이 gitignore에 없음 | 실제 init으로 확인 | `harnessNeeded`에 추가 |
| 6 | P2 | render-state 저장이 비원자적 → 깨진 JSON = 보호 해제 | 코드 검토로 확인 | tmp + `rename` |
| 7 | P3 | README:758이 새 보존 계약과 모순 | ✅ 재현 | 문장 교체 |

- 리뷰 이전에 **자체 실행 검증**으로 3건을 먼저 잡았다: 따옴표 상대경로 미검사 · `cd ./subdir` 거짓 dangling ·
  **같은 초 두 번 실행 시 백업이 덮여 원본 유실**(안전망이 스스로 복구 대상을 지우고 있었다).
- advisor 리뷰(구현 전)가 잡은 설계 결함 1건: 건너뛴 절의 이전 해시를 이월하지 않으면 **보호가 딱 한 번만**
  걸린다. plan의 테스트가 그 버그를 정답으로 단언하고 있었다. 이월 코드를 실제로 빼고 돌려 e2e 3회차
  단언이 실패하는 것을 확인했다.
- Verification: `npm test` **725 pass / 0 fail**. codex는 read-only 샌드박스가 `mkdtemp`를 EPERM으로 막아
  전체 테스트를 돌리지 못했다고 보고했다 — 그 판정은 이쪽에서 대신했다.

<!-- harness:review kind=codex-adversarial scope=diff tip=c73a800 at=2026-09-10 -->
