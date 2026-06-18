# doctor-sessionstart-check — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과 (2026-06-18)

doctor가 SessionStart task-gate hook 부재를 감지·경고하도록 추가. enforcement 삼각 완성 —
**apply/migrate는 hook을 추가, doctor는 부재를 감지**.

**구현 (TDD):**
- `session-context.mjs`: `settingsHasSessionGate(settings)` 추출 — "task-gate 보유"의 단일 정의.
  migrate(`migrateSessionStartHook`)의 인라인 판별식을 이걸로 교체(DRY).
- `doctor.mjs`: `checkSessionStartHook(targetDir)` — settings.json에 gate 없으면 경고 문자열,
  아니면 null. `runDoctor`에 **소프트 경고**(`add(...,'warning',...)`)로 배선 — fail/exit code
  미가산. JSON `next_actions`에 `harness-team apply` 추가.
- 설계 근거: 구버전 프로젝트가 정당하게 hook 없이 존재 → hard fail은 그들의 CI를 깸.
  `checkActiveSpecGate`·`detectLegacyStructure`와 동일한 advisory 패턴.

**검증:**
- `npm test` → 95/95 (신규 doctor 3 + migrate 회귀 포함).
- 수동: 이 repo(hook 있음) `doctor` → task-gate 경고 없음 ✓.
- 수동: hook 없는 fixture `doctor` → `⚠️ SessionStart task-gate hook 없음 … apply` ✓.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- **enforcement은 add+detect 양쪽 필요**: 0.9.0/0.9.1은 hook을 "추가"(apply/migrate)했지만
  "감지"가 없으면 구버전 프로젝트가 조용히 누락된 채 남는다. doctor 경고로 루프를 닫음.
- **soft warning vs fail 구분**: 무결성 실패(필수 파일 누락)는 exit 1, "outdated → run X" 권고는
  warning(exit code 불변). 후자를 fail로 만들면 정당한 구버전 CI를 깬다.

