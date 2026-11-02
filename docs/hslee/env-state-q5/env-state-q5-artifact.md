# env-state-q5 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `harness-team stack` envelope에 최상위 `installTrace`가 생겼다 — 3값 계약: 판정 규칙 없음 `null`, 아니면 `{ state: 'present' | 'absent', lockfile, trace }`.
  요약 축 `설치 흔적: 있음|없음 (<lockfile> → <trace>)`, `absent`면 `status: warning`과 bootstrap 명령 `next_actions`. 기존 필드 불변.
- 규칙은 프리셋 `env.installTrace.<pm>`(node: npm·pnpm·yarn berry/classic·bun, python: uv)에만 있고, 평가기 `detectInstallTrace()`는
  `firstHolding()`·`holds()`를 재사용한다 — 새 조건 종류 없음. 영향 소스 4개.
- 판정하지 않는 것: lockfile 없음(이 저장소)·의존성 0개 npm lockfile·poetry·`bun.lockb`·npm lockfileVersion 1·workspace별, 런타임 버전(spec D-1).
- 검증: `npm test` 1,287건 fail 0, `docs:check` 최신, scratchpad e2e 8건(실제 npm·pnpm·yarn 1·yarn 4·uv 프로젝트, 흔적 있음·지움·0개 의존성·이 저장소).
- 실측하지 않은 것: pnpm·yarn·bun의 **의존성이 있는** 설치 흔적(0개일 때의 동작과 공식 동작에서 추론), berry `nodeLinker: node-modules`,
  `UV_PROJECT_ENVIRONMENT` 재지정(디스크에서 보이지 않아 `absent`로 나온다 — spec D-4에 한계로 적음).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-02T16:57:41.702Z — codex (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a18749d050b17eda57376ede14624dd6157addde · tip: 3faa1cf4767522558446f154f5cff571ba5aa008 · exit 0 · 2634 B

```text
전하, **P2 1건, P3 2건입니다. P1은 없습니다.**

- **P2 — `templates/presets/node.json:28`**: optional-only 의존성이 현재 OS에서 모두 제외되면 정상 설치 후에도 `node_modules`가 없을 수 있어, 이 가드는 계속 `absent → warning → npm ci`를 안내합니다.
- **P3 — `tests/detect-testing.test.mjs:389`**: “summary가 가리키는 조치”라는 이름과 달리 `summary`를 assert하지 않아, summary와 `next_actions[0]`의 불일치를 잡지 못합니다.
- **P3 — `tests/detect-testing.test.mjs:379`**: “설치되면 success” 검증은 빈 디렉터리 생성뿐입니다. 실제 검증 범위에 맞게 “흔적 경로가 생기면”으로 이름을 좁히는 편이 정확합니다.

첫 항목은 **npm 소스에서 도출한 결과이며 실제 설치 재현은 미실행**입니다. npm은 OS 비호환 optional 패키지를 설치 대상에서 제외하고, 디렉터리가 없으면 hidden lockfile 저장 실패도 허용합니다. 경로 부재 관측은 사실이지만 bootstrap 재실행으로 해소되지 않는 경고가 됩니다. [npm 설치 판정 소스](https://github.com/npm/cli/blob/v11.9.0/workspaces/arborist/lib/arborist/build-ideal-tree.js), [lockfile 저장 소스](https://github.com/npm/cli/blob/v11.9.0/workspaces/arborist/lib/shrinkwrap.js)

나머지 요청 항목은 다음과 같습니다.

- 일반 workspace 링크·bundled v2/v3 레이아웃에서 가드가 놓치는 사례는 확인하지 못했습니다.
- `condFile`의 예외는 현재 내장 프리셋 작성 오류에만 해당하므로 허용 가능합니다. `null`로 삼키면 오류를 “해당 없음”으로 위장합니다.
- CHANGELOG는 `success → warning`과 소비자 영향을 명시해 충분합니다.
- runner-missing·unreadable 분기는 코드상 기존 조치를 첫 번째, bootstrap을 두 번째로 유지합니다. unreadable과 trace-absent의 결합 테스트는 없습니다.
- “설치 흔적: 있음”은 lockfile 일치를 주장하지 않으며 CHANGELOG도 한계를 명시합니다.
- 이번 diff의 실행 로직에는 새로운 언어·도구별 지식이 없고, 해당 규칙은 프리셋 JSON에 있습니다.

변경한 파일은 없습니다. `git diff --check` 통과, 실제 `stack --json` 실행 정상, 쓰기 없는 기존 테스트 **1건 통과**를 확인했습니다. 전체 테스트·실제 설치는 실행하지 않았으며, 메모리 재현 명령도 셸 임시 파일 권한에 막혀 실행되지 않았습니다.

**최종 판정: P2의 optional-only 적용 조건을 보완한 뒤 승인 권고입니다.**
```

<!-- harness:review kind=codex scope=diff tip=3faa1cf4767522558446f154f5cff571ba5aa008 at=2026-11-02T16:57:41.702Z -->

**판별·조치 (작성 세션, 2026-11-03)**
- P2 optional-only npm 의존성 — **진짜**. `os: ["win32"]` 로컬 tarball을 optional로 오프라인 설치해 재현했다: 설치 성공, lockfile에
  `"node_modules/` 키 1개, `node_modules` 없음 → `absent`/warning. **코드는 바꾸지 않고 알려진 한계로 문서화**했다(spec 범위 절·CHANGELOG) —
  가르려면 lockfile 항목 단위 판정이라는 새 조건 종류가 필요하고(spec "새 조건 종류 없음"), 의존성이 전부 플랫폼 optional인 저장소는 드물며
  결과는 soft warning이다. 메인테이너가 다르게 판단하면 다음 task에서 다룬다.
- P3 러너 부재 순서 테스트가 summary를 단언하지 않음 — **진짜**. `env.summary`에 같은 조치가 있는지 단언을 더했다.
- P3 "설치되면 success" 테스트 이름이 빈 디렉터리 생성만 검증 — **진짜**. 이름을 "흔적 경로가 생기면 success"로 좁혔다.
- 기타 응답(condFile throw 유지·CHANGELOG 충분·과잉 주장 없음·D11 위반 없음) — 동의, 조치 없음. unreadable+absent 결합은
  `summaryNamesAction`의 같은 분기라 별도 테스트를 더하지 않았다.

## Learnings
