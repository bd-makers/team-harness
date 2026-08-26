# testpath-extension-gate — Plan

## 목표

`isTestPath()`에 코드 확장자 게이트를 넣어 문서 파일 오분류 2건(basename `-spec.md` ·
디렉터리 `docs/**/specs/*.md`)을 닫고, `done`의 테스트 증거 가드를 실제로 동작하게 만든다.

## 단계
- [x] 실패 재현 — 가드 수준 회귀 그물(R2): 소스 + 자기 `<name>-spec.md`만 커밋한 task가
      **차단되어야 한다**는 테스트를 먼저 쓰고, 수정 전에 실패하는 것을 확인한다
      (fixture는 반드시 `firstActivatedAt`을 갖는다 — 없으면 공허하게 통과한다)
- [x] 실패 재현 — 순수 함수: `docs/chad/demo/demo-spec.md` · `docs/superpowers/specs/foo.md`가
      `{ source: false, test: false }` 여야 한다는 테스트 추가, 실패 확인
- [x] 구현 — `isTestPath()` 맨 앞에 `SOURCE_EXTENSIONS` 확장자 게이트 추가,
      `SOURCE_EXTENSIONS` 주석을 "판정 양쪽을 지배한다"로 갱신
- [x] 회귀 확인 — 기존 판정 8건(R3) assertion 무수정 통과 + 전체 스위트 0 fail
- [x] 순서 계약 고정 — 게이트가 디렉터리 규칙보다 앞에 있음을 테스트로 못 박음(구멍 2 재발 방지)
- [ ] 외부 리뷰 `/harness-review codex` 실행 → artifact `## Reviews`에 마커와 함께 기록
- [ ] artifact 결과·학습 기록 → PR 생성

## Ontology 변경 로그
- **테스트 파일**: "이름/위치가 test·spec 관례면 테스트" → **"확장자가 코드이고 그 위에 이름/위치
  관례를 만족하면 테스트"**. 판정의 1순위가 관례에서 파일 종류로 바뀐다.

## 참고
- `src/commands/task.mjs` — `SOURCE_EXTENSIONS`, `isTestPath()`, `classifyChangedPaths()`
- `tests/done-guard.test.mjs` — `makeEvidenceFixture()` (가드 수준 fixture), `classifyChangedPaths` 순수 테스트
