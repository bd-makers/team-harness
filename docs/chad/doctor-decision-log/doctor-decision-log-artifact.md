# doctor-decision-log — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### 2026-08-21 — doctor decision-log 검사 추가 (instruction-structure Codex 리뷰 P2-1 완화안)

- `src/commands/doctor.mjs`: `checkDecisionLog(targetDir)` 추가 — `docs/decisions.md` 존재 +
  `## D2`/`## D4`/`## D5` 제목(라인 앵커 `^## Dn\b`, `## D20`·본문 언급 오탐 방지) 검사.
  warn 수준(⚠️, fail 아님). 부재 → `harness-team apply` 유도(스캐폴드가 해결),
  부분누락 → `templates/docs/decisions.md`에서 해당 절 수동 병합 안내(skipExisting이라 apply 불가).
  JSON next_actions는 부재 케이스만 `harness-team apply` 추가 (`decisionLogNeedsScaffold`).
- `templates/docs/decisions.md` 신규 — PR #30(instruction-structure) 브랜치와 동일 바이트.
  e2e `apply-smoke`의 "apply 직후 doctor 완전 green" 불변식 유지를 위해 동반 필수
  (없으면 apply 후에도 경고 → status warning → e2e 깨짐). 양측 추가 동일 내용이라 #30과 병합 클린.
- `docs/harness-overview.html` 재생성 (`npm run docs:generate`) — tracked 템플릿 추가로 파일 트리 변경.
  #30도 같은 파일을 재생성하므로 나중에 머지되는 쪽에서 충돌 시 재생성으로 해소.
- `tests/doctor.test.mjs`: 존재(실제 템플릿 원본 — 템플릿↔검사 계약 핀)/부재/부분누락 단위 3케이스
  + runDoctor JSON 배선 통합 1케이스. `npm run test` 전체 green (313 + perf 1, fail 0).
- 다이어그램 옵트인(§1-B): 자율(비대화형) 세션이라 AskUserQuestion 미실시 — "묻고 아니오"가 아닌
  **미질문** 상태 (spec.md 참고 절에도 명시).


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-21 — Codex read-only 리뷰 (working tree, 커밋 전)

- 실행: `codex exec --sandbox read-only`. **Gemini 리뷰 미실행 — gemini CLI 미설치.**
- verdict: P2 수정 후 병합 권장 (P1 없음, P2 1건, P3 없음). 스캐폴드 경로·next_actions 분기·
  템플릿↔검사 계약·overview 동기화는 Codex도 직접 실행으로 확인 (`docs:check` 포함).
- 발견·판별 (Claude 재검증 후):
  - **P2** `checkDecisionLog`에서 `docs/decisions.md`가 디렉터리이거나 읽기 불가면 `readFile` 예외가
    전파되어 doctor가 envelope 없이 죽음 → **유효(확인)**: 호출부(runDoctor)에 try/catch 없음.
- 조치 (자율 세션이라 검증 즉시 반영): `readFile`을 try/catch로 감싸 ENOENT → 기존 "없음" 경고,
  그 외(EISDIR/EACCES 등) → "읽기 실패" 경고로 처리. 디렉터리 케이스 회귀 테스트 추가.
  재실행 결과 314 + perf 1 전체 green.


## Learnings

