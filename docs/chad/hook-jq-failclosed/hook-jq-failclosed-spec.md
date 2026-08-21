# hook-jq-failclosed — Spec

## 목적 / 요구사항

`templates/.claude/hooks/` 의 훅 중 `jq` 로 stdin JSON 을 파싱하는 4개가, **jq 가 PATH 에 없으면
조용히 무력화(fail-open)** 된다. 파싱 결과가 빈 문자열이 되어 `TOOL_NAME != "Bash"` / `FILE_PATH` 빈값
분기로 빠지고 exit 0(허용) 한다. 이 task 는 **jq 가 없어도 jq 가 있을 때와 같은 판정이 나오도록**
폴백 파서를 넣는다(fail-closed).

실측(통제된 PATH: `cat`·`grep` 만, jq 제거):

| 훅 | 입력 | jq 있음 | jq 없음(수정 전) | 성격 |
|---|---|---|---|---|
| `block-dangerous-git.sh` | `git push --force` | exit 2 | **exit 0** | 보안 통제 |
| `protect-files.sh` | `.env` 편집 | exit 2 | **exit 0** | 보안 통제 |
| `pre-commit-check.sh` | `git commit` | (본 저장소는 검증 통과라 exit 0) | exit 0 | 커밋 게이트 |
| `auto-format.sh` | `.ts` 편집 | prettier 실행 | 스킵 | 편의 기능 |

`boundary-checkpoint.sh`(sh, `harness-team boundary checkpoint` 위임)와 `observe-tools.mjs`(node)는
jq 를 쓰지 않는다 — 직접 확인함.

**만족해야 할 조건**
1. jq 가 없어도 위험한 명령/보호 파일은 차단된다.
2. jq 가 없어도 안전한 명령은 통과한다. — 훅은 매 도구 호출마다 돌기 때문에 "jq 없으면 무조건 exit 2"는
   어떤 bash 명령도 못 쓰는 벽돌 상태를 만든다. 금지.
3. jq 가 없다는 사실이 사용자에게 보인다(차단/실행 메시지 + `doctor`).
4. **기존 차단/허용 판정 기준은 바꾸지 않는다.** 정규식·패턴·exit 코드 의미 재설계 금지.

## 설계 / 접근

### 1. 폴백 파서 — "payload 전체 스캔"은 채택하지 않았다 (실측 근거)

오케스트레이터가 제안한 유력안은 "jq 부재 시 원본 INPUT JSON 전체에 기존 패턴을 적용"이었다.
**직접 검증한 결과 조건 2를 위반해 기각했다.** 패턴이 `git[[:space:]]+<sub>[[:space:]]+(.*[[:space:]])?TOKEN`
꼴이라 `.*` 가 command 필드를 넘어 **뒤따르는 `description` 필드까지 삼킨다**:

```
{"command":"git checkout -b feat/x","description":"branch off main -- do not touch"}   → BLOCK (오탐)
{"command":"git push origin main","description":"push the branch -f is not used"}      → BLOCK (오탐)
```

같은 명령이라도 모델이 쓴 description 문구에 따라 판정이 달라진다 — 보안 훅에서 허용 불가.

**채택안: `"key": "value"` 문자열만 잘라내 그 값에만 기존 패턴을 적용**한다.

```bash
json_field() {  # $1=key, $2=json — 첫 매치의 값만 반환, 없으면 return 1
  local raw
  raw=$(printf '%s' "$2" | grep -oE "\"$1\""'[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"')
  raw=${raw%%$'\n'*}
  [[ -z "$raw" ]] && return 1
  raw=${raw#*:}; raw=${raw#*\"}; printf '%s' "${raw%\"}"
}
```

**한계(명시)**
- 같은 이름의 키가 여러 번 나오면 **첫 매치만** 읽는다.
- JSON 이스케이프를 **디코드하지 않는다**: `\"`·`\\`·`\n`·`\t` 가 두 글자로 남는다.
  → `git push\t--force` 처럼 구분자가 `\t` 로 인코딩된 명령은 jq 모드에서는 차단되지만
  폴백에서는 통과한다(잔여 fail-open, 문서화만 하고 정규식은 손대지 않는다).
- 추출 실패(알 수 없는 payload 형태) 시 **차단형 훅은 payload 전체를 스캔**한다 — 정밀도를 잃더라도
  fail-open 으로 돌아가지 않기 위한 마지막 방어선.

### 2. 공통 로직 공유 방식 — 공유 파일 대신 "동일 블록 + 드리프트 테스트"

`src/harness.mjs:232` 의 배달은 `copyTree(..., { skipExisting: true })` 다. 즉 **이미 파일이 있는
소비자 프로젝트에서는 훅이 덮어써지지 않는다.** 기존 사용자의 실질 업그레이드 경로는 "바뀐 훅 파일을
직접 복사"이며, 이때 공유 라이브러리 파일(`hooks/lib/*.sh`)이 함께 오지 않으면 `source` 가 실패한다.
훅이 exit 2 가 아닌 코드로 죽으면 Claude Code 는 non-blocking error 로 취급 → **지금 고치려는
fail-open 이 그대로 재현**된다. 따라서:

- 훅은 **자체 완결형**으로 둔다(외부 source 없음).
- 대신 4개 훅에 들어가는 공통 블록을 `# --- harness:jq-fallback ---` 마커로 감싸고,
  `tests/hooks-jq-fallback.test.mjs` 가 **4개 블록이 바이트 단위로 동일한지** 대조해 복붙 드리프트를 막는다.

### 3. 훅별 처리

| 훅 | jq 부재 시 | 근거 |
|---|---|---|
| `block-dangerous-git.sh` | tool_name 추출 → Bash 아니면 exit 0 / command 추출 실패 시 payload 전체 스캔. 차단 메시지에 저정밀 모드 명기 | 보안 통제 — fail-closed |
| `protect-files.sh` | file_path → 없으면 command → 둘 다 없으면 payload 전체 스캔. 차단 메시지에 명기 | 보안 통제 — fail-closed |
| `pre-commit-check.sh` | tool_name/command 동일 처리. `.scripts.test` 판정은 jq → **node** 폴백(`node -e`), node 도 없으면 스킵. 실행 배너에 저정밀 모드 명기 | 커밋 게이트 — fail-closed. node 는 이 하네스의 기존 하드 의존(settings.json 이 매 도구 호출마다 `node observe-tools.mjs` 실행)이라 jq 보다 안전한 폴백 |
| `auto-format.sh` | file_path 추출만. 실패 시 **기존대로 exit 0(스킵)** | 보안 통제가 아니다(포매팅). 판정을 바꾸지 않고 폴백 파서만 공유해 드리프트를 막는 쪽이 이득 |

### 4. doctor 의 jq 표시 — optional → warning

`EXTERNAL_TOOLS` 5개 중 jq 만 성격이 다르다. gh·codex·gemini·opencode 는 없으면 **기능이 꺼지지만**,
jq 는 없으면 **보안 통제가 저정밀 모드로 내려간다**. 이번 수정 후에도 (§1 한계대로) 정밀도는 떨어지므로
`- (not found, optional)` 은 사실과 다르다. **warning 으로 승격하되 `fail++` 는 하지 않는다**
— 나머지 4개의 표시·의미는 그대로 두고, exit code 계약도 유지한다(warning 은 exit code 에 반영되지 않음).

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **fail-open**: 통제가 자기 입력을 해석하지 못했을 때 **허용**으로 떨어지는 것. 여기서는 jq 부재 →
  빈 문자열 → 조기 exit 0.
- **fail-closed**: 해석 실패 시 **보수적으로(차단 쪽으로) 판정**하는 것. 단 조건 2 때문에 "전부 차단"이
  아니라 "판정 가능한 것은 판정하고, 판정 불가능한 것만 보수적으로" 를 뜻한다.
- **저정밀(degraded) 모드**: jq 없이 `grep` 문자열 추출로 필드를 뽑아 같은 패턴을 적용하는 상태.
  판정 기준은 동일, 입력 해석 정밀도만 낮다.
- **드리프트 가드**: 공통 블록을 파일 4개에 복제하되 테스트가 동일성을 강제해 복붙 발산을 막는 장치.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — "jq 가 없어도 있을 때와 같은 차단/허용 판정이 나오게 한다" 한 문장.
- [x] **Constraint 명확도** (30%) — 무조건 exit 2 금지, 판정 기준 변경 금지, 잔여 리스크(커밋 메시지
      오탐·`git -C` 프리픽스 우회) 범위 밖, release/버전 범프/머지 금지.
- [x] **Success 기준** (30%) — 차단/허용 매트릭스를 jq 있음·없음 양쪽에서 자동화 테스트로 통과 +
      `bash -n` + `npm run test` 전체 통과.
- [x] **Context 명확도** (brownfield) — 영향 파일 식별 완료: 훅 4개, `src/commands/doctor.mjs`,
      `tests/doctor.test.mjs`, 신규 `tests/hooks-jq-fallback.test.mjs`, `CHANGELOG.md`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

> 게이트 통과 근거: 결함이 실측으로 재현됐고(위 표), 채택/기각 설계안이 실측 근거와 함께 확정됐으며,
> 성공 판정이 실행 가능한 테스트로 정의됐다.

## 참고
- 상류 유래·잔여 리스크 원문: `docs/chad/pocock-merge/pocock-merge-artifact.md`
- 배달 경로: `src/harness.mjs:232` (`copyTree`, `skipExisting: true`)
- 배선: `templates/.claude/settings.json` PreToolUse `Bash` / `Edit|Write` matcher
