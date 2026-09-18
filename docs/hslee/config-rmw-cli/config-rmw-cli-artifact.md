# config-rmw-cli — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `harness-team config get [<key>]` / `config set <key> <value>` 신규 (`src/commands/config.mjs`). `.harness/config.json`의
  read-modify-write를 CLI가 소유한다 — 키 보존·malformed 거부(exit 1, 바이트 불변)·경로 세그먼트 검증·중간 비객체 거부.
- `src/user-config.mjs`에 `readConfigStrict`(없음 `{}` / malformed throw)·`writeConfig`(유일한 쓰기 지점)·
  `getConfigValue`·`setConfigValue`·`parseConfigKey`. `saveUsername`은 쓰기만 `writeConfig`로 공유 — 읽기는 종전대로 관대.
- `commands/harness-spec.md` 4단계에서 RMW 산문 제거(질문 판단만 남김). SKILL common commands·CHANGELOG·overview 갱신.
- 실측: 워크트리에서 `config set user hslee` → `config set specSources.confluence.spaceKey PROJ` 후 `user` 보존 확인
  (`preserved: user`). `npm test` 946 pass / 1 skipped(기존).

**이관 목록(후속)** — `resolveUsername`(init) · `task.mjs readConfig`의 관대한 읽기를 `readConfigStrict`로 옮길지는 별도 합의:
init 재실행이 깨진 config에서 멈추게 되는 동작 변화다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-18T14:08:48.692Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 27c9fafd89b65ad2c4ec26c567ef58501e283e07 · exit 0 · 957 B

```text
전하, P1은 없습니다.

- P2 — [src/commands/config.mjs:15](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/remaining-candidates-05572e/src/commands/config.mjs:15): `--json` 요청에서도 잘못된 action·키·인자 누락은 JSON envelope 대신 stderr usage를 내보내므로 기계 소비자가 파싱할 수 없습니다.

- P3 — [docs/hslee/config-rmw-cli/config-rmw-cli-artifact.md:14](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/remaining-candidates-05572e/docs/hslee/config-rmw-cli/config-rmw-cli-artifact.md:14): EOF의 여분 빈 줄로 `git diff --cached --check`가 whitespace 경고를 냅니다.

최종 판정: P2 수정 후 승인 권장. staged diff를 검토했고, 변경 파일의 `node --check`는 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=27c9fafd89b65ad2c4ec26c567ef58501e283e07 at=2026-09-18T14:08:48.692Z -->

**판별 (2026-09-18)**

| # | 판정 | 근거 | 조치 |
|---|---|---|---|
| P2 | **진짜** | `rules.mjs`가 같은 지적(codex P2)을 이미 받아들여 "--json 계약은 명령 전체에 걸친다"로 invalid-action을 envelope로 낸다. config만 stderr usage면 그 선례와 어긋난다 | `usage(json, …)`이 `--json`에서 exit 2 envelope(error 패킷 포함)을 내도록 수정 + 회귀 테스트(사용법 오류 3종 × envelope) |
| P3 | 오탐(범위 밖) | artifact EOF 빈 줄은 `taskArtifactTemplate`가 만드는 형태로 모든 task가 같다. 이 task의 변경이 아니다 | 없음 |

### 2026-09-18T14:12:50.639Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 27c9fafd89b65ad2c4ec26c567ef58501e283e07 · exit 0 · 1009 B

```text
전하, P1은 없습니다.

- P2 — [src/commands/config.mjs:71](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/remaining-candidates-05572e/src/commands/config.mjs:71): `config set <key> <value> <extra>` 및 `config get <key> <extra>`가 여분 인자를 조용히 무시하므로, 공백 포함 값을 인용하지 않은 경우 값이 잘린 채 설정될 수 있습니다.

- P3 — [config-rmw-cli-artifact.md:47](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/remaining-candidates-05572e/docs/hslee/config-rmw-cli/config-rmw-cli-artifact.md:47): EOF 여분 빈 줄로 `git diff --cached --check`가 whitespace 오류를 보고합니다.

최종 판정: P2 수정 후 승인 권장입니다. staged working-tree diff를 검토했고, 변경된 JS 두 파일의 `node --check`는 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=27c9fafd89b65ad2c4ec26c567ef58501e283e07 at=2026-09-18T14:12:50.639Z -->

**판별 (2026-09-18, 2회차)**

| # | 판정 | 근거 | 조치 |
|---|---|---|---|
| P2 | **진짜** | `set k MY SPACE`가 조용히 `MY`를 저장한다 — `cli-args`가 모르는 플래그를 거부하는 이유(silent default)와 같은 결함 | 액션별 arity 초과 인자를 exit 2로 거부 + 회귀 테스트 |
| P3 | 오탐(범위 밖) | 1회차와 같음 — 템플릿 형태 | 없음 |

### 2026-09-18T14:15:18.742Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 27c9fafd89b65ad2c4ec26c567ef58501e283e07 · exit 0 · 627 B

```text
전하, P1은 없습니다.

- P2 — `src/user-config.mjs:91`: 기존 객체인 leaf도 무조건 문자열로 덮어써서 `config set specSources.confluence replacement`가 `baseUrl`·`spaceKey`를 조용히 삭제합니다; 객체 leaf는 거부하거나 직접 편집을 요구해야 보존 계약에 맞습니다.

- P3 — `docs/hslee/config-rmw-cli/config-rmw-cli-artifact.md:70`: EOF 여분 빈 줄로 `git diff --cached --check`가 whitespace 경고를 냅니다.

최종 판정: P2 수정 후 승인 권장입니다. 변경은 모두 staged 상태였고, `node --check`는 새 JS 파일들에서 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=27c9fafd89b65ad2c4ec26c567ef58501e283e07 at=2026-09-18T14:15:18.742Z -->

**판별 (2026-09-18, 3회차)**

| # | 판정 | 근거 | 조치 |
|---|---|---|---|
| P2 | **진짜** | `set specSources.confluence x`가 `baseUrl`·`spaceKey`를 조용히 지운다 — 이 함수가 지키려는 보존 계약의 반대. 중간 비객체는 막았으면서 leaf 객체는 안 막은 비대칭 | `setConfigValue`가 객체 leaf를 throw(하위 키 나열)로 거부 + 순수·CLI 회귀 테스트 2건 |
| P3 | 오탐(범위 밖) | 1·2회차와 같음 | 없음 |

### 2026-09-18T14:18:02.272Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 27c9fafd89b65ad2c4ec26c567ef58501e283e07 · exit 0 · 1130 B

```text
전하, P1은 없습니다.

- P2 — [src/user-config.mjs:97](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/remaining-candidates-05572e/src/user-config.mjs:97): 빈 config에서 `config set specSources.confluence bad`를 허용해 컨테이너를 문자열로 만들고, 이후 문서화된 `specSources.confluence.baseUrl` 설정이 중간 비객체 오류로 막힙니다. 알려진 컨테이너 경로는 leaf로 설정하지 못하게 막고 회귀 테스트를 추가해야 합니다.

- P3 — [config-rmw-cli-artifact.md:93](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/remaining-candidates-05572e/docs/hslee/config-rmw-cli/config-rmw-cli-artifact.md:93): EOF 여분 빈 줄 때문에 `git diff --cached --check`가 whitespace 오류를 보고합니다.

검증: staged working-tree diff를 직접 검토했고, 변경 JS의 `node --check`는 통과했습니다.

최종 판정: P2 수정 후 승인 권장입니다.
```

<!-- harness:review kind=codex scope=worktree tip=27c9fafd89b65ad2c4ec26c567ef58501e283e07 at=2026-09-18T14:18:02.272Z -->

**판별 (2026-09-18, 4회차)**

| # | 판정 | 근거 | 조치 |
|---|---|---|---|
| P2 | **기각(설계 선택)** | 빈 config에서 `set specSources.confluence bad`는 허용되지만, 다음 `set specSources.confluence.baseUrl …`이 **중간 비객체로 exit 1 + 파일 불변**으로 크게 실패한다 — 조용한 손실이 아니다. 막으려면 CLI가 spec의 키 스키마(`specSources.<source>`가 컨테이너)를 알아야 하는데, 이 CLI는 스키마 없는 generic RMW이고 스키마 정본은 `harness-spec.md`(정확한 키 3개를 예시로 든다)다. 컨테이너 목록을 CLI에 두면 네 번째 드리프트 소스가 된다(stack task와 같은 이유) | 없음. 산문의 예시 키를 그대로 쓰면 발생하지 않는다 |
| P3 | 오탐(범위 밖) | 1~3회차와 같음 | 없음 |

4회차에서 남은 지적이 설계 선택(기각)과 템플릿 형태(범위 밖)뿐이라 수렴으로 본다.

## Learnings

