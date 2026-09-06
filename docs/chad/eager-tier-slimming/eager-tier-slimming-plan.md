# eager-tier-slimming — Plan

> **실행자에게:** 이 plan은 `superpowers:executing-plans`(inline) 또는
> `superpowers:subagent-driven-development`로 태스크 단위 실행한다. `## 단계`의 체크박스는
> `harness-team done` 가드의 입력이므로 **실제로 끝난 것만** `- [x]`로 켠다.

## 목표

프로젝트 eager 소계(`AGENTS.md` + `CLAUDE.md`)를 **19,327 B → 17,500 B 이하**로 줄인다.
삭제가 아니라 이전이다 — 절차 본문은 lazy 정본으로 가고 eager에는 트리거만 남는다.

**Spec:** `docs/chad/eager-tier-slimming/eager-tier-slimming-spec.md` (요구·제약·Ontology의 정본)

**접근:** 선행 task `instruction-structure`의 판별 기준("트리거를 컨텍스트 없이 인지할 수 있는가")을
재적용한다. T1이 상한 가드를 세워 RED를 만들고, T2~T5가 절별로 줄이며, T6에서 GREEN과 정보 소실 0을 확인한다.

## Global Constraints

- **정보 소실 0** — 옮긴 문장은 도착지에 존재해야 한다. T6의 대조표로 증명한다.
- **에이전트 중립** — `commands/*.md`는 Claude 전용 표면이다. Codex·Cursor에 도달하는 lazy 표면은
  `skills/<name>/SKILL.md`와 `templates/**`뿐이므로, 도구 중립이 필요한 규칙은 eager에 요약을 남긴다.
- **상황 인식형 규칙은 이전하지 않는다** — CLAUDE.md `### 5-A 복잡도 게이트`, AGENTS.md `### JIT retrieval 프로토콜`.
- **수정 기점은 `templates/*.hbs`** — 루트 `AGENTS.md`·`CLAUDE.md`의 마커 절을 동일 내용으로 갱신한다.
  `tests/agent-files.test.mjs`의 드리프트 테스트가 강제한다.
- **목표는 프로젝트 소계로만 잰다** — 전역 `~/.claude/CLAUDE.md`는 사용자 소유·머신 의존이라 제외.
  `doctor`의 합계 경고(24 KiB)는 이 task가 바꾸지 않는다.
- 검증 3종은 매 태스크 끝에 돈다: `npm test` · `node bin/harness-team.mjs doctor` · `npm run docs:check`.

## 단계

### Task 1: 프로젝트 eager 소계 상한 가드

**Files:**
- Modify: `tests/agent-files.test.mjs` (파일 끝에 테스트 추가)

**Interfaces:**
- Produces: 상수 `PROJECT_EAGER_MAX_BYTES = 17_500`과 실패 메시지의 파일별 내역 —
  T2~T5는 이 테스트의 출력으로 진척을 잰다.

- [x] **Step 1: 실패하는 테스트를 쓴다**

```js
// 프로젝트 eager 소계 상한. doctor는 전역 CLAUDE.md까지 더한 합계(24 KiB)를 재지만,
// 전역 파일은 사용자 소유·머신 의존이라 레포 목표로 삼을 수 없다. 이 가드는
// 레포에 고정된 부분만 잰다 — 규칙을 더 쓸 여유가 남아 있는지가 판정 대상이다.
const PROJECT_EAGER_MAX_BYTES = 17_500;

test('프로젝트 eager 소계가 상한을 넘지 않는다', async () => {
  const files = ['AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md'];
  const sizes = [];
  for (const f of files) {
    try { sizes.push([f, Buffer.byteLength(await readFile(join(ROOT, f), 'utf8'))]); }
    catch { /* 없는 파일은 0으로 친다 — 이 저장소에는 .claude/CLAUDE.md가 없다 */ }
  }
  const total = sizes.reduce((n, [, b]) => n + b, 0);
  assert.ok(total <= PROJECT_EAGER_MAX_BYTES,
    `프로젝트 eager 소계 ${total} B > ${PROJECT_EAGER_MAX_BYTES} B — 내역: ` +
    sizes.map(([f, b]) => `${f} ${b} B`).join(' + '));
});
```

- [x] **Step 2: 실패를 확인한다**

Run: `node --test tests/agent-files.test.mjs`
Expected: FAIL — `프로젝트 eager 소계 19327 B > 17500 B — 내역: AGENTS.md 13215 B + CLAUDE.md 6112 B`

- [x] **Step 3: 커밋**

```bash
git add tests/agent-files.test.mjs
git commit -m "test(agents): 프로젝트 eager 소계 상한 가드 추가 (RED)"
```

### Task 2: `### task 단위 관리` — meta.json 상세를 lazy로

**Files:**
- Modify: `templates/AGENTS.md.hbs` · `AGENTS.md` (`### task 단위 관리`, 현재 2,433 B)
- Modify: `commands/harness-task.md` (도착지 — 이미 `reopened:` 분기를 서술 중)

**목표 감축:** 약 800 B

- [x] **Step 1: 이전 대상을 고른다**

eager에 남길 것(도구 중립 필요): SSOT 4파일 목록 · `.harness/active.json` · `meta.json`은 harness 소유라
손대지 않는다는 금지 · 완료 상태가 재활성화로 만료된다는 **사실 한 줄** · 집계 파일은 생성물이라는 규칙.

lazy로 옮길 것(트리거 = `harness-team task`/`done` 실행): 판정 창 계산식(`reopenedAt || firstActivatedAt`) ·
`firstActivatedAt`의 "생성 시 1회" 불변식 · 열린 task 사이 재활성화가 meta를 건드리지 않는다는 상세 ·
`activated:`/`reopened:` 출력 구분의 이유.

- [x] **Step 2: `commands/harness-task.md`에 도착지 절이 있는지 확인하고, 없으면 만든다**

Run: `grep -n "reopened\|판정 창\|firstActivatedAt" commands/harness-task.md`
없는 항목만 추가한다. 이미 있으면 중복 서술을 만들지 않는다.

- [x] **Step 3: `templates/AGENTS.md.hbs`의 해당 절을 줄인다**

- [x] **Step 4: 루트 `AGENTS.md`의 같은 절을 동일 내용으로 갱신한다**

- [x] **Step 5: 드리프트·소계 확인**

```bash
node --test tests/agent-files.test.mjs
```
Expected: 드리프트 테스트 PASS, 소계 테스트는 여전히 FAIL(수치가 줄어야 함 — 약 18,500 B)

- [x] **Step 6: 커밋**

```bash
git add templates/AGENTS.md.hbs AGENTS.md commands/harness-task.md
git commit -m "docs(agents): task 단위 관리의 meta 판정 창 상세를 명령 문서로 이전"
```

### Task 3: `### task 워크플로우` — 다이어그램 옵트인 압축

**Files:**
- Modify: `templates/AGENTS.md.hbs` · `AGENTS.md` (`### task 워크플로우`, 현재 2,106 B)

**Interfaces:**
- Consumes: T2가 확립한 "정본은 `commands/harness-task.md`" 패턴.

**목표 감축:** 약 550 B

- [ ] **Step 1: 현재 다이어그램 문단이 "요약"인지 확인한다**

Run: `sed -n '/다이어그램(옵트인)/,/^- \*\*진행\*\*/p' AGENTS.md | wc -c`
선행 task가 "도구 중립 요약 1블록"으로 정리했으나 그 블록이 여전히 길다는 것이 이 단계의 전제다.

- [ ] **Step 2: eager에 남길 세 문장만 남긴다**

남길 것: ① 신규 생성 직후 1회만 묻는다 ② **plan.md에 그 단계가 있는지가 곧 상태다**
③ 도구가 없으면 실패시키지 말고 사유를 붙여 닫는다. 나머지(산출물 경로·inline SVG 이유·Obsidian
script 제거·SSOT 4파일 아님)는 `commands/harness-task.md`가 이미 전부 서술하므로 삭제한다.

- [ ] **Step 3: 루트 `AGENTS.md` 동기화 후 확인**

```bash
node --test tests/agent-files.test.mjs
```
Expected: 드리프트 PASS, 소계 약 17,950 B

- [ ] **Step 4: 커밋**

```bash
git add templates/AGENTS.md.hbs AGENTS.md
git commit -m "docs(agents): 다이어그램 옵트인 서술을 트리거 세 문장으로 축약"
```

### Task 4: `## AI 팀 역할 분담` — D 요약 압축

**Files:**
- Modify: `templates/AGENTS.md.hbs` · `AGENTS.md` (`## AI 팀 역할 분담`, 현재 2,042 B)

**목표 감축:** 약 450 B

- [ ] **Step 1: 정본 도달성을 확인한다**

Run: `ls templates/docs/decisions.md && grep -n "^## D" docs/decisions.md`
`templates/docs/decisions.md`가 스캐폴드되므로 소비자 프로젝트도 전문을 갖는다 — 에이전트 중립 제약을 만족한다.

- [ ] **Step 2: D2·D4~D7 요약을 각 1줄로 줄인다**

역할표(3행)와 리뷰 프로토콜은 그대로 둔다. D 요약은 "무엇을 정했는가"만 남기고 근거·이력·예시는
`docs/decisions.md`에 맡긴다. 포인터 문장("전문·근거·이력은 `docs/decisions.md`가 정본이다")은 유지한다.

- [ ] **Step 3: 루트 동기화 후 확인**

```bash
node --test tests/agent-files.test.mjs
```
Expected: 드리프트 PASS, 소계 약 17,500 B (경계선)

- [ ] **Step 4: 커밋**

```bash
git add templates/AGENTS.md.hbs AGENTS.md
git commit -m "docs(agents): D 규범 요약을 1줄씩으로 압축 — 전문은 decisions.md"
```

### Task 5: 잔여 압축 — 목표 미달 시에만

**Files:**
- Modify: `templates/AGENTS.md.hbs` · `AGENTS.md` (`### Task Context Card (TCC)`, 1,105 B)
- Modify (선택): `templates/CLAUDE.md.hbs` · `CLAUDE.md` (`### 5-A` escalation 패킷 5항목, 1,909 B)

- [ ] **Step 1: T4 이후 소계를 잰다**

```bash
node --test tests/agent-files.test.mjs
```
17,500 B 이하면 이 태스크는 **수행하지 않고** 사유를 붙여 닫는다:
`- [x] Task 5 — 미실행(T4에서 목표 달성)`. 지우지 않는다 — 판단 이력이 사라진다.

- [ ] **Step 2: 미달이면 TCC 절의 잔여 산문을 줄인다**

한도 수치(6 KiB·100행·capsule 3개)는 남긴다 — `context check`의 실패 메시지가 알려주지만,
쓰기 전에 알아야 하는 값이다. 줄일 것은 갱신 시점 나열과 금지 항목의 예시다.

- [ ] **Step 3: 그래도 미달이면 CLAUDE.md `### 5-A`의 패킷 5항목 설명을 줄인다**

**항목 이름 다섯(결정 요청·권장안·시도한 대안·기다림의 비용·안전 기본값)은 남긴다.**
줄일 것은 `**Why:**`/`**How to apply:**` 문단이다 — 그 근거는 `docs/decisions.md`와
`--json` 엔벨로프 계약이 이미 갖고 있다. 5-A 자체는 상황 인식형이라 이전하지 않는다.

- [ ] **Step 4: 커밋**

```bash
git add -u && git commit -m "docs(agents): 잔여 산문 압축 — 목표 소계 달성"
```

### Task 6: 검증과 기록

**Files:**
- Create/Modify: `docs/chad/eager-tier-slimming/eager-tier-slimming-artifact.md`

- [ ] **Step 1: 검증 3종을 돌린다**

```bash
npm test && node bin/harness-team.mjs doctor && npm run docs:check
```
Expected: 소계 테스트 PASS · doctor 무경고 · docs:check 최신

- [ ] **Step 2: 정보 소실 0 대조표를 artifact에 쓴다**

옮긴 항목마다 한 행: `옮긴 내용 | 출발(절) | 도착(파일:절) | 확인 방법(grep 명령)`.
도착지를 grep으로 실제 확인한 결과만 적는다 — 옮겼다고 기억하는 것은 증거가 아니다.

- [ ] **Step 3: 전후 바이트 표를 artifact에 쓴다**

절별 before/after와 소계. 측정은 spec의 표와 같은 방법으로 한다.

- [ ] **Step 4: 외부 리뷰를 받는다** (Done evidence `review: required`)

```bash
/harness-review codex
```
발견은 재현·판별 후 반영하고, 결과를 artifact의 `## Reviews`에 날짜와 함께 남긴다.

- [ ] **Step 5: 커밋**

```bash
git add -u && git commit -m "docs(task): eager-tier-slimming 검증 결과·대조표 기록"
```

## Ontology 변경 로그

- (2026-09-07, T2에서 정정) **에이전트 중립 표면** — 해당 에이전트가 규칙을 **필요로 하는 시점에**
  도달할 수 있는 표면. 처음에는 `commands/*.md`를 Claude 전용으로 봤으나, Codex 미러가
  `../../commands/<name>.md`를 읽으라고 지시하므로 Codex에도 도달한다. 상한을 정하는 것은
  **Cursor**의 도달 범위(`AGENTS.md`·`.cursor/rules`)이며, Cursor는 명령을 실행하지 않는다.
- (2026-09-07) **예산 여유(headroom)** — 상한 − 현재 소계. 이 task의 판정 대상은 감축량이 아니라 여유다.

## 참고

- Spec: `docs/chad/eager-tier-slimming/eager-tier-slimming-spec.md`
- 선행 task(어휘·판별 기준 정본): `docs/chad/instruction-structure/instruction-structure-spec.md`
- 드리프트 강제: `tests/agent-files.test.mjs` — 템플릿과 루트 파일의 마커 절 동일성
- 회귀 실측: v0.32.2가 예산을 64 B 초과한 채 발행(`683400e`) → 축약 복구(`b0f842a`) → 절차에 doctor 추가(`e805b5d`)
