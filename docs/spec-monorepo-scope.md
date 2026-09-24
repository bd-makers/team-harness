# 모노레포 범위(scope) 확장 스펙

> 상태: **확정 — 1단계(#93)·2단계 B(#94)는 0.41.0으로 출시, 3단계 C1은 보류** · 작성 2026-09-24 · 조사 기준 코드 `main@dce0a5b` (0.40.3)
> 기준선: `npm test` 970건 중 969 pass · 1 skip · 0 fail, perf 1 pass (2026-09-24 실행)
>
> **결정 (2026-09-24, 사용자):** ① 확장은 **B에서 멈춘다** — C1(3단 경로)은 만들지 않고 §4.3·§7 3단계는 트리거 발생 시 재검토용 기록으로만 남긴다.
> ② CLI 용어는 **`area`** (`--area`, `meta.area`). ③ 결함 R1(마커 없는 dir 활성화)은 이 스펙에서 **분리**해 별도 task로 고친다.
> 미결: 팀 저장소 반영 여부(§8 Q3).

## 1. 요약 결론

1. **경로를 바꾸는 확장(A·C1)은 지금은 권하지 않습니다.** 동기 사례가 필요로 하는 것(앱별 목록·묶음·이름 충돌 회피·소유권 glob)은 **B(이름 접두 공식화 + `meta.area`)로 충족됩니다**. B는 경로를 바꾸지 않아 무설정 바이트 동일을 구조적으로 보장합니다.
2. 원안 A의 `.harness/config.json`은 **소비자 저장소에서 gitignore 대상**입니다(`src/harness.mjs:395-396`). 레이아웃 스위치를 거기 두면 클론마다 task 위치가 갈립니다. 또 2단·3단이 공존하면 전역 스위치는 쓸모가 없습니다. 경로 확장이 필요해지면 A 대신 **C1(커밋되는 area 마커 디렉터리)** 을 씁니다.
3. 경로 조립 지점은 원래 알려진 "8파일 ~20곳"이 아니라 **13파일 + 훅 템플릿 1개, 약 60줄**입니다. **task 판정 규칙이 서로 다른 스캐너가 8개** 있습니다. 이것이 근본 원인이므로 **1단계(헬퍼 일원화, 동작 변화 0)** 는 어느 안을 고르든 먼저 합니다.
4. 실측으로 확인한 결함 3건: ① `task`가 spec 마커 없는 디렉터리도 기존 task로 활성화합니다. ② `migrate`의 레거시 스캐너 2개가 3단 구조를 오인해 파일을 만듭니다. ③ user 이름이 `fix`/`feature`이면 3단 task를 0.6 이전 task로 보고 옮깁니다.
5. `scope`라는 이름은 이미 `harness-team scope`와 `review --scope worktree|diff|task-docs`가 쓰고 있습니다. 이 스펙은 CLI 용어로 **`area`** 를 제안합니다(§8 Q2).

---

## 2. 경로 조립 지점 전수표

### 2.1 검색 패턴 (재현용)

```bash
# P1 'docs' 문자열 리터럴
grep -rnE "'docs'|\"docs\"|\`docs/|'docs/|\"docs/" src bin
# P2 템플릿 리터럴 안의 docs/${…} — P1이 놓친 `${ref}:docs/…` 형태를 잡는다
grep -rnE 'docs/\$\{' src bin templates/.claude/hooks
# P3 join/resolve 인자
grep -rnE "(join|resolve)\([^)]*'docs'" src bin templates/.claude/hooks
# P4 docs를 직접 쓰지 않는 파일명 조립(스캐너 내부의 join(userPath, task, …))
grep -rnE '\$\{[a-zA-Z.]+\}-(spec|plan|handoff|artifact|context|meta|task|diagram)\.(md|json|html)' src bin
# P5 경로가 아니라 user/task 식별자(원장 키·HMAC·유래 마커·출력)
grep -rnE '\$\{(active\.)?user\}/\$\{(active\.)?(task|name)\}|key\(user, ?task\)|\\u0000\$\{' src templates/.claude/hooks
```

**누락 가능성:** 변수명이 `user`·`task`·`name`·`active.*`·`t.*`·`c.*`가 아닌 조립은 P2·P5가 놓칠 수 있습니다. 경로를 계산해서 만드는 경우(예: `rel.split('/')`로 역파싱)도 마찬가지입니다. `split('/')`를 따로 검색했지만 task 경로를 역파싱하는 곳은 없었습니다. 셸 훅(`templates/.claude/hooks/*.sh`)은 전부 `harness-team` CLI에 위임하므로 경로를 직접 조립하지 않습니다(`boundary-checkpoint.sh:11`, Codex `templates/.codex/hooks.json`).

### 2.2 전수표

구분 — **H** 기존 헬퍼 · **I** 인라인 조립 · **S** 디렉터리 스캐너(task 판정 규칙 포함) · **K** 식별자(경로 아님) · **L** 레거시 구조 전용 · **O** 출력 문자열

| 파일:라인 | 용도 | R/W | 구분 |
|---|---|---|---|
| `task.mjs:41-43` `taskDir()` | 생성·활성화 대상 dir(237에서만 사용) | R(exists)/W(mkdir) | H(로컬) |
| `task.mjs:50-52` | next 안내 `docs/${user}/${name}/${name}` | — | O |
| `task.mjs:147` `renderUserHandoff` | user handoff 본문의 `→ docs/<u>/<t>/<t>-handoff.md` | W | I(템플릿) |
| `task.mjs:275-279, 308-312` | `active.json`의 `path` 기록 (**읽는 곳 0** — `grep -rn "active\??\.path" src templates` 0건) | W | I |
| `task.mjs:285-291, 323-337` | JSON envelope summary·nextActions·artifacts, stdout | — | O |
| `task.mjs:343-360` `runList` | `docs/*/*` 2단 + `<t>-spec.md` 마커 | R | **S①** |
| `task.mjs:533-538` `handoffRelPaths()` | done 가드·post-commit 훅의 제외 집합(repo 상대) | R | H |
| `task.mjs:607, 616, 626` | done 가드 spec·plan·artifact | R | I |
| `task.mjs:748, 774` | done: task handoff 마커 append, user handoff 종결형 | W | I |
| `task.mjs:780-782` | done stdout | — | O |
| `task.mjs:812, 826` | retro artifact append / 출력 경로 | W / O | I |
| `task.mjs:923, 940, 946` | `runHandoffAuto`(post-commit): task handoff, user handoff, plan | W / W / R | I |
| `summary.mjs:16` `SUMMARY_REL` | `docs/task_summary.md`(task 경로 아님) | R/W | H |
| `summary.mjs:17` `userIndexRel` | `docs/<u>/<u>-task.md` | R/W | H |
| `summary.mjs:19` `metaRel` | meta.json(57·65, `migrate.mjs:952,1073`에서 사용) | R/W | H |
| `summary.mjs:70` `key()` | 원장 Map 키 `user/task` | — | K |
| `summary.mjs:77` | `inferLegacyMeta`의 handoff | R | I |
| `summary.mjs:132-137` `readLedger` | `docs/*` 1단 + user index | R | **S②** |
| `summary.mjs:158-171` `collectTasks` | 2단 + spec 마커(summary, `migrate --adopt-reviews`가 소비) | R | **S③** |
| `session-context.mjs:25-41` `listIncompleteTasks` | 2단 + spec 마커 + plan | R | **S④** |
| `session-context.mjs:74, 90, 99` | SessionStart breadcrumb `user/task` | — | O/K |
| `context.mjs:80-82` `contextCardPath` | TCC(151·172, `session-context.mjs:75`) | R/W | H |
| `boundary.mjs:16-18` `taskSpecPath` | boundary 선언 spec | R | H(로컬) |
| `boundary.mjs:247` | checkpoint가 대조하는 plan 경로 | R | I |
| `doctor.mjs:238` (+240·244·260 메시지) | active spec 게이트 | R | I |
| `review.mjs:476-478` | 엔진 프롬프트에 넣는 spec·plan·artifact | —(에이전트 입력) | I |
| `review.mjs:515, 540` | artifact 쓰기 / **로컬 `metaRel`이 summary 헬퍼를 가림** | W / O | I |
| `rules.mjs:206` | 승격 원천 artifact | R/W | I |
| `rules.mjs:273` | 규칙 파일 유래 마커 `origin = user/task`(**커밋됨**) | W | K |
| `diagram.mjs:135-139, 154-155` | taskRel·diagram·artifact·plan | R/W | I |
| `remote-task.mjs:46` | `git show ${ref}:docs/<u>/<t>/<t>-meta.json`(**repo 루트 상대**) | R(git) | I |
| `remote-task.mjs:71` | nudge의 `git log -- docs/<u>/<t>` | — | O |
| `observe.mjs:179-190` `resolveTaskRefs` | 2단 + **meta.json 마커**(다른 스캐너와 규칙 다름) + HMAC | R | **S⑤**/K |
| `templates/.claude/hooks/observe-tools.mjs:103-107` | HMAC(`active.user\0active.task`) — **소비자에 복사되는 훅** | — | K |
| `migrate.mjs:28-48` `findOldTasks` | `docs/*/{feature,fix}/*` | R | **S⑥** L |
| `migrate.mjs:76-98, 109-111, 120-131, 137, 149` | 0.6 이동: 새 dir W, category rmdir, active 변환, index·summary 생성 | W | L |
| `migrate.mjs:173-190` `find06Tasks` | 2단 중 handoff는 있고 artifact가 없는 dir | R | **S⑦** L |
| `migrate.mjs:225-226` | artifact 분리 | W | L |
| `migrate.mjs:586-597` `migrateTaskIndexLabels` | `docs/<x>/<x>-task.md` 라벨 치환 | R/W | **S⑧** |
| `migrate.mjs:1029-1035` | adopt-reviews의 artifact·spec | R | I |
| `user-config.mjs:130,…` | "docs/ 경로에 사용할 이름" 프롬프트 | — | O |

범위 밖(task 경로가 아님): `harness.mjs:331`(docs 템플릿 시드 복사), `backup/clone/delete/symlink/upgrade.mjs`의 `MOVE_ITEMS`(`docs` 통째 이동), `doctor.mjs:402,696`, `release.mjs:74`.

### 2.3 표가 보여주는 것

- 헬퍼는 5개(`taskDir`·`handoffRelPaths`·`userIndexRel`·`metaRel`·`contextCardPath`)가 있지만 **파일마다 따로 정의**돼 있습니다. `taskDir`은 1곳에서만 쓰이고, `review.mjs:540`은 같은 이름의 지역 변수로 헬퍼를 가립니다.
- **task 판정 규칙이 스캐너마다 다릅니다:** spec 마커(①③④), meta.json(⑤), "handoff 있음·artifact 없음"(⑦), category 이름(⑥), index 파일(②⑧). 따라서 목록에 나오는 task와 observe가 알아보는 task의 집합이 다를 수 있습니다.
- `active.json.path`는 기록되지만 아무도 읽지 않습니다. 모든 소비자가 `docs/${user}/${task}`를 다시 조립합니다.

---

## 3. 설계안 비교와 추천

| 기준 | **A** 설정형 레이아웃 (`config.docs.layout`) | **B** 이름 접두 공식화 (`<area>-<name>` + `meta.area`) | **C1** area 마커 디렉터리 (`docs/<area>/.harness-area.json`) | **C2** 앱별 하네스 루트 (`--target apps/<app>`) |
|---|---|---|---|---|
| 무설정 바이트 동일 | 가능. 단 전수 헬퍼 경유가 전제 | **구조적으로 보장** — 경로 불변, 새 키는 플래그를 줄 때만 | 가능 — 마커가 없으면 기존 스캔과 같음 | 가능 — opt-in |
| 변경 지점 | 전수표 전체(~60줄/13파일) + config + CLI | task·list·summary·cli-args·harness-task.md·AGENTS 1줄(**~6파일**) | 전수표 전체 + migrate 가드 3곳 + observe 훅 템플릿 | git 호출 3곳에 repo prefix 처리, 훅의 대상 해석, post-commit 다중 루트 |
| 설정이 사는 곳 | `.harness/config.json`은 **gitignore**라 **클론마다 갈림**. 커밋되는 새 파일이 필요 | 없음(`meta.json`은 커밋됨) | 커밋되는 마커 자체가 선언 | 앱마다 init |
| 2단·3단 혼용 | 전역 스위치라 공존하면 스캐너가 양쪽을 다 훑어야 함 → **스위치가 무의미** | 해당 없음 | **자연 지원**: 마커가 있으면 area, 없으면 user | 루트별 독립 |
| migrate | 2→3 이동 필요 → done-on-main의 `git show` 경로와 handoff 링크가 깨짐 | 이동 불필요. 기존 접두 task는 `--area`로 채택 | 이동 불필요(새 task만 3단), 이동은 수동 | 앱 루트로 이동 필요 |
| Codex·Cursor 미러, SessionStart | 훅이 CLI 위임이라 불변. observe HMAC 변경 필요 | **불변** | observe 훅 템플릿 변경(migrate refresh로 전파) | Codex 훅이 `git rev-parse --show-toplevel` 고정이라 앱 루트를 못 찾음 |
| post-commit handoff | 헬퍼 경유로 해결 | **불변** | 헬퍼 경유로 해결 | 훅은 저장소당 1개, cwd=루트라 앱 루트의 활성 task를 못 봄 |
| 비-task 디렉터리 오인 (`docs/decisions/` 등) | 3단 모드에서 `docs/decisions/`가 scope로 읽힘 → allowlist 필요 | 현행과 동일 | **0** — 마커가 있는 dir만 area | 루트별 현행 |
| scope 이름 = user 이름 (`web`) | `docs/web/`가 scope인지 user인지 모호 | 없음 | 마커로 판별, 충돌하면 생성 거부 | 없음 |
| 구버전 CLI가 섞인 팀 | 구 CLI의 `summary --write`가 3단 task를 원장에서 **누락** | 구 CLI는 `area` 키를 무시(무해) | A와 같은 누락 위험 | 루트별 정상 |
| 원안 경로 적합 | 원안 그대로 | 경로가 다름 | 원안 그대로 | 다름 |

### 추천: **1단계(헬퍼 일원화) → 2단계 B**. C1은 트리거가 생길 때만 3단계로 진행하고, A는 기각합니다.

> **확정:** 1단계 → 2단계 B로 종료. C1은 **보류**(아래 트리거가 실제 저장소에서 확인되면 새 스펙으로 재검토).

- **A 기각 근거:** 스위치를 둘 수 있는 기존 파일이 gitignore라 팀 안에서 레이아웃이 갈립니다. 커밋되는 파일로 옮겨도 혼용을 지원하는 순간 스위치가 할 일이 없어집니다. 경로 확장이 정말 필요해지면 선언이 곧 마커인 C1이 A보다 단순하고 안전합니다.
- **C2 기각 근거:** targetDir ≠ git 루트인 경우를 처리하는 코드가 없습니다(`show-toplevel`·`show-prefix` 사용 0건). `commitTouchesOnlyHandoff`(`task.mjs:858`)의 `diff-tree --name-only`는 repo 루트 상대 경로를 내는데, `handoffRelPaths`는 targetDir 상대 경로라 서로 어긋납니다. `remote-task.mjs:46`의 `git show ref:docs/…`도 같은 문제입니다. 이렇게 경로를 바꾸는 확장보다 파급이 넓습니다.
- **B가 충분한 경계** (이 조건이 모두 참이면 B로 끝냅니다):
  1. 앱별 필요가 **목록·묶음·소유권**입니다. CODEOWNERS `docs/*/web-next-*/`와 Actions `paths: docs/*/web-next-*/**`는 glob으로 표현됩니다(두 도구의 공식 문서가 gitignore식 `*`를 지원한다고 명시. 이 스펙에서 실측하지는 않음).
  2. 한 사람의 세션 진입점 `docs/<user>/<user>-handoff.md`가 앱에 상관없이 하나여도 됩니다. `active.json`이 워킹트리당 하나라 A·C1에서도 같습니다.
  3. task 이름이 사용자 안에서 유일하면 충분합니다. 접두가 앱 간 충돌을 막습니다.
- **C1(3단계)로 가야 하는 트리거** (하나라도 해당하면):
  1. glob을 못 쓰고 **디렉터리 prefix를 요구하는 도구**가 있음 — sparse-checkout cone 모드, `git subtree split --prefix docs/<app>`로 앱 문서를 분리, 폴더 단위 권한 동기화(Confluence·Obsidian 공유 등).
  2. 이미 `docs/<app>/<user>/<task>/` 트리가 있어 **이름을 바꾸지 않고 그대로** 채택해야 함.
  3. 앱별 팀이 **앱별 원장 파일**을 커밋하길 요구함(B는 원장 1개에 열을 추가하는 데서 멈춤).

---

## 4. 추천안 상세

### 4.1 1단계 — 경로 해석 헬퍼 `src/task-paths.mjs` (동작 변화 0)

```js
// task 경로의 유일한 조립 지점. 다른 모듈은 'docs' 와 user/task 로 경로를 만들지 않는다.
// rel 은 항상 POSIX('/') — git pathspec·출력·active.json 에 그대로 쓰인다.
export const DOCS_DIR = 'docs';
export const TASK_FILE_KINDS = ['spec.md', 'plan.md', 'handoff.md', 'artifact.md', 'context.md', 'meta.json', 'diagram.html'];

export function taskDirRel({ user, task })            // 'docs/<u>/<t>'
export function taskFileRel(ref, kind)                // 'docs/<u>/<t>/<t>-<kind>'
export function userHandoffRel(user)                  // 'docs/<u>/<u>-handoff.md'
export function userIndexRel(user)                    // summary.mjs 에서 이동
export function taskLabel({ user, task })             // 'u/t' — 출력·원장 키·유래 마커
export function abs(targetDir, rel)                   // join(targetDir, ...rel.split('/'))
// 스캐너: 2단 후보 dir만 낸다. 판정 규칙은 호출자가 predicate 로 준다 —
// 1단계에서 규칙을 통일하면 observe(⑤)의 동작이 바뀌므로 통일은 별도 변경으로 뺀다.
export async function enumerateTaskDirs(targetDir)    // [{ user, task }]
export async function hasSpecMarker(targetDir, ref)
```

> **구현 메모 (1단계, 2026-09-24):** 시그니처는 위 스케치의 `{ user, task }` 객체가 아니라 기존 `metaRel(user, task)` 관례를 따른 위치 인자다. 스캐너는 `enumerateTaskDirs`+predicate 대신 spec 마커 판정까지 담은 `listTaskRefs` 하나로 3벌(①③④)만 합쳤다 — ②⑤⑧은 판정·오류 처리가 달라 순회를 그대로 두고 경로만 헬퍼를 거친다. 전수 조사의 P5 패턴은 `t.user` 형태를 놓쳤고(`session-context.mjs` 재개 목록), 핀 테스트의 정규식은 그것까지 잡는다.

- **경유 대상:** 전수표의 H·I·S①~⑤·⑧·K 전부. 기존 헬퍼 5개는 이 모듈로 옮기고, 원래 모듈에서는 re-export해 import 호환을 유지합니다.
- **예외(경유하지 않음):** L(`findOldTasks`·`find06Tasks`·0.6 이동 로직). 이들은 정의상 **옛 구조**를 서술하므로 새 헬퍼의 모양과 달라야 합니다. 대신 3단계에서 "area 마커 dir은 건너뛴다" 가드를 넣습니다.
- `active.json.path`는 계속 기록합니다(바이트 동일). 소비자는 여전히 읽지 않습니다. 3단계에서 `area` 키가 생기면 헬퍼가 `path`가 아니라 `{area,user,task}`로 계산합니다. 기록된 문자열을 믿는 방식은 손으로 고친 active에 취약하기 때문입니다.
- **구분자:** 현재 코드는 `join`(OS 구분자)과 `/` 리터럴을 섞어 씁니다. POSIX에서는 결과 문자열이 같습니다. Windows에서 `summary.mjs:17,19`는 `\`를 내는데, 헬퍼로 통일하면 `/`가 됩니다. **Windows 동작은 미검증입니다**(§6 R8).

### 4.2 2단계 — B: `--area` 와 `meta.area`

**CLI**

```
harness-team task <name> [--area <area>]
harness-team list [--area <area>]
```

- `<area>`: `^[A-Za-z0-9][A-Za-z0-9_-]*$`(`.` 금지). `<name>`은 반드시 `<area>-`로 시작하고 나머지가 비어 있으면 안 됩니다. 위반하면 exit 1이고 아무것도 쓰지 않습니다(기존 이름 오류와 같은 error packet 형식).
- 새 task + `--area X`: meta에 `area: "X"`를 넣습니다. 경로·active.json·다른 4파일은 **현행 그대로**입니다.
- 기존 task, `--area` 없음: 현행과 완전히 같습니다(activate/reopen).
- 기존 task + `--area X`:
  - `meta.area === X` → 현행 활성화와 같습니다.
  - `meta.area` 없음 + 이름이 `X-`로 시작 → **채택**: meta에 `area` 키만 추가하고 `area adopted: X` 한 줄을 출력합니다. hs-react-monorepo의 기존 접두 task가 이 경로를 탑니다. 판정 창 필드(`firstActivatedAt`·`reopenedAt`)는 건드리지 않습니다.
  - `meta.area === Y ≠ X` → exit 1, 쓰기 없음. area를 조용히 바꾸지 않습니다.
- `cli-args.mjs`: `VALUE_FLAGS`에 `area`를 추가하고, `task`·`list`의 `flags`에 `['area']`를 넣습니다. `scope` 플래그는 재사용하지 않습니다(§8 Q2).

**스키마 diff**

```diff
 // <task>-meta.json (area 는 --area 를 줬을 때만 존재 — 키 부재 = area 없음)
 { "user": "hslee", "task": "web-next-login",
+  "area": "web-next",
   "created": "…", "firstActivatedAt": "…", "status": "open", … }
```

`.harness/active.json` — **변경 없음.** 경로가 그대로라 SessionStart·post-commit·boundary·doctor·observe가 전부 불변입니다.
`.harness/config.json` — **변경 없음.**

**출력 diff (area를 가진 task가 1개 이상일 때만 달라짐)**

```diff
 # list
 * hslee/core-domain
-  hslee/web-next-login
+  hslee/web-next-login  [web-next]
```

```diff
 # docs/task_summary.md — 열은 맨 뒤에 추가한다
-| User | Task | Status | Created |
-|------|------|--------|---------|
-| hslee | web-next-login | 🔄 open | 2026-09-24 |
+| User | Task | Status | Created | Area |
+|------|------|--------|---------|------|
+| hslee | web-next-login | 🔄 open | 2026-09-24 | web-next |
```

맨 뒤에 두는 이유: `SUMMARY_ROW_RE`(`summary.mjs:109-111`)는 앞 4칸만 잡고 `$`로 고정하지 않으므로 역파싱 호환이 유지됩니다. 앞에 두면 `inferLegacyMeta`가 created·done을 잘못 복구합니다. user index(`<u>-task.md`)는 변경하지 않습니다(이름에 접두가 이미 있음).

**템플릿 문구 diff** — `templates/AGENTS.md.hbs`의 task 단위 관리 절과 루트 `AGENTS.md`(동기화는 `tests/agent-files.test.mjs`가 강제)

```diff
 ### task 단위 관리
 모든 작업은 `docs/<user>/<name>/` 아래에서 관리됩니다.
+모노레포에서 앱·서비스별로 묶으려면 `harness-team task <area>-<name> --area <area>`로 만든다 — 경로는 그대로다.
 각 task 디렉토리는 네 파일로 구성:
```

> **구현 메모 (2단계, 2026-09-24): 이 AGENTS 줄은 넣지 않았다.** `main` 의 프로젝트 eager 소계가 17,476 B 로 상한 17,500 B 까지 24 B 뿐이라 한 줄(170 B)도 `tests/agent-files.test.mjs` 의 eager 가드에 걸렸다. 정본(`commands/harness-task.md` 의 "모노레포 area" 절)과 `--help` 로 충분하고, 템플릿을 바꾸지 않으니 소비자 `migrate` 도 필요 없다.

- eager 예산: 약 +150 B입니다. 현재 이 저장소의 프로젝트 소계가 15,968 B이므로 `doctor`로 24 KiB 합계를 확인합니다.
- `commands/harness-task.md`: `--area` 사용법, 채택 규칙, 충돌 시 거부를 적습니다. 정본은 여기 두고 AGENTS에는 트리거 한 줄만 둡니다.

**migrate:** B는 이동이 없습니다. 채택은 `task … --area`가 하므로 새 migrate 단계는 추가하지 않습니다.

### 4.3 3단계(보류) — C1: area 마커 디렉터리

> **보류 (2026-09-24 결정).** 구현 범위가 아니다 — 트리거 발생 시 재검토할 설계 기록이다.

§3의 트리거가 생겼을 때만 진행합니다. B의 `meta.area`를 그대로 이어받으므로 **B → C1은 스키마 변경 없이** 이어집니다.

- **선언:** `docs/<area>/.harness-area.json` = `{ "version": 1 }`(커밋). `--area X`를 쓸 때 이 파일이 있으면 3단, 없으면 B(2단+접두)로 동작합니다. **config 키 없음, 전역 스위치 없음.**
- **경로:** `docs/<area>/<user>/<task>/`. **user handoff와 user index는 `docs/<user>/`에 그대로 둡니다.** 이유는 셋입니다.
  - AGENTS의 세션 시작 프로토콜이 불변입니다.
  - 한 사람의 활성 task는 area와 무관하게 하나입니다.
  - `docs/<area>/<user>/<user>-handoff.md`를 두면 `find06Tasks`가 그 dir을 0.6 task로 오인해 `<user>-artifact.md`를 만듭니다(§6 R2 실측).
- **C1에서는 3단 task 이름에 접두를 요구하지 않습니다**(경로가 area를 담으므로). 단 `<area>-` 접두가 있어도 허용합니다.
- **active.json:** `{ user, task, area?, path, switchedAt }` — `area`는 3단 task일 때만 기록합니다.
- **식별자:**
  - 원장 키: `area ? area/user/task : user/task`
  - HMAC 입력: `area ? area\0user\0task : user\0task`
  - 유래 마커(`rules.mjs:273`): 같은 규칙
  - 무area 문자열은 모두 현행과 같습니다.
- **스캐너:** `enumerateTaskDirs`가 `docs/<x>/`에 마커가 있으면 `docs/<x>/*/*`를 훑고, 없으면 `docs/<x>/*`를 user의 task로 훑습니다. `findOldTasks`·`find06Tasks`·`migrateTaskIndexLabels`는 마커 dir을 건너뜁니다(**같은 릴리스 필수**).
- **충돌 규칙:**
  - `--area X`인데 `docs/X/`가 마커 없이 존재하면 → 거부(`X`가 user일 수 있음).
  - 현재 user 이름이 마커를 가진 area 이름과 같으면 → `task` 거부.
  - `doctor`는 두 경우를 경고합니다.
- **migrate(2→3 이동):** **자동 이동은 지원하지 않습니다.**
  1. done-on-main 판정이 `origin/<default>:<옛 경로>`를 읽어서, 이동이 main에 반영되기 전까지 판정이 조용히 null이 됩니다.
  2. handoff 본문의 옛 경로 링크가 깨집니다.
  3. 병렬 브랜치(D5)가 같은 task를 옛 경로에서 수정 중이면 충돌합니다.

  대신 `git mv docs/<u>/<t> docs/<area>/<u>/<t>` 수동 절차 + meta/active 갱신 절차를 `harness-task.md`에 적습니다. 자동화는 요청이 반복될 때(`/harness-promote` 기준 3회) 따로 검토합니다.

---

## 5. 하위 호환·migrate 정책

| 항목 | 정책 | 근거 | 상태 |
|---|---|---|---|
| 무설정(플래그 미사용·마커 없음) 파일 배치 | 현행과 같은 경로 문자열 | 1단계는 문자열을 한 곳으로 옮길 뿐. B는 경로 불변. C1은 마커가 있을 때만 분기 | 코드 근거만 있음 — **바이트 동일은 미검증** |
| 이미 고정된 출력 | 기존 테스트가 그대로 통과해야 함 | `summary.test.mjs:211,267`(원장 표), `task-templates.test.mjs:167`, `task-done-on-main.test.mjs:31-73`(task stdout·JSON summary), `user-handoff.test.mjs:246,260`(Full Context 경로) | 기준선 970/969 pass 확인 |
| 고정되지 않은 출력 | 1단계 **착수 전에** golden 테스트로 먼저 고정 | `list` stdout, `runTask`가 쓰는 `active.json`·`meta.json` 바이트는 기존 테스트가 고정하지 않음(테스트는 active를 직접 쓰고 meta는 필드 단위로 봄) | **미검증** |
| 기존 레거시 migrate | B: 영향 없음. C1: 마커 dir 제외 가드와 같은 릴리스 | §6 R2·R3 실측 | 가드 필요 |
| 2→3 자동 이동 | 지원하지 않음(§4.3) | — | 결정 대기(§8) |
| 기본 동작 변경 | **없음** — 어느 단계도 기본값을 바꾸지 않음 | — | 사람 인계 조건 해당 없음 |

---

## 6. 리스크

| ID | 리스크 | 해당 안 | 증거 | 완화 |
|---|---|---|---|---|
| R1 | **마커 없는 dir 활성화**: `task hslee --member web-next`가 `docs/web-next/hslee/`(3단의 user dir)를 "기존 task"로 보고 `activated: web-next/hslee`, active.json을 기록. `runTask`가 `exists(dir)`만 봄(`task.mjs:248`) | 현행 결함, 3단 공존 시 악화 | **실측** | 활성화 분기에 spec 마커 확인 추가 — **별도 task로 분리(결정)**. 이 스펙의 1·2단계에 섞지 않는다 |
| R2 | **`find06Tasks` 오인**: `docs/web/hslee/hslee-handoff.md`가 있고 artifact가 없으면 `migrate`가 `docs/web/hslee/hslee-artifact.md` 생성 | C1(user handoff를 area 아래 두면) | **실측** | user handoff를 `docs/<user>/`에 유지 + 마커 dir 제외 |
| R3 | **`findOldTasks` 오인**: user 이름이 `fix`/`feature`면 `docs/web/fix/login/`을 0.6 task로 보고 `docs/web/login/`·`docs/web/web-task.md`·`docs/task_summary.md` 생성 | A·C1 | **실측** (`migrate --yes`) | 마커 dir 제외. A는 막을 방법 없음(A 기각 사유) |
| R4 | 비-task 디렉터리 오인: 3단 모드에서 `docs/decisions/`·`docs/diagrams/`가 scope로 읽힘. 현행 2단에서도 `docs/features/x/x-spec.md`는 user=`features`로 읽힘 | A. 현행은 잠재 | 코드 분석 | C1은 마커가 있는 dir만 area. 현행 잠재 결함은 범위 밖 |
| R5 | 구버전 CLI 혼재 팀: 구 CLI의 `summary --write`가 3단 task를 원장에서 빼고 다시 씀 → 버전 간 flip-flop | A·C1 | 코드 분석(`collectTasks` 2단 고정) | CHANGELOG 첫 줄에 "area 마커를 커밋하기 전에 팀 전원 ≥ 해당 버전", `doctor`가 마커 존재 시 CLI 버전 안내. B는 무해(키 무시) |
| R6 | 미러·훅 드리프트: `observe-tools.mjs`는 소비자에 복사되는 템플릿 → C1의 HMAC 변경은 `migrate` refresh로만 도달. 미갱신 설치본은 3단 task의 관측 ref를 이름으로 못 바꿈(데이터 손실은 아님) | C1 | 코드 분석 | migrate refresh 대상 확인, doctor stale 템플릿 경고(기존 `findStaleTemplates`) |
| R7 | 용어 충돌: `scope` = review 대상(`worktree|diff|task-docs`) | 전 안 | `cli-args.mjs:18,65,87` | `area` 채택(§8 Q2) |
| R8 | 구분자: 헬퍼 통일로 Windows에서 `summary.mjs:17,19`의 `\`가 `/`로 바뀜 | 1단계 | 코드 분석 | Windows 지원 정책 확인 전까지 **미검증**으로 둠 |
| R9 | eager 예산: AGENTS 템플릿 +1줄이 모든 소비자 AGENTS.md에 복사됨 | B·C1 | `MAINTAINING.md` 예산 절 | `doctor` 확인, 절차는 `harness-task.md`에 |
| R10 | 팀 설치본 영향: 1단계는 ① 표면(`src/**`) 리팩터 → 버그가 나면 모든 설치본의 task·done·handoff가 깨짐 | 1단계 | — | golden 테스트 선행 + 기존 스위트 + e2e lifecycle. patch 단독 발행보다 다음 릴리스에 묶음 |
| R11 | B의 접두 모호성: area `web`과 `web-next`가 공존할 때 `web-next-login --area web`이 접두 검사를 통과 | B | 규칙 분석 | `meta.area`가 정본이고 `list`가 `[area]`를 표시하므로 눈에 보임. 막으려면 "더 긴 기존 area와 일치하면 거부" 규칙 추가(선택) |

---

## 7. 단계별 적용안과 완료 조건

### 1단계 — 헬퍼 일원화 (순수 리팩터)

1. **golden 테스트를 먼저 추가합니다.** `tests/task-paths-golden.test.mjs` — tmp git 저장소에서 아래 순서를 실행하고 두 가지를 스냅샷으로 비교합니다.
   - 순서: `task demo` → `list` → plan 체크 → `retro` → 커밋(post-commit 없이 `handoff` 직접 호출) → `done --force` → `summary`
   - 스냅샷 ① `docs/**`·`.harness/active.json`의 전 바이트(ISO 시각·sha는 정규화)
   - 스냅샷 ② 각 명령 stdout
   - **현재 `main`에서 먼저 green이어야 합니다.**
2. `src/task-paths.mjs`를 도입하고, 전수표의 H·I·S①~⑤·⑧·K를 경유시킵니다.
3. 단일 조립 지점 핀 테스트 `tests/task-paths-single-source.test.mjs`를 추가합니다. `src/` 전체에서 P2·P3 패턴 매치가 `src/task-paths.mjs`와 allowlist(`migrate.mjs`의 L 구간)에만 있어야 합니다.

완료 조건:

```bash
npm test                                   # 기준선 969 pass + 신규, 0 fail
node bin/harness-team.mjs doctor
grep -rnE "(join|resolve)\([^)]*'docs', *(user|active\.user|t\.user)|docs/\\\$\{(active\.|c\.|t\.)?user\}" src | grep -v 'src/task-paths.mjs' | grep -v 'src/commands/migrate.mjs'   # 0건 (2026-09-24 main 기준선: 46건)
```

릴리스: ① 표면이지만 동작 변화가 0이므로 다음 기능 릴리스에 묶습니다.

### 2단계 — B (`--area`)

변경 파일: `task.mjs`, `summary.mjs`(meta 템플릿·원장 열), `cli-args.mjs`, `commands/harness-task.md`, `templates/AGENTS.md.hbs` + 루트 `AGENTS.md`, `CHANGELOG.md`.

| fixture | 명령 | 기대 |
|---|---|---|
| 무area 전용 (기존 fixture) | 전 명령 | 1단계 golden과 **바이트 동일** |
| 혼재: `hslee/core-domain` + `hslee/web-next-login`(area) + `docs/decisions/0001.md` + `docs/superpowers/plans/` | `list` | 두 task 모두 표시, 뒤쪽에만 `[web-next]`. decisions·superpowers는 미표시 |
| 〃 | `list --area web-next` | `web-next-login`만 |
| 〃 | `summary` | `Area` 열이 맨 뒤, 무area 행은 빈 칸. `readLedger`로 재파싱해도 created·status 보존 |
| 〃 | `task web-next-login`(플래그 없음) | 현행 activate, meta 불변 |
| 〃 | `task web-next-login --area admin` | exit 1, 파일 변경 0 |
| 〃 | `task login --area web-next` | exit 1(접두 위반), dir 미생성 |
| 기존 접두 task(meta.area 없음) | `task web-next-x --area web-next` | `area adopted`, meta에 `area`만 추가, 판정 창 필드 불변 |
| 〃 | `done`·`handoff`·`session-context`·`boundary check`·`doctor` | 현행과 동일(경로 불변) — 기존 테스트로 충분 |

완료 조건:

```bash
npm test
node bin/harness-team.mjs doctor           # eager 예산 포함
node bin/harness-team.mjs release --dry-run
```

`harness-sim`: **넣지 않습니다.** 에이전트 행동 표면 변화가 AGENTS 1줄 + 커맨드 문서뿐이고, 훅·SessionStart 경로는 불변입니다. 릴리스 크기는 minor(플래그 추가)입니다.

### 3단계(보류) — C1

> **보류 (2026-09-24 결정).** 아래는 재검토 시 출발점으로 남긴다.

착수 조건: §3의 트리거 1개 이상이 실제 저장소에서 확인됨.

| 혼재 fixture 항목 | 명령 | 기대 |
|---|---|---|
| `docs/hslee/core-domain/`(2단) | 전 명령 | golden 바이트 동일 |
| `docs/web/.harness-area.json` + `docs/web/hslee/login/` | `list`·`summary`·`session-context` | `web/hslee/login` 표시·재개 후보 |
| 〃 | `task login --area web` → 커밋 | post-commit이 `docs/web/hslee/login/login-handoff.md`와 `docs/hslee/hslee-handoff.md`를 갱신 |
| 〃 | plan 체크 Edit | `boundary checkpoint`가 3단 plan을 대조 |
| 〃 | `done` | 가드가 3단 spec·plan·artifact를 읽음. handoff 제외 집합이 repo 상대 3단 경로 |
| `docs/decisions/`, `docs/features/x/x-spec.md` | `list` | decisions 미표시, features는 **현행과 동일하게** user로 표시(범위 밖 결함 유지) |
| user `fix` 아래 3단 task | `migrate --yes` | **파일 변경 0**(R3 회귀) |
| `docs/web/`가 마커 없이 user dir | `task x --area web` | exit 1 |
| origin/main에 3단 meta가 done | `session-context` | done-on-main nudge가 3단 경로로 판정 |

`harness-sim`: **넣습니다** — 1 시나리오(SessionStart 주입 → plan 체크 → 커밋 → post-commit handoff → done). 경로 헬퍼가 프로세스 경계(Claude 훅·git 훅)를 넘어 일관되는지는 단위 테스트로 증명되지 않습니다.

완료 조건: 위 3명령 + `/harness-sim run` 리포트 PASS. CHANGELOG 첫 줄에 구버전 혼재 경고(R5)를 적습니다.

---

## 8. 사용자에게 묻는 질문

| # | 질문 | 상태 |
|---|---|---|
| 1 | 확장을 B에서 멈출까? | **확정: B에서 멈춤** (2026-09-24). C1은 보류 |
| 2 | CLI 용어 | **확정: `area`** — `--area`, `meta.area`, (보류된 C1의 마커명 `.harness-area.json`) |
| 3 | 어디에 올릴까? 1단계는 팀 저장소 bd-makers/team-harness 권장. 2단계(B)는 팀 공용으로 올릴지, 개인 fork·로컬 패치로 먼저 검증할지 | **미결** |
| 4 | R1(마커 없는 dir 활성화)을 분리할까? | **확정: 별도 task로 분리.** observe 스캐너의 판정 불일치(meta.json 기준)는 1단계가 predicate를 그대로 보존하므로(§4.1) 자연히 범위 밖 — 따로 다룰지는 후속 판단 |
| 5 | (C1) user handoff를 `docs/<user>/`에 둘까? | **해당 없음** — C1 보류 |
