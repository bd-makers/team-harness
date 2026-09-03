# scaffold-pm-permissions — Spec

## 목적 / 요구사항

`harness-team init`이 대상 프로젝트에 쓰는 `.claude/settings.json`의 `permissions.allow`가
**pnpm 전용으로 고정**돼 있다(`templates/.claude/settings.json` 10~17행: `pnpm test`·`pnpm lint`·
`pnpm tsc --noEmit`·`pnpm install`·`pnpm add *` 등 8개). 같은 목록에 **Expo/React Native 전용**
항목(`pnpm expo start`·`pnpm expo prebuild *`·`npx expo install *`)과 `deny`의
`Edit(./ios/**)`·`Edit(./android/**)`도 스택과 무관하게 들어간다.

결과: npm·yarn·bun 프로젝트(이 저장소 자체도 npm)는 쓸모없는 허용 항목을 받고 실제 명령
(`npm test` 등)은 허용되지 않아 권한 프롬프트가 그대로 뜬다. 순수 Node·Python 프로젝트에
Expo 항목이 들어간다 — RN 전용 rules 4종을 스택으로 게이트한 선례(`excludesRnRules`)와
어긋난다. audit-cleanup(0.24.0)이 "범위 밖"으로 남긴 마지막 코드 항목이다.

인도할 것:
1. `permissions.allow`의 패키지 매니저 의존 항목을 **감지된 패키지 매니저**(npm·yarn·pnpm·bun,
   `detect-stack`의 `packageManager`)로 생성한다. npm은 `run` 형식(`npm run lint`), `add`는
   npm이면 `npm install *`. 패키지 매니저가 없으면(`(none)`: python·go·generic) pm 항목을 넣지 않는다.
2. Expo/RN 전용 항목(allow 3개 + deny `ios/android` 2개)은 유효 stack id가 RN 계열
   (`react-native`·`expo`)일 때만 넣는다 — `excludesRnRules`와 같은 판정 함수를 쓴다.
3. 패키지 매니저·스택과 무관한 항목(`Read`·`Edit`·`Write`·`Glob`·`Grep`·`Bash(codex:*)`, `.env`·
   `rm -rf`·`git push --force` deny, hooks 전체)은 템플릿 JSON에 그대로 둔다.

## 설계 / 접근

- 템플릿은 **JSON으로 유지**한다(`.hbs` 전환 금지 — `deepMergeJson`·`mergeClaudeSettings`가
  파싱된 객체를 받는 계약을 바꾸지 않는다). 템플릿의 `allow`/`deny`에서 pm·RN 의존 항목을 빼고,
  `planChanges`가 `tplSettings`를 파싱한 직후 **생성 함수가 반환한 항목을 합성**한다.
- 생성 함수(가칭 `stackPermissions({ packageManager, stackId })` → `{ allow: [], deny: [] }`)는
  `src/`의 순수 함수로 두고 `harness.mjs`에서 호출한다. 판정 입력은 `excludesRnRules`와 같은
  `ctx.flags?.stack ?? ctx.stackId`.
- 기존 프로젝트 재실행: `deepMergeJson`의 배열 병합은 **합집합**이라 이미 들어간 `pnpm *` 항목은
  남는다(무해·낡음). 이 task는 제거하지 않는다 — 알려진 한계로 CHANGELOG에 적고, 제거는 필요 시
  `migrate`의 별도 task로 둔다.
- stack 정보가 전혀 없는 호출(직접 `planChanges` 호출·테스트)은 RN rules 선례와 같이 pm 항목
  없이 템플릿 그대로다 — 종전 pnpm 고정보다 좁아지지만, init은 항상 stack을 넘기므로 실사용
  경로에는 영향 없다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **pm 의존 허용 항목**: `Bash(<pm> <cmd>)` 형태로 패키지 매니저 이름·호출 형식(`run` 유무)이
  바뀌는 allow 항목. test·test -- *·lint·typecheck·install·add 6종.
- **RN 전용 항목**: Expo CLI 호출 allow 3종과 네이티브 디렉터리 deny 2종. 유효 stack id가
  `react-native`·`expo`일 때만 존재한다.
- **유효 stack id**: 명시 `--stack`이 있으면 그것, 없으면 init이 감지해 `ctx.stackId`로 넘긴 값
  (`excludesRnRules`의 정의를 그대로 따른다).
- **게이트 통과 근거**: 목표·제약·성공 기준·영향 파일이 위와 아래에 모두 구체화돼 있다(4/4 체크).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
      → "init이 쓰는 settings.json 권한 목록을 감지된 패키지 매니저와 스택에 맞게 생성한다."
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
      → 템플릿 JSON 유지, merge 계약 불변, 기존 프로젝트의 낡은 항목 제거는 범위 밖, RN 선례와 동일 판정.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
      → pm×stack 매트릭스 단위 테스트 + planChanges 테스트(npm fixture에 `npm test`·Expo 없음,
        expo fixture에 Expo 항목) 통과, `npm test` 전체 green, `docs:check` exit 0, codex 리뷰 기록.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
      → `templates/.claude/settings.json`, `src/harness.mjs`(planChanges 180~195행, excludesRnRules),
        `src/detect-stack.mjs`(buildProfile의 packageManager), 신규 테스트 1파일, `CHANGELOG.md`,
        `tests/e2e/init-smoke.test.mjs`(settings.json 존재 확인만 — 변경 불필요 예상).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 → 1.0

## Done evidence
```json
{ "version": 1, "review": "required" }
```
스캐폴드 출력이 바뀌는 변경이라 D2 리뷰어(codex read-only) 기록을 요구한다. tests는 기본값(required).

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/harness.mjs` — `excludesRnRules`(RN 전용 rules 게이트 선례), `planChanges`의 settings deep-merge
- `src/detect-stack.mjs` — `detectPackageManager`(lockfile 기준 pnpm/yarn/bun/npm), `buildProfile`
- `src/merge.mjs` — `deepMergeJson` 배열 합집합(재실행 시 옛 항목 잔존의 근거)
- `tests/harness-settings.test.mjs` — settings 병합 기존 테스트(훅 그룹만 다룸)
- audit-cleanup handoff "범위 밖으로 남긴 것" — 이 task의 출처
