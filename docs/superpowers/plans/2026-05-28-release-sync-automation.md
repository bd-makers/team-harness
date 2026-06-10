---
tags:
  - project
  - ai
  - obsidian
created: 2026-05-28
modified: 2026-05-28
---

# Release Sync Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** harness-diagnostics 패턴을 차용해서 (1) 릴리즈 수동 동기화 실수를 차단하는 `scripts/release-sync.sh`, (2) 사람이 읽는 변경 이력 `CHANGELOG.md`, (3) 레포 운영 규칙 `AGENTS.md`를 도입한다. 0.6.x 시리즈에서 드러난 "수동 rsync + installed_plugins.json 직접 수정"이 보안 회귀(0.6.3 fix)로 이어지는 패턴을 차단한다.

**Architecture:** 세 매니페스트(`package.json` / `.claude-plugin/plugin.json` / `.claude-plugin/marketplace.json`)의 버전 일치를 검증하고, 일치한 버전 디렉토리를 `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`과 `~/.claude/plugins/marketplaces/<marketplace>/`로 rsync한 뒤, `installed_plugins.json`의 version/lastUpdated/gitCommitSha를 `jq`로 in-place 갱신한다. `AGENTS.md`는 이 절차를 명문화하고, `CHANGELOG.md`는 0.4.0부터의 변경을 git log로부터 복원한다.

**Tech Stack:** bash (POSIX), `jq`, `rsync`, `git`. 신규 런타임 의존성 없음.

**Non-goals:**
- Skill 형식 도입 (skills/ 디렉토리 활용) — 별도 plan
- `harness-doctor` 스크립트화 — 별도 plan
- 12원칙 평가 프레임워크 자체 도입 — 우리 plugin에는 over-engineering
- `.nvmrc` / pre-commit — 별도 plan

---

## File Structure

| 역할 | 변경 | 파일 |
|------|------|------|
| 릴리즈 동기화 오케스트레이터 | Create | `scripts/release-sync.sh` |
| 매니페스트 버전 일치 검증 (release-sync 내부 helper) | Create | `scripts/check-versions.sh` |
| 사람이 읽는 변경 이력 (0.4.0부터 복원) | Create | `CHANGELOG.md` |
| 레포 수정 에이전트용 운영 가이드 | Create | `AGENTS.md` |
| release-sync 단위 테스트 (dry-run 검증) | Create | `tests/release-sync.test.mjs` |
| `scripts/release-sync.sh` 안내 추가 | Modify | `README.md` |
| 버전 범프 0.6.4 → 0.6.5 | Modify | `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |

---

### Task 1: `scripts/check-versions.sh` — 매니페스트 버전 일치 검증

**Files:**
- Create: `scripts/check-versions.sh`

- [ ] **Step 1: 스크립트 작성**

세 매니페스트의 `version` 필드를 읽어 모두 같은지 확인. 다르면 어떤 파일이 어떤 값인지 출력하고 exit 1.

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG=$(jq -r '.version' "$ROOT/package.json")
PLG=$(jq -r '.version' "$ROOT/.claude-plugin/plugin.json")
MKT=$(jq -r '.plugins[0].version' "$ROOT/.claude-plugin/marketplace.json")
if [[ "$PKG" != "$PLG" || "$PLG" != "$MKT" ]]; then
  echo "ERROR: version mismatch" >&2
  echo "  package.json:      $PKG" >&2
  echo "  plugin.json:       $PLG" >&2
  echo "  marketplace.json:  $MKT" >&2
  exit 1
fi
echo "$PKG"
```

- [ ] **Step 2: marketplace.json의 plugin index 확인**

`jq -r '.plugins[0].version'` 경로가 실제 schema와 일치하는지 검증 — `jq '.plugins | length'`가 1인지 가드 추가.

- [ ] **Step 3: 수동 smoke test**

```bash
bash scripts/check-versions.sh  # → "0.6.4" 출력
```

세 파일 중 하나를 임시로 다르게 수정 → exit 1 + mismatch 메시지 확인 → 복원.

---

### Task 2: `scripts/release-sync.sh` — 캐시 + 마켓플레이스 + installed_plugins.json 일괄 동기화

**Files:**
- Create: `scripts/release-sync.sh`

- [ ] **Step 1: 인자 / 환경변수 계약 정의**

```bash
# Usage: scripts/release-sync.sh [--dry-run]
# Env: CLAUDE_PLUGINS_ROOT (default: $HOME/.claude/plugins)
```

dry-run 모드는 rsync `-n` + `installed_plugins.json` 변경을 stdout에만 출력.

- [ ] **Step 2: 동기화 단계 구현**

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRY_RUN=""
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN="--dry-run"

VERSION=$(bash "$ROOT/scripts/check-versions.sh")
PLUGINS_ROOT="${CLAUDE_PLUGINS_ROOT:-$HOME/.claude/plugins}"
MARKETPLACE="harness-aijient-team-marketplace"
PLUGIN="harness-aijient-team"
SHA=$(git -C "$ROOT" rev-parse HEAD)
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

CACHE="$PLUGINS_ROOT/cache/$MARKETPLACE/$PLUGIN/$VERSION"
MKT="$PLUGINS_ROOT/marketplaces/$MARKETPLACE"

# 1) cache 디렉토리 sync (버전별 디렉토리 생성)
mkdir -p "$CACHE"
rsync -a $DRY_RUN --delete \
  --exclude '.git' --exclude 'node_modules' --exclude 'tests' \
  --exclude 'docs/superpowers' --exclude 'scripts' \
  "$ROOT/" "$CACHE/"

# 2) marketplace 디렉토리 sync
rsync -a $DRY_RUN \
  "$ROOT/.claude-plugin/marketplace.json" "$MKT/marketplace.json"
rsync -a $DRY_RUN --delete \
  "$ROOT/commands/" "$MKT/commands/"

# 3) installed_plugins.json in-place 갱신
INSTALLED="$PLUGINS_ROOT/installed_plugins.json"
KEY="$PLUGIN@$MARKETPLACE"
if [[ -z "$DRY_RUN" ]]; then
  tmp=$(mktemp)
  jq --arg k "$KEY" --arg v "$VERSION" --arg s "$SHA" --arg t "$TS" --arg p "$CACHE" \
    '.version2[$k].version = $v
     | .version2[$k].installPath = $p
     | .version2[$k].lastUpdated = $t
     | .version2[$k].gitCommitSha = $s' \
    "$INSTALLED" > "$tmp" && mv "$tmp" "$INSTALLED"
else
  echo "[dry-run] would update $INSTALLED .version2[\"$KEY\"] -> $VERSION / $SHA"
fi

echo "✓ synced $PLUGIN@$VERSION"
```

- [ ] **Step 3: rsync exclude 목록 검증**

현재 캐시 디렉토리(`~/.claude/plugins/cache/harness-aijient-team-marketplace/harness-aijient-team/0.6.4/`)와 비교해서 어떤 파일이 들어있는지 확인하고 exclude 목록을 맞춤. `docs/superpowers/`, `scripts/`, `tests/`는 캐시에 불필요.

- [ ] **Step 4: dry-run smoke test**

```bash
bash scripts/release-sync.sh --dry-run
# rsync 변경 목록 + installed_plugins.json 갱신 예고만 출력
# 실제 파일 변경 없음 확인 (git status clean)
```

- [ ] **Step 5: 실제 run + 검증**

```bash
bash scripts/release-sync.sh
diff -r --brief "$ROOT/commands/" "$HOME/.claude/plugins/marketplaces/harness-aijient-team-marketplace/commands/"
# → 출력 없음
jq '.version2["harness-aijient-team@harness-aijient-team-marketplace"]' \
  "$HOME/.claude/plugins/installed_plugins.json"
# → 현재 VERSION / SHA / TS 확인
```

---

### Task 3: `tests/release-sync.test.mjs` — dry-run 무변경 검증

**Files:**
- Create: `tests/release-sync.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`node:test`로 다음 시나리오:

1. 임시 `CLAUDE_PLUGINS_ROOT`를 만들고 minimal `installed_plugins.json` seed
2. `release-sync.sh --dry-run` 실행 → seed 파일이 변경되지 않음을 byte-for-byte 확인
3. `release-sync.sh` (실제 실행) → version2 키의 version/gitCommitSha가 현재 매니페스트와 일치
4. 매니페스트 셋 중 하나를 임시 변조 → script exit code 1 + stderr에 mismatch 메시지

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;

test('--dry-run은 installed_plugins.json을 변경하지 않는다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-sync-'));
  try {
    const installed = join(root, 'installed_plugins.json');
    const seed = JSON.stringify({ version2: {} }, null, 2);
    await writeFile(installed, seed);
    const r = spawnSync('bash', [join(ROOT, 'scripts/release-sync.sh'), '--dry-run'],
      { env: { ...process.env, CLAUDE_PLUGINS_ROOT: root }, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(await readFile(installed, 'utf8'), seed);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 테스트 통과까지 스크립트 보완**

`CLAUDE_PLUGINS_ROOT` 환경변수 honoring이 누락되어 있으면 추가.

- [ ] **Step 3: 매니페스트 변조 케이스 추가**

git worktree로 isolated copy를 만들어 plugin.json만 패치 → exit 1 검증. 너무 무거우면 `check-versions.sh` 단독 테스트로 분리.

---

### Task 4: `CHANGELOG.md` — 0.4.0부터 복원

**Files:**
- Create: `CHANGELOG.md`

- [ ] **Step 1: git log로 버전별 변경 수집**

```bash
git log --oneline --no-merges $(git tag --sort=-v:refname | head -1)..HEAD
git log --oneline --no-merges  # 전체 — 버전 범프 커밋 기준으로 구간 분할
```

- [ ] **Step 2: Keep a Changelog 포맷으로 작성**

```markdown
# Changelog

본 문서는 [Keep a Changelog](https://keepachangelog.com/) 형식을 따른다.

## [Unreleased]

## [0.6.4] - 2026-05-XX
### Fixed
- CLI에 same_tree 가드 추가 — 다른 실파일 rm -rf 방지 (7de9514)

## [0.6.3] - 2026-05-XX
### Fixed
- 백업/실파일 보호 — rm -rf 제거 및 안전 가드 추가 (ec62139)

## [0.6.2] - ...
...
## [0.4.0] - 2026-04-27
### Added
- `delete --include-real` 플래그
- `symlink --backup-dir` fallback
- `upgrade` 원스텝 마이그레이션 명령
```

각 버전의 실제 날짜는 `git log -1 --format=%ai <sha>`로 확인.

- [ ] **Step 3: 향후 운영 규칙 명시**

Unreleased 섹션 유지 → 버전 범프 시 Unreleased를 새 버전 헤더 아래로 이동하는 흐름을 CHANGELOG 상단 주석에 명시.

---

### Task 5: `AGENTS.md` — 레포 운영 가이드

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: 작성**

harness-diagnostics의 `AGENTS.md` 구조 차용:
- 역할: 이 레포가 source of truth, `~/.claude/plugins/cache/...`는 배포 복사본
- 시작 순서: README.md → plugin.json → `npm test`
- 작업 규칙: 새 command 추가 시 `commands/`, `bin/harness-team.mjs`, `README.md` 동시 갱신
- 필수 검증: `npm test`, `bash scripts/check-versions.sh`, `bash scripts/release-sync.sh --dry-run`
- 릴리즈 절차 (단일 source):
  1. 변경 작성 + 테스트
  2. CHANGELOG.md Unreleased 항목 채움
  3. 세 매니페스트 버전 동시 범프
  4. `bash scripts/release-sync.sh` 실행
  5. `git commit -m "chore(release): 버전 X.Y.Z으로 범프"`
  6. `git tag vX.Y.Z`
  7. `git push --follow-tags`

- [ ] **Step 2: README.md에서 AGENTS.md로 링크**

README 상단 "이 레포를 수정하는 에이전트는 [AGENTS.md](./AGENTS.md)를 먼저 본다" 한 줄 추가.

---

### Task 6: README.md 업데이트 + 버전 범프 0.6.4 → 0.6.5

**Files:**
- Modify: `README.md`, `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

- [ ] **Step 1: README에 새 스크립트 안내 섹션 추가**

```markdown
## 릴리즈 동기화

```bash
bash scripts/check-versions.sh        # 매니페스트 버전 일치 검증
bash scripts/release-sync.sh --dry-run  # 변경 미리보기
bash scripts/release-sync.sh           # 실제 동기화
```
```

- [ ] **Step 2: 세 매니페스트 0.6.5로 동시 범프**

- [ ] **Step 3: CHANGELOG.md에 0.6.5 추가**

```markdown
## [0.6.5] - 2026-05-28
### Added
- `scripts/release-sync.sh` — 캐시/마켓플레이스/installed_plugins.json 일괄 동기화
- `scripts/check-versions.sh` — 매니페스트 버전 일치 검증
- `CHANGELOG.md`, `AGENTS.md` 신규
```

- [ ] **Step 4: 자기 자신을 신규 스크립트로 릴리즈 (도그푸딩)**

```bash
npm test
bash scripts/check-versions.sh           # → 0.6.5
bash scripts/release-sync.sh --dry-run   # 변경 검토
bash scripts/release-sync.sh             # 실제 동기화
```

- [ ] **Step 5: 커밋 + 태그 + push**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(release): release-sync 자동화 + AGENTS/CHANGELOG 도입

- scripts/release-sync.sh / check-versions.sh 추가로 수동 rsync 제거
- CHANGELOG.md 0.4.0부터 복원
- AGENTS.md 릴리즈 절차 명문화
- 버전 0.6.5 범프
EOF
)"
git tag v0.6.5
git push --follow-tags
```

---

## 완료 기준

- [ ] `npm test` 전체 통과 (release-sync 신규 테스트 포함)
- [ ] `bash scripts/release-sync.sh --dry-run` 무변경 확인
- [ ] `bash scripts/release-sync.sh` 1회 실행 후 `diff -r` 결과 비어있음
- [ ] `installed_plugins.json`의 version/gitCommitSha가 현재 HEAD와 일치
- [ ] CHANGELOG.md에 0.4.0~0.6.5 모든 버전 entry 존재
- [ ] AGENTS.md에서 안내한 절차만 따라도 새 릴리즈가 가능 (메모리 의존 0)
- [ ] 0.6.5 태그가 origin에 push됨

## 리스크 / 주의

- **`rsync --delete`로 사용자 로컬 캐시 손실**: 캐시는 plugin이 관리하는 영역이므로 OK. 단 `marketplaces/` 쪽은 `--delete` 없이 운영해서 marketplace.json 외 사용자 추가 파일 보존.
- **marketplace.json schema 가정**: `.plugins[0]`이 항상 우리 plugin이라는 가정 — Task 1 Step 2에서 length 가드.
- **installed_plugins.json 동시 수정 충돌**: Claude Code 실행 중 sync하면 race 가능. AGENTS.md에 "Claude Code 종료 후 실행" 권장 한 줄 추가.
- **dry-run으로도 mkdir이 일어남**: cache 디렉토리 생성은 idempotent하나 dry-run 의미에 어긋남 — `[[ -z "$DRY_RUN" ]] && mkdir -p` 가드.
