# config-rmw-cli — Spec

## 목적 / 요구사항

**문제.** `commands/harness-spec.md` 4단계가 `.harness/config.json`의 `specSources` 저장을 산문 절차로
들고 있다 — "read-modify-write로 하고 기존 키(`user` 등)를 보존하며, malformed JSON이면 덮어쓰지 말고
중단한다". 에이전트가 매번 파일을 읽어 JSON을 손으로 합치고 다시 쓴다. 규칙이 세 개인데 그중 둘
(키 보존·malformed 거부)은 실행할 때마다 잊을 수 있는 종류이고, 실제로 `tests/agentloop-spec-signals.test.mjs`가
"보존 실패"를 채점 신호로 두고 있다 — 산문으로만 강제되는 규칙이라 시뮬레이션으로 감시하는 상태다.

같은 파일을 쓰는 코드 경로가 이미 둘이다(`src/user-config.mjs`의 `saveUsername`, `src/commands/task.mjs`의
`readConfig`). 둘 다 **malformed JSON을 `{}`로 삼킨다** — `saveUsername`은 깨진 파일 위에 그대로 덮어쓴다.
산문 규칙("덮어쓰지 말라")과 코드 동작이 어긋나 있다.

**영향.** `/harness-spec`을 쓰는 모든 세션. 보존 실패는 `user`를 지워 `docs/<user>/` 경로 판정을
git user.name 폴백으로 바꾸므로 조용히 다른 디렉터리에 task가 생길 수 있다.

**기대 결과.** 판단이 없는 부분(읽기·경로 갱신·키 보존·malformed 거부·쓰기)을 `harness-team config`
서브커맨드로 내린다. `/harness-spec` 산문에는 "어느 필드가 비었는지 확인하고 `AskUserQuestion`으로 묻는다"만
남는다.

**제약.**

- `saveUsername`·`resolveUsername`(init/sync)의 관대한 읽기는 **이 task에서 바꾸지 않는다** — init 재실행이
  malformed config에서 멈추게 되는 동작 변화는 별도 합의가 필요하다. 쓰기 바이트만 새 `writeConfig`로 공유한다
  (같은 `JSON.stringify(…, null, 2) + '\n'`). 이관 항목은 artifact에 남긴다.
- 값은 **항상 문자열**로 저장한다. `spaceKey 123`을 숫자로 바꾸는 추측을 하지 않는다 — specSources의 값은
  전부 URL·키 문자열이다. 다른 타입이 필요하면 파일을 직접 편집한다.
- 키 경로 세그먼트는 `[A-Za-z0-9_-]+`만 허용하고 `__proto__`·`constructor`·`prototype`은 거부한다.
- 중간 세그먼트가 객체가 아니면(`user.x` 같은 경로) 덮어쓰지 않고 거부한다.

## 설계 / 접근

| 4단계 항목 | 판정 | 근거 |
|---|---|---|
| config 읽기 · `specSources.<source>.<field>` 조회 | **CLI** `config get [<key>]` | 판단 없음 |
| 누락 필드 판정 → `AskUserQuestion` | **산문 유지** | 세션 전용 입력 |
| read-modify-write · 키 보존 · malformed 거부 · 쓰기 | **CLI** `config set <key> <value>` | 판단 없음 · 규칙 3개가 손 실행에 의존 |
| "프로젝트 수준 기본 위치만 저장" | **산문 유지** | 무엇이 task별 값인지는 판단 |

구성:

- `src/user-config.mjs` — `readConfigStrict(targetDir)` (없음 → `{}`, malformed → throw), `writeConfig(targetDir, config)`
  (신규, `saveUsername`이 쓰기만 이것으로 공유), `getConfigValue`·`setConfigValue` (순수 경로 함수).
- `src/commands/config.mjs` (신규) — `runConfig(ctx)`. `get`·`set` 두 액션. 텍스트·`--json` 두 출력.
  malformed → error 패킷 + exit 1 + **파일 무변경**.
- 배선 — `src/cli-args.mjs` `COMMANDS`·`OPTIONS_HELP`, `bin/harness-team.mjs` `taskCmds`·`taskArgs`·`case 'config'`.
- 문서 — `commands/harness-spec.md` 4단계를 CLI 호출로 교체, `skills/harness-team/SKILL.md` Common commands,
  CHANGELOG, `docs/harness-overview.html` 재생성.

## Ontology

- **config**: `.harness/config.json`. 개인(gitignore) 설정. 키는 `user`(init이 씀)와 `specSources`(spec이 씀).
  이 task는 키 목록을 늘리지 않는다.
- **키 경로**: 점으로 이은 세그먼트(`specSources.confluence.baseUrl`). 중간 객체는 없으면 만든다.
- **RMW(read-modify-write)**: 파일을 통째로 읽어 경로 하나만 바꾸고 나머지를 그대로 다시 쓴다. "판단이 없다"의
  근거 — 같은 파일·같은 인자면 같은 결과다.
- **malformed**: 파일은 있는데 `JSON.parse`가 실패하는 상태. **없음**(`{}`로 시작)과 구분한다. 이 구분이
  종전 `readConfig` 두 벌에 없던 것이다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — `/harness-spec` 4단계의 config 저장 산문을 `harness-team config get|set`으로 대체한다.
- [x] **Constraint 명확도** (30%) — 문자열 값만 · 경로 세그먼트 검증 · init/sync 읽기 동작 불변.
- [x] **Success 기준** (30%) — `npm test` 통과 + malformed 파일이 `set` 후 바이트 그대로 + `harness-spec.md`에서
      RMW 산문이 사라짐 + 실제 워크트리에서 `config set`이 `user`를 보존.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일: `src/user-config.mjs`, `src/commands/config.mjs`(신규),
      `src/cli-args.mjs`, `bin/harness-team.mjs`, `commands/harness-spec.md`, `skills/harness-team/SKILL.md`,
      `tests/config-command.test.mjs`(신규), `tests/cli-args.test.mjs`, `tests/user-config.test.mjs`, `CHANGELOG.md`,
      `docs/harness-overview.html`(생성물).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 산문 정본: `commands/harness-spec.md` 4단계
- 종전 쓰기 경로: `src/user-config.mjs` `saveUsername` · 종전 읽기 경로: `src/commands/task.mjs:20`
- 보존 신호 채점: `tests/agentloop-spec-signals.test.mjs` (`specSources 저장값 일치`)
- 선례(같은 원칙): `docs/hslee/stack-detection-cli/`, `docs/hslee/scope-resolve-cli/`
- (open → 후속 task) `resolveUsername`·`task.mjs readConfig`의 관대한 읽기를 `readConfigStrict`로 이관할지 —
  init 재실행이 malformed config에서 멈추는 동작 변화라 합의 필요
