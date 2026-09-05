---
description: 4개 매니페스트(package.json/.claude-plugin/plugin.json/.claude-plugin/marketplace.json/.codex-plugin/plugin.json) 동시 bump + 캐시/마켓플레이스/installed_plugins.json 동기화. 휴먼 에러(manifest 누락·버전 불일치) 차단.
phase: Release
argument-hint: "[patch|minor|major|x.y.z] [--dry-run] [--skip-cache]"
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-08-07
---

이 명령은 릴리즈를 한 번에 처리한다: 4개 매니페스트 버전을 동시에 올리고,
플러그인 캐시·마켓플레이스 디렉토리·`installed_plugins.json`을 동기화한다.
bump/검증/복사 로직은 모두 CLI(`harness-team release`)가 소유한다 — 이 래퍼는 orchestrate만 한다.

## ⚠️ 안전 규칙

- **항상 `--dry-run`을 먼저** 실행해 계획을 검토한 뒤 실제 적용한다.
- **Claude Code가 실행 중일 때 실제 적용하지 않는다** — `installed_plugins.json`에 대한
  쓰기가 라이브 세션과 경쟁(race)할 수 있다. 가능하면 **Claude Code를 종료한 뒤** 실행한다.
- CLI는 top-level `installed_plugins.json`의 `version` 정수(파일 스키마 버전)를 **절대 건드리지 않는다**.
  플러그인 버전은 `plugins[key][].version`에만 기록된다.
- **부분 실패 복구**: 매니페스트는 bump됐는데 캐시/installed 동기화 전에 중단됐다면,
  **명시적 새 버전으로 재실행**(`harness-team release <x.y.z>`)해 resync한다 — 매니페스트가 이미
  새 버전이라 버전 일치 가드가 다시 patch/minor bump을 막기 때문이다.

## 실행 절차

1. **bump 종류를 확인한다** — `$ARGUMENTS`에 `patch|minor|major` 또는 명시적 `x.y.z`가 있으면 사용한다.
   없으면 기본값 `patch`.

2. **반드시 dry-run을 먼저 실행한다**:
   ```bash
   node bin/harness-team.mjs release $ARGUMENTS --dry-run
   ```
   - 이 명령은 **플러그인 소스 저장소에서만** 실행한다. 현재 체크아웃의 코드를 쓰도록 `node bin/harness-team.mjs`를
     부른다 — PATH의 전역 `harness-team`은 마켓플레이스 클론이라 낡았을 수 있다(`doctor`의 CLI drift 경고가
     바로 그 사고에서 나왔다).
   - `ⓘ release (dry-run): <old> → <new>` 와 변경 대상 목록, `next:` 힌트가 출력된다.
   - 어떤 파일도 변경되지 않는다. 출력된 계획(old→new, 캐시 경로, 마켓플레이스 경로)을 사용자에게 보여준다.

3. **버전 불일치/스키마 에러가 나오면 멈춘다**:
   - `✗ release:` 줄과 escalation 패킷 줄(`cause:`/`retry:`/`alternatives:`/`default:`/`stop:` — `alternatives:`는 대안이 있을 때만 나온다)을 사용자에게 그대로 전달한다.
   - 네 매니페스트의 `version`을 동일하게 맞추거나, `marketplace.json.plugins` 안에
     `plugin.json.name`과 같은 이름의 **자기 항목이 정확히 1개**가 되도록 고친 뒤 2번을 다시 실행한다.
     동반 플러그인 항목(외부 플러그인을 `source.sha`로 핀한 항목)은 버전 동기화 대상이 아니므로
     **지우지 말고 그대로 둔다** — MAINTAINING.md "동반 플러그인" 절 참조.

4. **계획이 올바르면 실제 적용한다** (`--dry-run` 제거):
   ```bash
   node bin/harness-team.mjs release $ARGUMENTS
   ```
   - 성공 시 `✓ release: <old> → <new>` 와 변경된 대상, `next:` git 커밋/태그/푸시 명령이 출력된다.

5. **커밋·태그 전에 MAINTAINING.md의 릴리스 절차 문서 단계를 먼저 끝낸다** — what-changes 페이지 생성·`docs/index.html`
   등재·overview 템플릿 배지·CHANGELOG의 `[Unreleased]` → 버전 헤딩 이동. `next:` 힌트는 bump 직후의 git 명령만
   보여주므로 이 단계를 알려주지 않는다. 건너뛴 채 태그를 push하면 release 워크플로우가 실패한다.

6. **변경 diff를 보여주고 next 명령을 안내한다**:
   ```bash
   git diff --stat
   ```
   출력된 `next:` 줄의 git commit/tag/push 명령을 사용자에게 제시한다 (사용자 확인 후 실행).

## 예시

```bash
# 1) 항상 먼저 — 변경 없이 계획만
node bin/harness-team.mjs release patch --dry-run

# 2) 검토 후 실제 적용
node bin/harness-team.mjs release patch

# 명시적 버전
node bin/harness-team.mjs release 1.0.0 --dry-run

# 캐시/마켓플레이스/installed 동기화 없이 매니페스트만 (디버그용)
node bin/harness-team.mjs release minor --skip-cache
```
