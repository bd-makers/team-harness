# doctor-decision-headings — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 출처: 2026-09-05 PDF 6층 플레이북 비교 분석 권고 ⑤(`.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.md`).
- `src/commands/doctor.mjs`: `DECISION_HEADINGS`에 `## D6`·`## D7` 추가. 부재 메시지의 절 ID 나열을 상수에서 파생한
  `DECISION_IDS`로 대체해 리터럴 재드리프트를 막음.
- `tests/doctor.test.mjs`: (신규) D2/D4/D5만 있는 구버전 로그 → `## D6, ## D7 절 없음` 경고; (신규) 템플릿 D-log의
  `## D<n>` 헤딩 집합 == `DECISION_HEADINGS` 드리프트 가드; (갱신) 부분 누락 나열 D6·D7까지, 부재 메시지 ID 파생 단언.
- `templates/docs/decisions.md`·`docs/decisions.md`: 상류 출처 목록에 D7 추가(두 파일 동일성 유지).
- `CHANGELOG.md` [Unreleased] Fixed 항목.
- 검증: TDD RED(단언 3건 의도한 사유로 실패) → GREEN. 드리프트 가드는 `## D7`을 상수에서 임시 제거해 실패를 확인한 뒤
  복원. `npm test` 전체 통과(unit+e2e 526, perf 1), `npm run docs:check` 최신.
- ship(2026-09-05): 다이어그램 건너뜀(task 생성 시 옵트아웃). 정합 검증(shipcheck) 미실행 — 상수 1줄·테스트·문서
  규모라 codex 일반 리뷰(위 Reviews)로 대체. 커밋 dc48bf3(fix)·949ef51(task docs), base origin/main.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-05 codex — scope: worktree (dirty working tree)

- 실행: `codex exec --sandbox read-only -m gpt-5.6-sol "<공용 프롬프트 + focus>" < /dev/null` 포그라운드, 90,195 tokens.
  설정 모델 `gpt-6-astra`는 codex-cli 0.147.0이 400으로 거부("requires a newer version of Codex")해 첫 실행이 무산 →
  `~/.codex/models_cache.json`의 하위 모델 `gpt-5.6-sol`로 재실행(엔진은 codex 유지, 폴백 체인 미사용).
- 결과: P1 없음 · P2 3건 · P3 1건 · verdict "수정 요청".
- 판별·조치:
  - P2 `doctor.mjs` — fenced code block 안의 `## D6` 라인도 절로 인정. **사실**이나 도입 커밋(f0c428f)부터의 설계이고
    라인 앵커·`\b` 이상은 이 task 범위 밖·저확률 → **기각**(후속 후보로만 기록).
  - P2 `doctor.test.mjs` 템플릿 계약 테스트가 ⊆만 검증해 D8 추가 시 재드리프트 가능. **진짜 결함**(이번 D6·D7 드리프트가
    그 틈으로 생김) → **반영**: 집합 동등 가드 테스트 추가.
  - P2 `decisions.md:7` 상류 목록이 D6에서 끝나 D7이 프로젝트 고유 결정처럼 읽힘. **사실** → **반영**: template·repo 동시 수정.
  - P3 `docs/harness-workflow-diagrams.html` 3·154행이 D6에서 멈추고 252행은 D7 설명. **사실**이나 별도 워크트리
    (`team-harness-workflow-diagrams-26194d`)의 lavish 세션이 편집 중인 문서 → **범위 밖**, 그 작업에 위임.
- 리뷰어가 못 돌린 것: `checkDecisionLog` 임시 디렉터리 테스트(read-only 샌드박스 `mkdtemp EPERM`) → 작성 세션의 `npm test`로 대체.

<!-- harness:review kind=codex scope=worktree tip=2e9f82016227e920ea7895a132077baa08affaaf at=2026-09-05T04:52:45Z -->

## Learnings

- "검사 목록 ⊆ 정본" 형태의 계약 테스트는 정본이 자라는 드리프트를 못 잡는다 — 집합 동등으로 고정한다.
- CHANGELOG 헤더 주석에 `## [Unreleased]` 문구가 있어 단순 문자열 첫 매치가 주석에 걸린다 — 줄 시작 앵커로 실제 헤딩을 찾는다.
- codex 설정 모델이 CLI 버전보다 앞서면 `exec`가 400으로 죽는다 — `-m`으로 캐시의 하위 모델을 지정해 재시도하고 artifact에 명기한다.
