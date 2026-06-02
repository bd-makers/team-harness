---
description: 3개 매니페스트(package.json/plugin.json/marketplace.json) 동시 bump + 캐시/마켓플레이스/installed_plugins.json 동기화. 휴먼 에러(marketplace.json 누락·버전 불일치) 차단.
argument-hint: "[patch|minor|major|x.y.z] [--dry-run] [--skip-cache]"
---

이 명령은 릴리즈를 한 번에 처리한다: 3개 매니페스트 버전을 동시에 올리고,
플러그인 캐시·마켓플레이스 디렉토리·`installed_plugins.json`을 동기화한다.
bump/검증/복사 로직은 모두 CLI(`harness-team release`)가 소유한다 — 이 래퍼는 orchestrate만 한다.

## ⚠️ 안전 규칙

- **항상 `--dry-run`을 먼저** 실행해 계획을 검토한 뒤 실제 적용한다.
- **Claude Code가 실행 중일 때 실제 적용하지 않는다** — `installed_plugins.json`에 대한
  쓰기가 라이브 세션과 경쟁(race)할 수 있다. 가능하면 **Claude Code를 종료한 뒤** 실행한다.
- CLI는 top-level `installed_plugins.json`의 `version` 정수(파일 스키마 버전)를 **절대 건드리지 않는다**.
  플러그인 버전은 `plugins[key][].version`에만 기록된다.

## 실행 절차

1. **bump 종류를 확인한다** — `$ARGUMENTS`에 `patch|minor|major` 또는 명시적 `x.y.z`가 있으면 사용한다.
   없으면 기본값 `patch`.

2. **반드시 dry-run을 먼저 실행한다**:
   ```bash
   harness-team release $ARGUMENTS --dry-run
   ```
   - `ⓘ release (dry-run): <old> → <new>` 와 변경 대상 목록, `next:` 힌트가 출력된다.
   - 어떤 파일도 변경되지 않는다. 출력된 계획(old→new, 캐시 경로, 마켓플레이스 경로)을 사용자에게 보여준다.

3. **버전 불일치/스키마 에러가 나오면 멈춘다**:
   - `✗ release:` 줄과 `cause:`/`retry:`/`stop:` 힌트를 사용자에게 그대로 전달한다.
   - 세 파일의 `version`을 동일하게 맞추거나 `marketplace.json.plugins[0].name`을
     `plugin.json.name`과 일치시킨 뒤 2번을 다시 실행한다.

4. **계획이 올바르면 실제 적용한다** (`--dry-run` 제거):
   ```bash
   harness-team release $ARGUMENTS
   ```
   - 성공 시 `✓ release: <old> → <new>` 와 변경된 대상, `next:` git 커밋/태그/푸시 명령이 출력된다.

5. **변경 diff를 보여주고 next 명령을 안내한다**:
   ```bash
   git diff --stat
   ```
   출력된 `next:` 줄의 git commit/tag/push 명령을 사용자에게 제시한다 (사용자 확인 후 실행).

## 예시

```bash
# 1) 항상 먼저 — 변경 없이 계획만
harness-team release patch --dry-run

# 2) 검토 후 실제 적용
harness-team release patch

# 명시적 버전
harness-team release 1.0.0 --dry-run

# 캐시/마켓플레이스/installed 동기화 없이 매니페스트만 (디버그용)
harness-team release minor --skip-cache
```
