# js-pm-preset — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- JS lockfile→pm 판정이 `templates/presets/node.json` `env.packageManager`(pnpm·yarn·bun 규칙 3개, `{ when, id }`)로 옮겨졌고,
  `detectPackageManager()`는 `firstHolding()` + 코드 기본값(파싱된 package.json → npm, 아니면 null)만 남았다. 호출부 2곳 무변경.
- 영향 파일 3개(`node.json`·`src/detect-stack.mjs`·`tests/detect-stack.test.mjs`) + CHANGELOG.
- 검증: pm 표 테스트 12건을 이전 **전** green으로 고정 → 이전 후 green. mutation 3종(npm을 file 규칙으로·yarn/pnpm 순서 교체·`bun.lockb` 누락)
  모두 표가 잡았다. `npm test` 1,288건 fail 0(skip 1은 기존 CI 전용 jq 매트릭스). `docs:check` 최신. 이 저장소 `stack --json` envelope 전체가
  기준선과 동일. HEAD 사본(`git archive`)과 현재 코드의 `resolveStack` profile + `buildProposal`(fingerprint 포함) 비교 1,296조합
  (package.json 없음·손상·정상 × lockfile 5종 부분집합·yarn classic/berry × stack id 9종) diff 0 — 같은 비교에 mutation 사본을 넣으면 10건 diff로 잡힌다.
- 검증하지 못한 것: 실제 소비자 저장소에서의 init 재실행 diff(관리 절은 profile 값만 읽으므로 위 비교로 갈음), workspace별 pm(이번 판정 범위 밖, 기존과 같음).
- 후속(보고만): `buildProfile`의 `pm === 'npm' ? 'run ' : ''`와 npm/pip 기본값은 코드에 남은 도구 지식이다. D12 "미결"의 이 항목은 머지 뒤 닫을 수 있다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-02T22:40:24.159Z — codex (harness-team review)

- engine: codex · scope: worktree · base: refs/remotes/origin/main · mergeBase: a18749d050b17eda57376ede14624dd6157addde · tip: 84dd9fc7846e5f59a4294c4df99fc8acd42267a7 · exit 0 · 2001 B

```text
전하, **유의미한 P1/P2/P3 결함은 발견하지 못했습니다.**

- **D-1 타당:** 기존 기준은 `pkg`의 truthiness입니다. `{ file: 'package.json' }`으로 옮기면 손상된 JSON도 npm으로 판정하므로, 현재 조건 문법과 동작 유지 제약에서는 코드 기본값을 남기는 판단이 맞습니다. 다만 D11의 언어 지식 제거가 전부 끝난 것은 아닙니다.
- **D-2 타당:** `buildProfile()`이 `${pm} install`을 그대로 생성하므로 JS 규칙에 `install`을 추가해도 중복입니다.
- **D-3 타당:** JS 계열 다섯 ID가 모두 `node.json`에 매핑됩니다. `presetEnv('node')` 고정은 스택 ID 결정 전 감지와 JS 오버라이드 양쪽에 일관됩니다.
- **pm 표는 핵심 분기를 커버합니다:** 우선순위·bun 두 형식·npm 기본값·손상된 JSON·매니페스트 없는 오버라이드를 검증합니다. 다만 표만으로 전체 profile·fingerprint·관리 절의 동일성을 직접 증명하지는 않습니다. fingerprint는 `stack.packageManager`, 관리 절은 profile 값을 그대로 소비하며 해당 경로는 변경되지 않았습니다.

지정 merge base의 committed 변경과 현재 미커밋·미추적 파일을 확인했습니다. 선행 Q5의 optional-only npm 오탐은 spec에 명시된 허용 한계로 남아 있으며, 이번 JS 이전으로 추가된 회귀는 아닙니다.

검증은 다음과 같습니다.

- `git status`, `git diff`, `git diff --check` 확인 — 공백 오류 없음.
- 실제 이전·현재 함수와 현재 평가기·프리셋을 사용한 **메모리 내 profile 비교 9,504조합에서 차이 0**.
- 파일 변경 없음. 실제 파일시스템 기반 전체 테스트·빌드·설치·CLI 출력 비교는 실행하지 않았습니다. 메모리 비교는 디스크 오류나 동시 변경을 검증하지 않습니다.

**최종 판정: 승인 권고입니다. JS pm 이전의 동작 회귀를 뒷받침하는 근거는 없습니다.**
```

<!-- harness:review kind=codex scope=worktree tip=84dd9fc7846e5f59a4294c4df99fc8acd42267a7 at=2026-11-02T22:40:24.159Z -->

**판별·조치 (작성 세션, 2026-11-03)**
- 결함 발견 0건 — 조치 없음. D-1·D-2·D-3 타당 판정에 동의한다.
- "표만으로 profile·fingerprint·관리 절의 동일성을 직접 증명하지 않는다" — **맞는 지적이며 이미 보완됐다.** 작성 세션이 HEAD 사본 대 현재 코드의
  profile + `buildProposal` 1,296조합 비교(diff 0, mutation 사본은 10건 검출)와 `stack --json` 기준선 diff를 따로 돌렸다(`## 결과`).
- "D11 언어 지식 제거가 전부 끝난 것은 아니다" — 동의. npm/pip 기본값과 `buildProfile`의 npm `run ` 접두는 범위 밖으로 두고 후속으로 보고한다.

## Learnings
