# doctor-decision-log — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: doctor에 docs/decisions.md 존재 + `## D2`/`## D4`/`## D5` 검사(warn) 추가 — P2-1 완화안
- Current atomic step: 구현·테스트·리뷰·커밋 완료 (f137448) — 남은 것: 사용자 확인 후 `harness-team done`
- Stop / human-decision condition: done 처리·push/PR 여부는 사용자 결정 (자율 세션이라 미실행)

## Constraints and settled decisions
- warn 수준(실패 아님): 부재 → apply 유도(스캐폴드가 해결), 부분누락 → 템플릿 수동 병합 안내(skipExisting)
- 제목 매칭은 `^## D2\b` (m) — `## D20`·본문 중간 언급 오탐 방지
- templates/docs/decisions.md는 PR #30 브랜치와 동일 바이트로 동반 (e2e apply-smoke의
  "apply 직후 doctor 완전 green" 불변식 유지; 양측 추가 동일 내용 → 병합 클린)
- tracked 템플릿 추가 → docs/harness-overview.html 재생성 필수 (`npm run docs:generate`)
- pluginDev 게이트 없음 — 소스 레포도 #30 이후 자체 decisions.md를 가짐

## JIT retrieval map
- Identifiers / symbols: `checkDecisionLog`, `DECISION_HEADINGS`, `DECISION_LOG_PATH`, `decisionLogNeedsScaffold`
- Narrow globs: `src/commands/doctor.mjs`, `tests/doctor.test.mjs`, `templates/docs/decisions.md`
- Read next: artifact ## Reviews (리뷰 기록 후)
- Verification command: `npm run test` (313 + perf 1 green 확인됨)

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 커밋 전: 리뷰 발견 검증·artifact 기록 완료 여부 확인
- 커밋 메시지: `feat(doctor): ...` 한글 컨벤션 (hs-commit)
- gemini CLI 미설치 → Gemini 리뷰 미실행 사실을 artifact에 명기
