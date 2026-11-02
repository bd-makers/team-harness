# env-describe — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: lockfile 기반 bootstrap 명령과 Python pm을 stack 관리 절 `## 명령`에 (지시 하위 시스템, 2026-11-03 재분류)
- Current atomic step: 정정(bootstrap 줄 이동·표현 정정) 뒤 테스트 재확인 → 로컬 커밋
- Stop / human-decision condition: 커밋·푸시·PR은 사용자 지시로만

## Constraints and settled decisions
- 언어 지식은 프리셋 JSON만(D11). 게이트·pr-check·done 무변경. 환경 파일 생성 금지.
- `## 환경` 소제목은 폐기 — bootstrap은 `## 명령`의 install 아래 한 줄(환경 하위 시스템은 D12 정정 브랜치).
- `.env.*` 읽기 deny 유지(D12).

## JIT retrieval map
- Identifiers / symbols: detectStack, buildProfile, detectPackageManager, holds, stackPermissions, findStaleManagedSections
- Narrow globs: src/detect-stack.mjs, src/presets.mjs, templates/presets/*.json, templates/AGENTS.md.hbs
- Read next: tests/detect-stack.test.mjs, tests/agent-files.test.mjs
- Verification command: npm test

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan 단계 전부 완료 → 커밋 → PR → 머지 후 기본 브랜치에서 `done`
- D-A·D-B 결정 완료(2026-11-03): 런타임 버전은 다음 task, install 줄 유지 + bootstrap 줄 추가
