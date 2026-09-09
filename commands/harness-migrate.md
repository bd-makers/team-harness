---
description: 구버전 구조를 최신으로 마이그레이션 + 설치된 훅·스킬·규칙을 최신 템플릿으로 refresh — init은 기존 파일을 건너뛰므로 템플릿 수정이 도달하는 유일한 경로
phase: Migration
argument-hint: [--yes] [--target <dir>]
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-09-10
---

이 명령은 두 가지를 한다.

1. **구조 마이그레이션** — backup dir 스크립트 → project root, task 구조(pre-0.6→0.6,
   0.6→0.7 artifact.md 분리), task 인덱스 라벨(active → open), SessionStart·boundary 훅 배선.
2. **템플릿 refresh** — 설치된 `.claude/hooks`(6) · `.claude/skills`(3) · `.claude/rules`(4)를
   최신 템플릿으로 갱신한다. `init`은 이미 있는 파일을 건너뛰므로(`skipExisting`), **수정된
   템플릿이 기존 설치에 도달하는 경로는 이것뿐이다**(새로 추가된 파일은 `init`으로도 도달한다).

refresh는 설치본의 바이트가 **하네스가 실제로 배포한 적 있는 버전**(sha256 테이블)과 일치할 때만
갱신한다. 사용자가 편집한 파일은 "customized"로 보고 **절대 덮지 않고** 경고만 남긴다.
`docs/` seed(`README.md`·`decisions.md`)는 설치 후 팀 저작물이라 refresh 대상이 아니다.
낡은 설치본이 있으면 `harness-team doctor`가 경고로 알려 준다 — 근거는 `docs/decisions.md` D8.

**배선은 자기가 책임질 수 있는 것만 한다.** SessionStart 병합 대상은 `harness-team session-context`
항목뿐이다 — migrate는 **설치하지 않는 훅을 배선하지 않는다**. 예전에는 템플릿의 SessionStart 그룹을
통째로 병합해 `observe-tools.mjs`까지 배선했는데, refresh는 없는 파일을 설치하지 않으므로
(`installed === null → continue` — 사용자가 일부러 지운 훅을 되살리지 않기 위한 규칙)
`init`을 이어 돌리기 전까지 settings가 없는 파일을 가리켰다. `observe-tools`는 `init`이 설치하며 배선한다.
migrate의 정의는 "**구조를 최신으로 옮긴다**"이지 "설치를 템플릿과 동일하게 만든다"가 아니다.

**관리 절 원본 백업.** `.harness/render-state.json`이 없는 설치본(= 이 기능 이전의 모든 설치)에서는
다음 `init`이 관리 절을 한 번 교체한다. migrate는 원본과 템플릿 렌더 결과를 동시에 볼 수 있는 유일한
지점이므로, 그 1회를 복구 가능·가시로 만든다 — 관리 절이 렌더 결과와 다르면 원본 파일을
`.harness/backup/managed-sections-<YYYYMMDD-HHmmss>/`에 **누적 백업**하고 diff를 경고로 출력한다.
이후 실행부터는 `init`이 자동으로 보존한다.

**사전 확인 — 기존 CLAUDE.md 커스텀 내용**

현재 디렉토리에 `CLAUDE.md`가 있으면 내용을 읽고, 하네스 마커(`<!-- harness:section -->`, `<!-- harness:user -->`) 외부에 커스텀 내용이 있는지 확인하세요.

커스텀 내용이 있다면 `AskUserQuestion` 툴로 다음을 물어보세요:

> 현재 CLAUDE.md에 하네스 마커 외부의 내용이 있습니다.
> 이 내용을 하네스의 `<!-- harness:user -->` 섹션으로 이전할까요?
>
> **예** — migrate 완료 후 해당 내용을 `<!-- harness:user:begin -->` 블록에 추가합니다
> **아니오** — 건너뜁니다

**예** 선택 시: migrate 실행 완료 후, 기존 커스텀 내용을 `CLAUDE.md`의 `<!-- harness:user:begin -->` ~ `<!-- harness:user:end -->` 사이에 추가합니다.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" migrate $ARGUMENTS
```
