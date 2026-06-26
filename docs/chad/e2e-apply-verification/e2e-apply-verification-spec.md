# e2e-apply-verification — Spec

## 목적 / 요구사항
팀 하네스가 "실제로 적용했을 때 살아있는가"를 자동으로 증명하는 in-repo E2E 검증을 추가한다.
기존 단위 테스트(`tests/*.test.mjs`, src 함수 직접 호출)가 다루지 못하는 **실제 바이너리 적용 →
워크플로우 → 멀티에이전트 SSOT 일관성**을 ephemeral sandbox에 대해 검증한다.

대상 스택 매트릭스 3종 — **bare node / Next.js / React Native(Expo)** — 모두에 대해 동일 검증을 돌린다.

검증 레이어:
- **L1 apply 스모크** — fresh sandbox 생성 → `harness-team apply` → 기대 산출물 전부 존재 + `doctor` exit 0 (green)
- **L2 라이프사이클** — sandbox에서 `task <name>` → 4종 SSOT 파일 생성 확인 → git commit → **post-commit 훅이 handoff 갱신** → `done` → artifact/active.json 정리
- **L3 멀티에이전트 SSOT 일관성** — `AGENTS.md`가 실파일 SSOT(`harness:section` 마커)이고 `CLAUDE.md`/`GEMINI.md`가 `@AGENTS.md` import(복제 아님), `.cursor/rules/*.mdc`·`.opencode/opencode.json`가 같은 코어 가리킴

명시적 비범위: L4 라이브 Claude 세션(SessionStart 훅 주입·슬래시·스킬 트리거)은 자동화 불가 → 이번 task에서 제외.

## 설계 / 접근
- 위치: 이 레포 `tests/e2e/`. 커밋·CI 대상. sandbox 대상 프로젝트는 **커밋하지 않고 매 실행 생성**(drift 방지).
- 실행 방식: 기존 단위 테스트와 달리 **실제 `bin/harness-team.mjs`를 child_process로 spawn** (arg 파싱·바이너리 경로까지 고fidelity 검증).
- sandbox 생성기: `tests/e2e/sandbox.mjs` — `mkdtemp` + `git init` + 스택별 시그니처 파일(package.json deps / lock) 작성 + 임시 bin 디렉터리에 `harness-team` 심링크 → PATH 주입(진짜 post-commit 훅이 진짜 git commit에서 동작하도록).
- 매트릭스: `STACKS = [bare-node, next, react-native]`. 각 스택마다 L1·L2·L3을 `node:test`로 실행.
- `--yes --member tester --no-backup` 비대화 모드로 apply. detect-stack이 스택을 맞게 인식하는지도 단언.

## Ontology
- **sandbox**: 매 테스트 실행마다 `mkdtemp`로 만드는 일회용 대상 프로젝트(빈 git 레포 + 스택 시그니처). apply의 입력.
- **스택 시그니처**: detect-stack이 스택을 식별하는 최소 파일 세트(예: next → `package.json`에 `next` dep, RN → `react-native` dep). fixture가 아니라 generator가 즉석 생성.
- **SSOT 일관성**: AGENTS.md가 단일 소스이고 다른 에이전트 파일이 복제 대신 import로 그것을 가리키는 상태.
- **고fidelity**: src 함수 직접 호출이 아니라 실제 CLI 바이너리 spawn — 사용자가 실제로 치는 경로 그대로.

Ambiguity 게이트 통과 근거: 목표(E2E 3레이어×3스택)·제약(in-repo, ephemeral, bin spawn)·성공기준(doctor green + 산출물/훅/SSOT 단언)·기존코드(tests/, bin, src/detect-stack) 모두 식별됨.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — L1~L3 자동 E2E를 3스택 매트릭스로 추가
- [x] **Constraint 명확도** (30%) — in-repo `tests/e2e/`, ephemeral sandbox, 실제 bin spawn, L4 제외
- [x] **Success 기준** (30%) — 각 스택에서 doctor exit 0 + 산출물 전수 존재 + post-commit handoff 갱신 + SSOT import 단언 통과
- [x] **Context 명확도** (brownfield 한정) — 영향 파일: 신규 `tests/e2e/*`, `package.json` test 스크립트. apply 산출물 인벤토리 확보됨
- [x] **Ambiguity ≤ 0.2** — 가중합 ≥ 0.8

## 참고
- 인벤토리: init/apply 산출물·detect-stack·git-hooks·doctor·task 라이프사이클 (Explore 매핑 완료)
- 기존 테스트 컨벤션: `node:test` + `mkdtemp` (단위는 함수 직접 호출, E2E는 bin spawn으로 차별화)
