---
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-06-02
---

# MAINTAINING.md — harness-aijient-team 운영 가이드

이 레포를 수정하는 에이전트·메인테이너를 위한 실무 참조서입니다.

---

## 진실의 원천 (Source of Truth)

이 레포(`harness-aijient-team-plugin/`)가 **단일 진실의 원천(SSOT)**입니다.

- `~/.claude/plugins/cache/harness-aijient-team/` — 배포 캐시 복사본
- `~/.claude/plugins/marketplaces/.../harness-aijient-team/` — 마켓플레이스 배포 복사본

위 두 경로는 릴리스 도구가 생성하는 **배포 결과물**입니다. **절대 직접 편집하지 마세요.** 수동 편집은 다음 릴리스에서 덮어씌워집니다.

---

## 시작 순서 (Orientation)

새로운 에이전트·메인테이너가 이 레포를 파악하는 순서:

1. `README.md` — 플러그인 개요, 명령어 레퍼런스, 설치 방법
2. `.claude-plugin/plugin.json` — 슬래시 커맨드 목록 및 메타데이터
3. `node --test tests/` — 현재 테스트 스위트 통과 여부 확인

---

## 작업 규칙

새 커맨드를 추가할 때 **반드시 아래 네 파일을 함께 수정**하세요:

| 파일 | 역할 |
|---|---|
| `commands/<name>.md` | 슬래시 커맨드 정의 (프롬프트) |
| `bin/harness-team.mjs` | CLI 서브커맨드 등록 |
| `.claude-plugin/plugin.json` | 플러그인 커맨드 목록 |
| `README.md` | 명령어 레퍼런스 섹션 |

네 파일 중 하나라도 누락되면 커맨드가 일부 컨텍스트에서 인식되지 않습니다.

---

## 필수 검증

릴리스 전에 아래 두 명령이 반드시 통과해야 합니다:

```bash
node --test tests/
harness-team release --dry-run
```

---

## 릴리스 절차

> **주의:** `harness-team release`는 `installed_plugins.json`을 직접 수정합니다. Claude Code가 실행 중이면 경쟁 조건이 발생할 수 있으니, **가급적 Claude Code 종료 후** 실행하세요. 중단 시 복구는 명시적 버전으로 재실행하면 됩니다: `harness-team release X.Y.Z`.

1. 변경 작성 + `node --test tests/` 통과 확인
2. `CHANGELOG.md`의 `## [Unreleased]` 항목 채우기
3. `harness-team release <minor|patch|major> --dry-run` 으로 결과 미리 확인
4. `harness-team release <minor|patch|major>` 실행
   - 3개 매니페스트(`package.json`, `.claude-plugin/plugin.json`, `marketplace.json`) 버전 일괄 bump
   - 캐시·마켓플레이스·`installed_plugins.json` 자동 동기화
5. `CHANGELOG.md`의 `## [Unreleased]`를 새 버전 헤딩(`## [X.Y.Z] - YYYY-MM-DD`)으로 이동
6. 커밋 및 태그:
   ```bash
   git commit -m "chore(release): 버전 X.Y.Z으로 범프"
   git tag vX.Y.Z && git push --follow-tags
   ```

---

## 참고

- 테스트: `tests/` 디렉토리, Node.js 내장 `node:test` 사용
- 외부 의존성 없음 — Node.js 18+ 표준 라이브러리만 사용
- 커밋 메시지는 한국어 + Conventional Commits 형식 (`feat/fix/chore/docs/refactor`)
