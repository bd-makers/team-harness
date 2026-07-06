# plugin-hardening — Spec

## 목적 / 요구사항

v0.9.5 종합 분석(`docs/chad/harness-plugin-analysis-0.9.5.html`, 2026-07-02)에서 식별된
보완 항목을 해소해 플러그인을 팀/조직 단위 도입 가능한 수준으로 hardening 한다.

분석 리포트 §6(리스크)·§10(미확인)에서 도출된 요구사항:

1. **CI 부재** — `.github/workflows/` 없음. PR/push 시 `node --test` 자동 실행 필요.
2. **pnpm 하드코딩** — `templates/.claude/hooks/pre-commit-check.sh`가 pnpm 고정.
   npm/yarn/pnpm을 감지(detect-stack 연동 또는 lockfile 기반)해 동작해야 함.
3. **LICENSE 파일 부재** — package.json에 MIT 선언만 존재. LICENSE 파일 추가.
4. **symlink 백업 아키텍처 가드 부족** — 백업 디렉토리 삭제/이동(특히 iCloud eviction) 시
   설정 일괄 파손. doctor의 깨진 symlink/백업 부재 감지 강화 + init 시 클라우드 동기화 경로 경고.
5. **커맨드 4-파일 수동 동기화** — commands/ ↔ plugin.json ↔ bin ↔ README 불일치를
   테스트 또는 doctor로 자동 검증.
6. **release race condition** — `~/.claude/plugins/installed_plugins.json` 수정 시
   Claude Code 실행 중 여부 감지/경고 (현재 MAINTAINING.md 문서 경고뿐).
7. **미확인 항목 검증** — templates/.cursor 빈 디렉토리 의도 확인,
   `~/.claude-sim-oauth-token` 권한 600 강제 여부, bd-makers/team-harness 원격 실존 여부.

## 설계 / 접근

- 항목별 독립 커밋 — 우선순위: 1(CI) > 2(pnpm) > 5(동기화 검증) > 3(LICENSE) > 4 > 6 > 7.
- 1·3·5는 순수 추가 작업이라 회귀 위험 없음. 2·4·6은 기존 동작 변경이므로 e2e 스택 매트릭스로 검증.
- 7은 코드 변경 전 조사 단계 — 결과에 따라 항목 추가/폐기.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **hardening**: 기능 추가가 아니라 기존 기능의 실패 모드(훅 미동작, 설정 파손, 매니페스트 불일치)를 좁히는 작업.
- **4-파일 동기화**: 커맨드 1개당 commands/<name>.md · bin 라우팅 · plugin.json 목록 · README 표가 일치해야 하는 릴리즈 불변식.
- **게이트 통과 근거**: 요구사항 7개가 분석 리포트의 파일:라인 근거에서 직접 도출되어 Goal/Constraint/Success가 모두 구체적임 (2026-07-02).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- 분석 리포트: `docs/chad/harness-plugin-analysis-0.9.5.html` (§6 리스크, §8 검증 체크리스트, §10 미확인)
- 릴리즈 절차: `MAINTAINING.md`
- 훅 템플릿: `templates/.claude/hooks/pre-commit-check.sh`
- doctor 체크 목록: `src/commands/doctor.mjs` (CHECKS 배열)
