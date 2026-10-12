# docs-refresh-v050 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### 조사 요약 (2026-10-12, 읽기 전용 서브에이전트 4개 — 소스 대조, CLI 미실행)
공통으로 낡은 축 다섯 — 문서마다 이 축에 맞춰 고친다.
1. **리뷰 증거**: 0.37.0부터 `harness-team review`가 성공한 실행만 `meta.reviews[]`·artifact 블록에 기록. 새 task의 verify는 `meta.reviews`만 센다(손 마커 무효). 프롬프트 정본 `src/commands/review-prompts.mjs`(0.39.0), `--rubric` 필수(testcritic).
2. **게이트**: R1 원천 검토(interview, 0.47.0) · `gate commit`/`gate format`(`.harness/gates.json`, 0.46.0) · R2 `scenarios`/`scenario check`/`--framing scenario`(0.47.0) · 유일한 강제는 `pr-check`(ship 8단계·pre-push, D11).
3. **종결 순서**: PR 머지 → 기본 브랜치에서 마지막 체크 → `done` → (선택) `/harness-wiki` → `summary --write` → 종결 커밋 하나(0.44.0). 체크박스만 켠 plan은 dirty 면제.
4. **handoff**: task handoff는 커밋 뒤 append되어 다음 커밋에 담김, user handoff는 gitignore 워크트리 로컬(0.44.4). git 훅은 clone으로 오지 않아 `harness-team sync`.
5. **task 상태**: reopen(`reopenedAt` 판정 창, 0.32.0) · `--force` 감사(0.34.0) · done-on-main nudge(0.38.0) · 폴더 없는 done 이름 재사용 거부(0.48.0) · `diagram record --skipped`(0.40.0).

문서별 제약
- 버전 표기: `scripts/docs-version-drift.mjs` — hero tag/footer에 "기준"이 있으면 baseline(검사 안 함). 등록 없이 쓰려면 "기준 v0.50.0" 형태로.
- onboarding: 테스트가 5 Phase·localStorage 키·9번 cmd를 고정 → 항목 26개로 늘며 키 v2.
- kickoff deck: 15–18장·SVG 정확히 2개(테스트).
- playground: 프리셋 정확히 5개·고정 문자열(테스트). Done evidence 키별 허용값이 실제와 다른 결함(생성 시부터) — `tests: required|skip`, `review`/`verify: required|optional`.
- workflow-diagrams: mermaid JS 사용 — overview와 같은 형식이라 소스만 갱신(형식 전환은 범위 밖). lanes의 정의 안 된 `R2` 노드 잔재 결함.
- workflow-schematics: 버전 표기 없음이 아니라 footer에 `V0.23.0 기준`이 있었다(spec 정정).

범위 밖 부수 발견(후속 후보, 이번에 고치지 않음)
- README 커맨드 수 25/19 vs 실제 21, `README.md:71·706`의 루브릭 가이드 설명(0.20.0·5개 프레이밍).
- `commands/harness-sync.md`가 post-commit만 재설치한다고 적음(코드는 pre-push도).
- `commands/harness-task.md:90-94` 다이어그램 건너뛰기 예시가 손으로 닫는 형식(같은 문서 :104는 CLI 정본).
- `docs/harness-overview.html`도 mermaid JS 사용 — "docs는 inline SVG" 관례가 저장소 전체에 일관되지 않음.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
