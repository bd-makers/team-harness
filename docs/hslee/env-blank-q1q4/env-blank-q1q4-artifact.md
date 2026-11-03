# env-blank-q1q4 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `harness-team stack` envelope 최상위 `declarations` — `null`(프리셋에 `declare` 없음: go·generic) 또는
  `{ runtimeVersion, lockfile, serviceFiles, bootstrap }`, 각 `null`(묻지 않음) | `{ question, state: 'declared' | 'blank', paths }`.
  요약 축 `환경 선언: Q1 .nvmrc, Q2 빈칸, Q4 빈칸`. `status`·`next_actions`·기존 필드 불변(spec D-5).
- doctor `env declarations` — 빈칸이면 후보와 함께 warning(fail 아님), 없으면 pass에 경로. warnActions 없음, pluginDev 미게이팅(D-6).
  init-smoke e2e는 "warning이 있다면 전부 `env declarations`"로 단언을 바꿨다.
- 규칙은 프리셋 `env.declare`(node·python)에만 있다. `holds()`에 `nonEmptyKey: [file, ...keys]` 1종 추가(메인테이너 escalation 승인).
  Q4는 pm의 `env.bootstrap` 규칙 lockfile을 답으로 재사용한다. `.env.*`는 `file` 존재만(가드 테스트).
- 이 저장소: Q1 `package.json`(engines.node)만 묻고 답함 — Q2·Q4 묻지 않음(오탐 0), doctor pass.
- 검증: `npm test` fail 0, `docs:check` 최신, scratchpad e2e(실제 npm 설치 프로젝트 빈칸/전부 답함, uv 프로젝트 lockfile 없음/있음, 이 저장소).
- 실측하지 않은 것: pnpm·bun·yarn이 마지막 의존성을 지운 뒤 남기는 표기(`nonEmptyKey`가 표기와 무관해 영향 없음),
  poetry·pdm·pipenv 실제 프로젝트, devcontainer·compose가 있는 실제 저장소(파일 존재만 보므로 fixture로 갈음).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-02T23:59:16.191Z — codex (harness-team review)

- engine: codex · scope: diff · base: 84dd9fc · mergeBase: 84dd9fc7846e5f59a4294c4df99fc8acd42267a7 · tip: 33b674a68f20c732071255af3af126c51b97050e · exit 0 · 4086 B

```text
전하, **P1은 없으며 P2 3건으로 수정 요청**입니다. 범위는 `84dd9fc..33b674a` 두 커밋입니다. 아래 재현 입력의 결과는 **정적 코드 추적**이며, 런타임 재현은 수행하지 못했습니다.

1. **P2 — [templates/presets/python.json:19](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/env-blank-q1q4-484d03/templates/presets/python.json:19>): 빈 의존성 선언에도 Q2·Q4를 묻습니다.**  
   `dependencies = [\n]\n`, `[dependency-groups]\ndev = []`, 빈 `requirements.txt` 모두 `hasDependencies=true`가 됩니다. lockfile·setup 파일이 없으면 의존성 0개인데 Q2·Q4가 `blank`로 보고됩니다. 반대로 `dependencies = [ "httpx" ]`는 놓쳐 두 질문이 `null`이 됩니다. 단순 표기 차이가 판정을 뒤집으므로, 명시한 “경고 누락 방향의 한계”보다 범위가 넓습니다. 공백·개행을 허용하는 유효한 TOML 표기입니다. [TOML 명세](https://toml.io/en/v1.0.0#array)

2. **P2 — [templates/presets/node.json:44](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/env-blank-q1q4-484d03/templates/presets/node.json:44>): 런타임 버전이 없어도 Q1을 답했다고 처리합니다.**  
   `package.json`이 `{"name":"a","engines":{"npm":">=10"}}`이면 Q1은 `declared`, doctor 검사는 `pass`가 됩니다. `devEngines`에 `packageManager`나 `os`만 있어도 같습니다. `nonEmptyKey` 자체의 의미는 계약대로지만, 상위 객체의 비어 있지 않음을 **런타임 버전 선언**으로 사용하는 조건이 너무 넓습니다. [npm 공식 문서](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#devengines)

3. **P2 — [templates/presets/python.json:29](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/env-blank-q1q4-484d03/templates/presets/python.json:29>): requirements의 주석만으로도 Q2를 답했다고 처리합니다.**  
   `requirements.txt`가 `# pin with ==\nhttpx\n`이면 실제 버전 고정 없이 Q2가 `declared`가 됩니다. 일부 항목만 `==`로 고정한 파일도 같습니다. 이는 선언 내용의 일치 여부를 검증하는 Q5 이전에, **잠금 선언의 존재 자체를 잘못 인정**하는 문제입니다. pip는 해당 주석을 무시합니다. [pip 공식 문서](https://pip.pypa.io/en/stable/reference/requirements-file-format/#comments)

나머지 요청 항목의 판단은 다음과 같습니다.

- **D11·`.env.*`:** `script→package.json`은 기존 `script` 조건의 출처 표현이므로 새로운 파일→질문 매핑 누수로 보지 않았습니다. 검토한 호출 경로에서 `.env.*` 내용 읽기는 발견하지 못했습니다.
- **stack·doctor:** 기존 `status`·`next_actions` 계산과 5줄 포장은 유지됩니다. doctor는 예외 시 `null`, warning은 fail에 미포함, `warnActions` 추가 없음, pluginDev 미게이팅입니다.
- **init-smoke:** 다른 warning과 error를 계속 거부하므로 일반적인 테스트 약화로 판단하지 않았습니다.
- **부분 문자열·Q4:** `.tool-versions`/mise의 주석·무관 문자열은 Q1 빈칸을 **숨기는 방향**입니다. 알려진 한계와 일치합니다. 혼합 lockfile에서 Q4는 감지된 pm의 bootstrap 규칙만 사용하며, pip의 Q4 빈칸은 명시한 설계와 일치합니다.

파일 변경은 없습니다. `git status`, 범위 diff, `git diff --check`를 확인했고 whitespace 오류는 없었습니다. 기존 handoff 미커밋 변경은 범위에서 제외했습니다. `npm test`·빌드·e2e는 미실행입니다. 메모리 기반 재현 명령도 here-document 임시 파일 생성이 권한에 막혀, 지침대로 재시도하지 않았습니다.

**최종 판정: Changes requested — 위 P2 3건을 수정한 뒤 재검토가 필요합니다.**
```

<!-- harness:review kind=codex scope=diff tip=33b674a68f20c732071255af3af126c51b97050e at=2026-11-02T23:59:16.191Z -->

**판별·조치 (작성 세션, 2026-11-03)**
- P2 python 빈 목록 표기·빈 `[dependency-groups]`·빈 `requirements.txt`가 의존성으로 잡힘 — **진짜**(의존성 0개 오탐은 spec 제약 위반).
  `hasDependencies`를 따옴표가 바로 뒤따르는 `dependencies = ["`·`dependencies = [ "`·`dependencies = [\n    "`로 좁히고 `[dependency-groups]`·
  `requirements.txt` 존재를 뺐다. `dependencies = [ "httpx" ]` 놓침도 함께 해소. 남은 놓침(다른 들여쓰기·CRLF·groups만)은 경고가 안 나는 쪽이라 spec 한계에 적었다.
- P2 `engines`에 `npm`만 있어도 Q1 답함 — **진짜**. `nonEmptyKey`가 중첩 키를 받게 하고(`[file, ...keys]`) `engines.node`·`devEngines.runtime`·
  `volta.node`로 좁혔다. 후보 안내도 `package.json#engines.node`로 바뀐다.
- P2 requirements 주석의 `==`로 Q2 답함 — **진짜**. lock 인정을 `--hash=`·`autogenerated by pip-compile`·`autogenerated by uv`로 좁혔다.
- 세 건 모두 테스트를 먼저 더해 red를 확인한 뒤 고쳤다(`tests/presets.test.mjs` 중첩 경로·pip-compile·주석·빈 목록·engines.npm 사례).
- 기타 응답(D11 누수 없음·`.env` 읽기 없음·stack/doctor 계약 유지·init-smoke 약화 아님·Q4 혼합 lockfile) — 동의, 조치 없음.

## Learnings
- 빈칸 보고의 적용 조건은 **오탐이 없는 방향으로만** 넓힌다: "의존성이 있다"·"답했다"를 인정하는 needle은 표기 하나로 뒤집히면 안 된다.
  상위 객체의 비어 있지 않음(`engines`)이나 파일 존재(`requirements.txt`)는 질문의 답이 아니다 — 질문이 묻는 키·표지까지 좁힌다(codex P2 3건).
