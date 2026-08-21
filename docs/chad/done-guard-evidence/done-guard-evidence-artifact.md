# done-guard-evidence — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `harness-team done` 가드에 증거 기반 체크 2종 추가 (`src/commands/task.mjs`):
  - **테스트 작성 체크** (기본 ON) — `git log --since=<switchedAt> --name-only`로 소스 변경이
    있는데 테스트 파일 변경이 없으면 차단. `classifyChangedPaths`가 확장자 화이트리스트 +
    테스트 경로/파일명 패턴으로 분류 (테스트 판정 우선).
  - **리뷰 마커 체크** (spec `review: required` opt-in) — artifact 전체에서
    `<!-- harness:review kind=... at=... -->` 마커를 스캔, `at >= switchedAt`인 마커가 없으면 차단.
- spec `## Done evidence` JSON 선언 파싱 (`parseDoneEvidenceDeclaration`) — 미선언은
  기본값(`tests: required`, `review: optional`), 깨진 선언은 invalid로 **차단 사유** 처리
  (조용한 폴백 금지, `boundary check`의 `not-configured` 전례).
- 마커 계약을 0.17 재편된 `commands/harness-review.md` 5단계와
  `commands/harness-adversarial-review.md`(`kind=<engine>-adversarial`)에 배선.
  spec·artifact 템플릿에 선언 자리와 마커 안내 추가.
- 테스트: `tests/done-guard.test.mjs`에 신규 16케이스 추가 — 순수 함수 8 + 가드 통합 8
  (차단/통과/미발동/skip 선언/stale 마커/invalid 선언/미종결 fence/미지 키/quoted 경로/비-ISO at).
  전체 스위트 388 tests, 387 pass, 1 skip (리뷰 조치 후).
- 진행 중 조치: 브랜치를 main 0.18.0으로 fast-forward 후 WIP 재적용. 파생 원장 2종은
  건드리지 않고 `done-guard-evidence-meta.json` 생성으로 대체 (D5 프로토콜).


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-22 — codex (gpt-5.6-sol, read-only, working tree 전체)

- **요약**: P1 1건 / P2 4건 / P3 1건, verdict REJECT. 6건 전부 재현·검증 후 전건 조치.
- **P1** staged index에 백틱 미이스케이프 버전 잔존(3-way apply 잔재) → commit 시 SyntaxError.
  검증: `git show :src/commands/task.mjs | node --check` 실패 재현. 조치: `git reset`으로 index 정규화.
- **P2** 미종결 ```json fence가 invalid가 아닌 not-configured로 fail-open.
  조치: `DONE_EVIDENCE_OPEN_RE` 추가 — 열린 fence 흔적이 있으면 invalid.
- **P2** 미지 키(`rewiew` 오타 등) 미거부 → 선언 조용히 무력화. 조치: strict key 검증 추가.
- **P2** `git log`의 C-quoted 경로(non-ASCII)로 확장자 오분류 → 테스트 가드 우회.
  검증: `"docs/\355…\.mjs"` → `mjs"` 재현. 조치: `core.quotepath=false` + classify에서 quote 벗김.
- **P2** `Date.parse('9999')`가 유효 미래 시각 → 비계약 마커가 영구 신선한 증거화.
  조치: ISO8601 형태 선검사 후 파싱.
- **P3** artifact/TCC의 테스트 카운트 불일치. 조치: 실측값으로 정정.
- 조치 전건에 회귀 테스트 추가(순수 함수 4 assertion/3 케이스), 전체 스위트 388 tests 387 pass 1 skip.

<!-- harness:review kind=codex scope=worktree tip=a89d52212e4d76c6f6711c9b576d7d44b7e145ed at=2026-08-21T17:35:38Z -->


## Learnings

- **템플릿 리터럴 안의 마크다운 인라인 코드는 백틱을 `\``로 이스케이프해야 한다** (F-001).
  미이스케이프 백틱이 문자열을 조기 종료시켜 CLI 전체가 SyntaxError로 기동 불가였고,
  훅이 `2>/dev/null || true` 패턴이라 무음으로 실패했다. 템플릿 문자열 편집 직후
  `node --check`를 습관화할 것.
- **`git apply --3way`는 index를 더럽힌다** — 재적용 직후 `git reset`으로 정규화하지 않으면
  워킹트리는 고쳤는데 staged에는 깨진 버전이 남는 P1급 함정이 된다 (codex 리뷰가 적발).
- **오래된 브랜치의 WIP는 작업 재개 전에 베이스부터 최신화한다** — 이번엔 0.15.2 베이스 위
  WIP를 0.18.0으로 ff + 3-way 재적용. 리뷰 커맨드 재편(0.17)·원장 파생화(D5) 같은
  프로토콜 변화가 plan의 대상 파일 자체를 바꿔놓았었다.
- **fail-open은 선언 기반 가드의 최대 적** — 미종결 fence·오타 키·관대한 Date.parse 모두
  "선언했다고 믿지만 실제론 꺼진" 상태를 만든다. 선언 흔적이 있으면 invalid로 막는 쪽이 옳다.

