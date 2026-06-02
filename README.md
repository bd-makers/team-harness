# harness-aijient-team

> **Claude 메인 + Codex · Gemini · Cursor · OpenCode** — 다섯 AI 에이전트를 하나의 프로젝트에서 협업시키는 팀용 하네스 플러그인.

프로젝트에 통일된 멀티 에이전트 설정을 **새로 scaffold**하거나 **기존 repo에 비파괴적으로 적용**합니다.
`CLAUDE.md`를 단일 진실의 원천(SSOT)으로 삼고, 나머지 에이전트 설정 파일은 모두 symlink 또는 참조로 연결되어 drift가 없습니다.

---

## 목차
- [왜 필요한가](#왜-필요한가)
- [빠른 시작](#빠른-시작)
- [설치](#설치)
- [명령어 레퍼런스](#명령어-레퍼런스)
- [task 관리 (팀원·기능별)](#task-관리-팀원기능별)
- [스크립트 3종 사용법](#스크립트-3종-사용법)
- [설치 결과물](#설치-결과물)
- [CLAUDE.md 섹션 마커](#claudemd-섹션-마커)
- [문서 (HTML)](#문서-html)
- [개발 / 기여](#개발--기여)
  - [버전 범프 체크리스트](#버전-범프-체크리스트)
- [변경 이력](#변경-이력)

---

## 왜 필요한가

에이전트마다 설정 파일 위치·형식이 다릅니다:

| 에이전트 | 읽는 파일 |
|---|---|
| Claude Code | `CLAUDE.md`, `.claude/` |
| Codex | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `.cursorrules`, `.cursor/rules/*.mdc` |
| OpenCode | `AGENTS.md`, `opencode.json` |

각각 관리하면 동기화 지옥이 됩니다. 이 플러그인은:

- `CLAUDE.md`를 원본으로 두고 `AGENTS.md` / `GEMINI.md` / `.cursorrules`는 symlink
- `.claude/rules/*.md`를 원본으로 `.cursor/rules/*.mdc`를 자동 미러링
- `opencode.json`은 `.claude/skills/*/SKILL.md`를 **참조**(복사 아님)
- Codex/Gemini는 read-only 리뷰어로 Bash를 통해 호출 (first-token 매칭 규칙 준수)
- 작업은 `docs/<member>/<name>/` 구조로 팀원·task별 격리

결과: 규칙·스킬을 한 곳에서 편집하면 모든 에이전트가 같은 내용을 읽고, 팀원이 서로의 작업에 간섭하지 않습니다.

---

## 빠른 시작

```bash
# 1. 플러그인 설치 (Claude Code)
/plugin marketplace add https://github.com/bd-makers/team-harness
/plugin install harness-aijient-team

# 2. 프로젝트에 적용
cd my-project
/harness-apply        # 기존 프로젝트면 (비파괴 병합)
# 또는
/harness-init         # 빈 디렉토리면

# 3. 첫 작업 시작
/harness-task user-auth
# → docs/<your-name>/user-auth/{user-auth-spec.md, user-auth-plan.md, user-auth-handoff.md} 생성
# → .harness/active.json이 이 task를 가리킴

# 4. 세션 종료 전
/harness-task done    # 활성 task 완료 처리 (handoff.md 갱신, task_summary 반영)
```

---

## 설치

### 방법 A: Claude Code 플러그인 (권장)

```
/plugin marketplace add https://github.com/bd-makers/team-harness
/plugin install harness-aijient-team
```

설치 후 다음 슬래시 명령 사용 가능:

| 명령 | 용도 |
|---|---|
| `/harness-init` | 신규 프로젝트 scaffold |
| `/harness-apply` | 기존 프로젝트에 비파괴 적용 |
| `/harness-sync` | 내부 symlink/mirror 재동기화 |
| `/harness-doctor` | 무결성 점검 |
| `/harness-task` | task 관리 (task/list/done/handoff) |
| `/harness-clone` | project → backup dir 동기화 |
| `/harness-symlink` | backup dir → project symlink 생성 |
| `/harness-delete` | project에서 harness symlink/파일 제거 |
| `/harness-migrate` | v0.2.x 스크립트 → v0.3+ 위치 이전 |
| `/harness-upgrade` | v0.3.x 실제 파일 → v0.4+ symlink 원스텝 전환 |
| `/harness-retro` | 활성 task의 artifact.md에 학습/교정 내용 append (자기개선 루프) |

### 방법 B: 독립 CLI

npm 배포 후:
```bash
npx harness-team <command>
```

로컬 개발:
```bash
git clone <this-repo>
cd harness-aijient-team-plugin
npm link          # 전역에 harness-team 명령 등록
harness-team --help
```

---

## 명령어 레퍼런스

### `/harness-init` — 신규 scaffold

빈 디렉토리 또는 이미 `package.json`만 있는 프로젝트에 전체 하네스 설치.

```bash
/harness-init                          # 스택 자동 탐지
/harness-init --stack next             # 명시적 지정
/harness-init --yes                    # 비대화식 (diff 확인 건너뜀)
```

스택 옵션: `react-native` | `react` | `next` | `node` | `python` | `generic`

### `/harness-apply` — 기존 프로젝트에 비파괴 적용

기존 `CLAUDE.md`, `.claude/settings.json` 등이 있는 repo에 하네스를 **안전하게** 추가합니다.

동작:
1. 기존 파일 탐지 & 파싱
2. HTML 주석 마커(`<!-- harness:section="..." -->`) 섹션만 교체/추가
3. JSON은 deep-merge (배열은 union, 중복 제거)
4. hooks/rules는 덮지 않고 건너뜀
5. Diff를 보여주고 `[y/N]` 확인 → 승인 시 적용

```bash
/harness-apply                  # 대화식 (diff 확인 후 승인)
/harness-apply --yes            # 비대화식 (CI에서 사용)
```

### `/harness-sync` — 내부 정합성 동기화

프로젝트 **내부** symlink/mirror를 재생성. symlink가 깨졌거나 rules를 수정했을 때 실행.

```bash
/harness-sync
```

수행:
- `AGENTS.md`, `GEMINI.md`, `.cursorrules` → `CLAUDE.md` symlink 재확인/재생성
- `.claude/rules/*.md` → `.cursor/rules/*.mdc` 미러링 갱신

> ⚠️ `symlink.sh` 와는 **다른 기능**입니다. 아래 [스크립트 3종](#스크립트-3종-사용법) 참조.

### `/harness-doctor` — 무결성 점검

symlink · JSON 유효성 · 실행 권한 체크.

```bash
/harness-doctor
```

문제가 있으면 exit 1 + 문제 항목 리포트.

### `/harness-task` — task 관리

아래 [task 관리](#task-관리-팀원기능별) 섹션 참조.

### `/harness-clone` — project → backup dir 동기화

프로젝트 파일을 백업 디렉토리로 복사(merge, newer-wins). 이미 harness symlink인 항목은 건너뜁니다.

```bash
/harness-clone
/harness-clone --backup-dir ~/my-backups/project-a
```

### `/harness-symlink` — backup dir → project symlink 생성

백업 디렉토리의 harness 아티팩트를 프로젝트 루트로 symlink합니다.

```bash
/harness-symlink
/harness-symlink --backup-dir ~/my-backups/project-a
```

### `/harness-delete` — harness symlink/파일 제거

프로젝트 루트에서 harness 항목을 제거합니다.

```bash
/harness-delete                      # symlink만 제거 (기본)
/harness-delete --include-real       # 실제 파일/디렉토리도 삭제 (구버전 마이그레이션용)
/harness-delete --yes                # 비대화식
```

`--include-real`은 구버전(파일이 symlink가 아닌 실제 파일로 존재)에서 신버전으로 전환할 때 사용합니다.

### `/harness-migrate` — v0.2.x → v0.3+ 스크립트 위치 이전

v0.2.x에서 backup dir에 있던 `clone.sh`, `symlink.sh`, `delete.sh`를 프로젝트 루트로 이전합니다.

```bash
/harness-migrate
```

### `/harness-upgrade` — v0.3.x → v0.4+ 원스텝 전환

실제 파일로 존재하는 harness 아티팩트를 symlink 구조로 일괄 전환합니다.

```bash
/harness-upgrade                            # backup dir 자동 탐지
/harness-upgrade --backup-dir ~/backups/p   # 경로 명시 (tilde 지원)
/harness-upgrade --yes                      # 비대화식
```

내부 동작 순서:
1. backup dir 확인 (없으면 clone 먼저 실행)
2. project → backup 동기화 (`/harness-clone`)
3. 실제 파일/디렉토리 목록 표시 + 확인
4. 실제 항목 삭제 (`.harness/backup.json` 내용 보존)
5. `.harness/backup.json` 복원
6. symlink 생성 (`/harness-symlink`)

---

## task 관리 (팀원·task별)

모든 작업은 팀원별·task별로 격리된 디렉토리에서 관리됩니다.

### 디렉토리 구조

```
docs/
├── task_summary.md                # 전체 task 요약 (User | Task | Status | Created)
└── <member>/                      # git config user.name → $USER → --member
    ├── <member>-task.md           # 이 멤버의 Active / Completed 인덱스
    └── <task-name>/
        ├── <task-name>-spec.md    # 요구사항 / 설계 (사람이 먼저 작성)
        ├── <task-name>-plan.md    # 단계별 체크리스트
        └── <task-name>-handoff.md # 세션 인수인계 (post-commit hook으로 갱신)
```

활성 task 포인터: `.harness/active.json` (gitignored).

### member 식별 규칙

1. `--member <name>` 플래그 (최우선)
2. `git config user.name` (프로젝트 git 설정)
3. `$USER` / `$USERNAME` 환경변수
4. fallback: `unknown`

공백은 `-`로, 특수문자는 제거됩니다 (예: `Chad Lee` → `Chad-Lee`).

### 명령어

```bash
# 생성 또는 활성화 (동일 이름이 이미 있으면 그 task를 active로 전환)
/harness-task <name>                   # ex: user-auth

# 목록 (* = active)
/harness-task list

# 활성 task 완료 — task_summary.md / <member>-task.md 상태 갱신
/harness-task done

# 활성 task의 handoff.md를 최신 커밋 정보로 갱신 (post-commit hook이 자동 호출)
/harness-task handoff
```

> `feature/` · `fix/` 같은 중간 카테고리는 사용하지 않는다 — 모든 task는 `docs/<member>/<name>/` 평탄 구조로 관리한다.

### 실전 예제

```bash
# 팀원 A: 인증 리디자인 시작
$ /harness-task auth-redesign
created: docs/chad/auth-redesign/
active: chad/auth-redesign

# spec.md에 요구사항 작성 (에디터로)
$ vim docs/chad/auth-redesign/auth-redesign-spec.md

# 코드 작성 + plan.md 체크리스트 갱신
# ...

# 세션 종료
$ /harness-task done

# 다음 날 다른 task로 전환 (같은 명령으로 생성 또는 활성화)
$ /harness-task token-refresh-race
$ /harness-task list
  chad/auth-redesign
* chad/token-refresh-race
```

---

## 스크립트 3종 사용법

`harness-team init/apply` 실행 시 **프로젝트 루트에** 설치되는 세 스크립트입니다. 백업 클론 폴더(`BACKUP_DIR`)는 프로젝트와 같은 레벨의 형제 폴더 아래에 위치하며, 그 경로는 생성 시점에 각 스크립트에 박혀 들어갑니다.

### 설치 구조

```
~/work/
  ├── project-a/                  ← 실제 작업 디렉토리 (CWD)
  │   ├── CLAUDE.md
  │   ├── .claude/
  │   ├── clone.sh                ← 스크립트는 프로젝트 루트에 위치
  │   ├── symlink.sh
  │   ├── delete.sh
  │   └── .harness/backup.json    ← 백업 경로 기억
  │
  └── harness-backup/             ← 형제 레벨 상위 폴더 (이름 사용자 지정)
      └── project-a/              ← BACKUP_DIR (clone.sh가 여기에 복사)
```

실제 사용 방식 (프로젝트 루트에서 실행):

```bash
cd ~/work/project-a
./clone.sh     # project-a → BACKUP_DIR 로 병합 복사 (newer-wins, 백업 파일 삭제 없음)
./symlink.sh   # BACKUP_DIR 의 자산을 project-a 로 symlink
./delete.sh    # BACKUP_DIR 을 가리키는 symlink만 제거
```

### 안전 원칙 — 어느 스크립트도 파괴적이지 않음

- **백업 디렉토리는 어떤 스크립트도 삭제하지 않습니다.** 원본 파일들(CLAUDE.md, docs 등)은 항상 보존됩니다.
- **프로젝트 쪽 실파일도 함부로 지우지 않습니다.** symlink만 다룹니다.
- 실파일을 정말 제거하려면 인터랙티브 CLI(`harness-team delete --include-real`)를 사용하세요.

### init 시 설정

`harness-team init` 실행 시 상위 폴더명을 입력받습니다(기본값: `harness-backup`):

```
$ harness-team init
harness-team init → /Users/chad/work/project-a
  stack: react-native (rn)

Backup clone parent folder (sibling of project, holds clone.sh/symlink.sh/delete.sh)? [harness-backup] my-backups
  backup clone dir: /Users/chad/work/my-backups/project-a
...
```

- 입력한 이름대로 `../<입력값>/<프로젝트명>/` 디렉토리가 자동 생성됩니다.
- 경로는 `.harness/backup.json` 에 저장되어 이후 `doctor` 등에서 재사용됩니다.
- 비대화(`--yes`) 실행 시 `--backup-parent=<name>` 으로 지정할 수 있습니다.

### 언제 쓰나?

플러그인만 쓰는 경우 이 스크립트는 **불필요**합니다. 다음과 같은 경우에만 유용:

- 같은 팀이 여러 관련 프로젝트(예: `web-app`, `mobile-app`, `admin`)를 운영
- 프로젝트 스냅샷/백업을 별도 디렉토리로 주기적으로 떠두고 싶음
- 여러 프로젝트가 공통 harness 내용을 공유하고 한쪽의 개선을 다른 쪽으로 역동기화

### `symlink.sh` — BACKUP_DIR → 프로젝트로 심볼릭 링크

**용도**: BACKUP_DIR의 자산을 프로젝트 루트에 symlink로 연결.

링크 대상(ITEMS):
`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.claude`, `.cursor`, `.opencode`, `.cursorrules`, `docs`, `.harness`

**사용 예**:
```bash
cd ~/work/project-a
./symlink.sh
# 출력:
#   linked: CLAUDE.md -> /Users/chad/work/harness-backup/project-a/CLAUDE.md
#   linked: .claude -> /Users/chad/work/harness-backup/project-a/.claude
#   ...
```

**안전장치**:
- 이미 BACKUP_DIR로 링크된 항목은 건너뜀
- 다른 곳을 가리키는 symlink는 즉시 교체 (실파일 손실 없음)
- 프로젝트 쪽 실파일이 있을 때:
  - 백업본과 **byte-identical** 이면 symlink로 교체
  - **다르면 건드리지 않고 skip** — `./clone.sh`로 백업에 병합 후 재실행하라고 안내

### `clone.sh` — 프로젝트 → BACKUP_DIR 병합 복사

**용도**: 프로젝트 현재 내용을 BACKUP_DIR에 **병합 복사**. `rsync -a --update` 기반(newer-wins, **`--delete` 없음**), 백업에만 있는 파일은 보존됩니다.

**사용 예**:
```bash
cd ~/work/project-a
./clone.sh
# 출력:
#   merged dir: .claude -> /Users/chad/work/harness-backup/project-a/.claude
#   copied (newer): CLAUDE.md -> /Users/chad/work/harness-backup/project-a/CLAUDE.md
#   ...
```

### `delete.sh` — 링크 제거 (init의 정반대)

**용도**: `symlink.sh`가 만든 링크만 제거. 백업 디렉토리와 프로젝트의 실파일은 모두 보존합니다.

**사용 예**:
```bash
cd ~/work/project-a
./delete.sh
# 출력:
#   removed: CLAUDE.md (backup symlink)
#   removed: .claude (backup symlink)
#   skip: docs (real file/dir — use 'harness-team delete --include-real' to remove)
```

**안전장치**:
- BACKUP_DIR을 가리키는 symlink만 제거 (`[[ "$target" == "$BACKUP_DIR"* ]]` 체크)
- 다른 곳을 가리키는 symlink는 건드리지 않음
- 실파일/디렉터리는 skip + 안내. 실제로 지우려면 인터랙티브 CLI(`harness-team delete --include-real`) 사용

### `/harness-sync` vs `./symlink.sh` — 한 줄 요약

| | `/harness-sync` | `./symlink.sh` |
|---|---|---|
| 대상 | 같은 프로젝트 내부 (`CLAUDE.md` 등 SSOT) | 외부 중앙 harness repo |
| 목적 | 플러그인이 설치한 구조의 무결성 유지 | 여러 프로젝트가 하나의 harness를 공유 |
| 주요 작업 | `AGENTS.md → CLAUDE.md` (같은 폴더), `.cursor/rules` 미러링 | 중앙의 `CLAUDE.md`, `.claude`, `docs` 등을 현재 프로젝트로 심볼릭 링크 |
| 언제 | symlink이 깨졌을 때, rules 수정 후 | 중앙 harness를 새 프로젝트에 적용할 때 |

---

## 설치 결과물

```
my-project/
├── CLAUDE.md                 # 단일 진실의 원천 (stack/roles/protocol 섹션)
├── AGENTS.md     -> CLAUDE.md
├── GEMINI.md     -> CLAUDE.md
├── .cursorrules  -> CLAUDE.md
├── docs/
│   ├── README.md
│   └── <member>/<name>/{<name>-spec.md, <name>-plan.md, <name>-handoff.md}
├── .harness/
│   ├── active.json           # 활성 task 포인터 (gitignored)
│   └── backup.json           # 형제 백업 클론 폴더 경로 (commit 권장)
├── .claude/
│   ├── settings.json         # permissions + hooks (Bash(gemini:*), Bash(codex:*))
│   ├── hooks/
│   │   ├── protect-files.sh        # .env, node_modules 수정 차단
│   │   ├── auto-format.sh          # 저장 후 Prettier
│   │   └── pre-commit-check.sh     # 커밋 전 typecheck + test
│   ├── rules/                # 영역별 코딩 규칙 (navigation, state-mgmt, styling, testing)
│   └── skills/               # 슬래시 명령 (plan, handoff, verify, new-feature, fix-bug, review)
├── .cursor/rules/*.mdc       # .claude/rules에서 자동 미러링
└── .opencode/opencode.json   # .claude/skills를 참조 (drift 없음)
```

자동으로 `.gitignore`에 추가되는 항목:
- `.claude/settings.local.json` (개인 권한 오버라이드)
- `.harness/active.json` (개인 활성 task 상태)

---

## CLAUDE.md 섹션 마커

하네스는 HTML 주석 마커로 관리 영역을 구분합니다:

```markdown
<!-- harness:section="roles" begin -->
## AI 팀 역할 분담
...(apply 시 이 블록만 갱신)...
<!-- harness:section="roles" end -->

<!-- harness:user:begin -->
이 아래 사용자 내용은 harness가 절대 수정하지 않음.
<!-- harness:user:end -->
```

관리되는 섹션: `stack`, `roles`, `protocol`.
이 섹션들을 직접 수정해도 `/harness-apply` 재실행 시 템플릿으로 덮어쓰여집니다.
영구 커스터마이즈는 `<!-- harness:user -->` 블록 또는 마커 밖에 작성하세요.

---

## 문서 (HTML)

아키텍처·워크플로우를 시각적으로 확인할 수 있는 HTML 문서입니다.  
로컬 클론 후 브라우저에서 바로 열 수 있습니다.

| 문서 | 설명 |
|---|---|
| [harness-overview.html](docs/harness-overview.html) | 플러그인 전체 아키텍처 다이어그램 — 에이전트 연결, symlink 구조, 명령 흐름 |
| [harness-workflow-simulation.html](docs/harness-workflow-simulation.html) | task 워크플로우 시나리오 시뮬레이션 — new → done 흐름 단계별 인터랙티브 |

```bash
open docs/harness-overview.html
open docs/harness-workflow-simulation.html
```

---

## 개발 / 기여

```bash
git clone <this-repo>
cd harness-aijient-team-plugin

# 로컬 테스트
rm -rf /tmp/test && mkdir /tmp/test && cd /tmp/test
git init && git config user.name "test-user"
node /path/to/plugin/bin/harness-team.mjs init --yes
node /path/to/plugin/bin/harness-team.mjs task new feature demo
node /path/to/plugin/bin/harness-team.mjs doctor
```

### 저장소 레이아웃

```
harness-aijient-team-plugin/
├── .claude-plugin/
│   ├── plugin.json              # Claude Code 플러그인 메타 (버전 포함)
│   └── marketplace.json         # 마켓 등록 (버전 포함 — 범프 시 반드시 갱신)
├── bin/harness-team.mjs         # CLI 엔트리
├── commands/                    # 슬래시 명령 래퍼 (CLI 호출)
│   └── harness-{init,apply,sync,doctor,task,
│           clone,symlink,delete,migrate,upgrade}.md
├── src/
│   ├── backup-dir.mjs           # backup dir 탐색 (opts override + auto-detect)
│   ├── detect-stack.mjs         # 스택 탐지
│   ├── render.mjs               # 템플릿 치환
│   ├── merge.mjs                # 비파괴 섹션 병합 + JSON deep-merge
│   ├── symlink.mjs              # 크로스플랫폼 symlink
│   ├── member.mjs               # git config user.name 감지
│   ├── git-hooks.mjs            # post-commit hook 설치
│   ├── user-config.mjs          # username 영속 저장
│   ├── fsx.mjs, prompt.mjs      # 유틸
│   ├── harness.mjs              # init/apply 공통 오케스트레이션
│   └── commands/
│       ├── init.mjs, apply.mjs, sync.mjs, doctor.mjs, task.mjs
│       ├── backup.mjs           # backup dir 이동 + symlink 교체 (upgrade 내부용)
│       ├── clone.mjs            # project → backup 동기화
│       ├── symlink.mjs          # backup → project symlink
│       ├── delete.mjs           # symlink/실제파일 제거 (--include-real)
│       ├── migrate.mjs          # v0.2.x 스크립트 이전
│       └── upgrade.mjs          # v0.3.x → v0.4+ 원스텝 전환
├── tests/
│   ├── backup-dir.test.mjs
│   └── delete.test.mjs
└── templates/                   # 프로젝트에 복사되는 원본
    ├── CLAUDE.md.hbs
    ├── clone.sh, symlink.sh, delete.sh
    ├── .claude/{settings.json, hooks, rules, skills}
    ├── .opencode/opencode.json
    └── docs/README.md
```

### 버전 범프 체크리스트

버전을 올릴 때 반드시 **4개 파일** 모두 갱신하고, 로컬 캐시까지 동기화해야 합니다.

```bash
VERSION="0.x.0"

# 1. package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# 2. .claude-plugin/plugin.json  (플러그인 메타)
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" .claude-plugin/plugin.json

# 3. .claude-plugin/marketplace.json  ← 자주 누락! /plugin 목록에 표시되는 버전
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" .claude-plugin/marketplace.json

# 4. 커밋
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(plugin): plugin.json 버전 $VERSION + 신규 커맨드 추가"
git commit -m "chore(release): 버전 $VERSION으로 범프"  # 또는 한 커밋으로 합치기

# 5. 로컬 플러그인 캐시 동기화
CACHE=~/.claude/plugins/cache/harness-aijient-team-marketplace/harness-aijient-team/$VERSION
mkdir -p "$CACHE"
rsync -a \
  --exclude='.git' --exclude='.claude-plugin' --exclude='docs/superpowers' \
  --exclude='node_modules' --exclude='.harness' \
  ./ "$CACHE/"

# 6. marketplace 경로에도 반영
cp .claude-plugin/marketplace.json \
   ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace/.claude-plugin/marketplace.json
rsync -a \
  --exclude='.git' --exclude='.claude-plugin' --exclude='docs/superpowers' \
  --exclude='node_modules' --exclude='.harness' \
  ./ ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace/
```

**확인 포인트:**

| 파일 | 역할 | 누락 시 증상 |
|---|---|---|
| `package.json` | npm 버전 | `npm info`에서 구버전 |
| `.claude-plugin/plugin.json` | 플러그인 로드 메타 | 슬래시 명령 누락 가능 |
| `.claude-plugin/marketplace.json` | `/plugin` 목록 표시 버전 | **`/plugin`에서 구버전 표시** |
| 로컬 캐시 rsync | 실행 코드 반영 | 새 명령어가 실제 구버전 코드로 실행됨 |

> `/reload-plugins` 후에도 구버전이 보이면 `marketplace.json`의 `plugins[0].version` 확인.

### 요구사항

Node.js 18+. 외부 의존성 없음 (표준 라이브러리만).

---

## 변경 이력

### v0.6.2
- **fix**: `harness-doctor` — clone/symlink/delete.sh를 프로젝트 루트에서 점검 (init 직후 doctor가 실패하던 문제 해결)
- **fix**: `templates/.opencode/opencode.json` — 존재하지 않는 plan/handoff/review skill 참조 제거, fix-bug/new-feature/verify만 노출
- **docs**: README task 구조를 실제 구현(`docs/<member>/<name>/` 평탄 구조)에 맞춰 정정 — `feature/`·`fix/` 중간 카테고리 표기 제거, 명령 인터페이스(`/harness-task <name>`, `list`, `done`, `handoff`)로 통일

### v0.6.1
- **fix**: `harness-init` AI gitignore 옵션에서 `docs/` 제거 — 팀 공유 문서가 gitignore에 등록되던 버그 수정

### v0.6.0
- **feat**: task workflow flat path 구조 (`docs/<member>/<name>/`)
- **feat**: post-commit hook으로 handoff 자동 갱신
- **feat**: username 자동 감지 (`git config user.name` → `$USER`)
- **feat**: pre-0.6.0 → v0.6.0 task 구조 마이그레이션 지원

### v0.5.x
- **feat**: `harness-init` / `harness-apply` / `harness-migrate` — CLAUDE.md 마커 외부 커스텀 감지 시 AskUserQuestion 추가
- **feat**: `harness-doctor` — CLAUDE.md 미반영 진단 결과 표시

### v0.4.0
- **feat**: `harness-upgrade` — v0.3.x 실제 파일 → v0.4+ symlink 원스텝 전환

---

## 라이선스

MIT
